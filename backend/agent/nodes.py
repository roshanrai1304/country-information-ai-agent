import json
import logging
import os

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from agent.guardrails import sanitise_country_names
from agent.prompts import INTENT_SYSTEM_PROMPT, SYNTHESIS_SYSTEM_PROMPT
from agent.state import AgentState
from services.countries_api import CountryAPIError, fetch_multiple_countries

logger = logging.getLogger(__name__)


class GeminiRateLimitError(Exception):
    """Raised when the Gemini API returns a 429 RESOURCE_EXHAUSTED response."""


def _get_llm() -> ChatGoogleGenerativeAI:
    """Full model — used for Node 3 (answer synthesis)."""
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    return ChatGoogleGenerativeAI(model=model, temperature=0)


def _get_llm_fast() -> ChatGoogleGenerativeAI:
    """Lightweight model — used for Node 1 (country name extraction).

    Flash has a significantly higher free-tier quota than Pro and is more
    than capable of the simple JSON extraction task in Node 1.
    Override via GEMINI_MODEL_FAST env var.
    """
    model = os.getenv("GEMINI_MODEL_FAST", "gemini-1.5-flash")
    return ChatGoogleGenerativeAI(model=model, temperature=0)


# Fields that add tokens without helping Gemini compose a text answer.
# Stripped from the API payload before it is sent to Node 3.
_LLM_STRIP_FIELDS = {"altSpellings", "maps", "flag", "latlng", "cca2"}


def _trim_for_llm(country: dict) -> dict:
    """Remove high-noise, low-value fields from a country dict before it is
    included in the Gemini prompt. Reduces token count by ~40-50%.

    - altSpellings: alternate name array — never needed for answers
    - maps: Google/OSM URL strings — only URLs, not useful text
    - flag: emoji character — we do not use emojis in answers
    - latlng: [lat, lng] coordinates — rarely asked for
    - cca2: 2-letter ISO code — cca3 is sufficient
    - flags.png / flags.svg: image URLs — only flags.alt (text) is useful
    - demonyms.fra: French demonym — English-only answers never need it
    """
    trimmed = {k: v for k, v in country.items() if k not in _LLM_STRIP_FIELDS}

    # Keep only the text description of the flag, not image URLs
    if "flags" in trimmed:
        trimmed["flags"] = {"alt": trimmed["flags"].get("alt", "")}

    # Keep only the English demonym
    if "demonyms" in trimmed:
        eng = trimmed["demonyms"].get("eng", {})
        trimmed["demonyms"] = {"eng": eng} if eng else {}

    return trimmed


def _extract_text(content) -> str:
    """Normalise LLM response content to a plain string.

    Newer langchain-google-genai versions return content as a list of
    blocks rather than a bare string. This helper handles both forms.
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                parts.append(block.get("text", ""))
        return "".join(parts)
    return str(content)


def _is_rate_limit_error(exc: Exception) -> bool:
    """Return True if the exception is a Gemini 429 / RESOURCE_EXHAUSTED error."""
    msg = str(exc)
    return "RESOURCE_EXHAUSTED" in msg or "429" in msg


def node1_identify(state: AgentState) -> dict:
    """Node 1: Use Gemini Flash to extract country name(s) from the user question."""
    llm = _get_llm_fast()

    messages = [
        SystemMessage(content=INTENT_SYSTEM_PROMPT),
        HumanMessage(content=state["user_question"]),
    ]

    try:
        response = llm.invoke(messages)
        content = _extract_text(response.content).strip()

        # Strip markdown code fences if the model wraps its output
        if content.startswith("```"):
            lines = content.splitlines()
            content = "\n".join(
                line for line in lines if not line.startswith("```")
            ).strip()

        parsed = json.loads(content)
        country_names = sanitise_country_names(parsed.get("country_names", []))
        is_valid = bool(parsed.get("is_valid", False)) and len(country_names) > 0

        return {
            "country_names": country_names,
            "is_valid_query": is_valid,
        }

    except Exception as e:
        if _is_rate_limit_error(e):
            logger.warning("Node 1: Gemini rate limit hit: %s", e)
            raise GeminiRateLimitError(str(e)) from e

        logger.error("Node 1 failed to parse Gemini response: %s", e)
        return {
            "country_names": [],
            "is_valid_query": False,
        }


def node2_fetch(state: AgentState) -> dict:
    """Node 2: Fetch full data for every country identified in Node 1."""
    responses, errors = fetch_multiple_countries(state["country_names"])

    if not responses:
        return {
            "api_raw_responses": None,
            "api_error": " | ".join(errors),
        }

    api_error = " | ".join(errors) if errors else None
    return {
        "api_raw_responses": responses,
        "api_error": api_error,
    }


def node3_synthesize(state: AgentState) -> dict:
    """Node 3: Use Gemini to compose a natural language answer from raw API data."""
    if not state.get("api_raw_responses"):
        return {
            "final_answer": (
                f"I could not retrieve data for: {', '.join(state['country_names'])}. "
                f"{state.get('api_error', '')}"
            ),
            "error_message": None,
        }

    llm = _get_llm()

    # Trim noisy fields and use compact JSON to minimise token usage
    trimmed = [_trim_for_llm(r) for r in state["api_raw_responses"]]
    country_data_block = json.dumps(trimmed, separators=(",", ":"))

    partial_error_note = ""
    if state.get("api_error"):
        partial_error_note = (
            f"\nNote: Some countries could not be fetched: {state['api_error']}\n"
        )

    user_content = (
        f"Question: {state['user_question']}\n"
        f"{partial_error_note}"
        f"Country data from API:\n{country_data_block}"
    )

    messages = [
        SystemMessage(content=SYNTHESIS_SYSTEM_PROMPT),
        HumanMessage(content=user_content),
    ]

    try:
        response = llm.invoke(messages)
        return {"final_answer": _extract_text(response.content).strip(), "error_message": None}
    except Exception as e:
        if _is_rate_limit_error(e):
            logger.warning("Node 3: Gemini rate limit hit: %s", e)
            raise GeminiRateLimitError(str(e)) from e

        logger.error("Node 3 Gemini synthesis failed: %s", e)
        return {
            "final_answer": None,
            "error_message": "An error occurred while generating the answer. Please try again.",
        }


def node_error(state: AgentState) -> dict:
    """Error / clarification path for invalid or unrecognised queries."""
    return {
        "final_answer": None,
        "error_message": (
            "I could not identify any country in your question. "
            "Please try something like 'What is the capital of Japan?' or "
            "'Compare the population of Brazil and Mexico.'"
        ),
    }
