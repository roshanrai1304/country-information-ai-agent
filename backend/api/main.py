import logging
import os
import time
import uuid

from dotenv import load_dotenv
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

from agent.graph import agent
from agent.guardrails import is_injection_attempt
from agent.nodes import GeminiRateLimitError
from agent.state import AgentState
from api.schemas import AskRequest, AskResponse

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": %(message)s}',
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Country Information AI Agent",
    description="Answers natural language questions about countries using live data.",
    version="1.0.0",
)

_raw_origins = os.getenv("CORS_ORIGINS", "*")
allowed_origins = (
    ["*"]
    if _raw_origins.strip() == "*"
    else [o.strip() for o in _raw_origins.split(",") if o.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Meta"])
def health():
    return {"status": "ok"}


@app.post("/ask", response_model=AskResponse, tags=["Agent"])
async def ask(body: AskRequest, request: Request):
    request_id = str(uuid.uuid4())
    start = time.monotonic()

    logger.info(
        '{"request_id": "%s", "event": "request_received", "question": %s}',
        request_id,
        body.question,
    )

    # Guard rail — reject prompt injection attempts before touching the LLM
    if is_injection_attempt(body.question):
        logger.warning(
            '{"request_id": "%s", "event": "injection_attempt_blocked"}',
            request_id,
        )
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "answer": "Your question could not be processed. Please ask a country-related question.",
                "countries": [],
                "flags": [],
                "source": None,
            },
        )

    initial_state: AgentState = {
        "user_question": body.question,
        "country_names": [],
        "is_valid_query": False,
        "api_raw_responses": None,
        "api_error": None,
        "final_answer": None,
        "error_message": None,
    }

    try:
        result = agent.invoke(initial_state)
    except GeminiRateLimitError:
        logger.warning(
            '{"request_id": "%s", "event": "rate_limit_hit"}',
            request_id,
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "answer": (
                    "The AI service has reached its request limit. "
                    "Please wait a moment and try again."
                ),
                "countries": [],
                "source": None,
            },
        )
    except Exception as e:
        logger.error(
            '{"request_id": "%s", "event": "agent_error", "error": "%s"}',
            request_id,
            str(e),
        )
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "answer": "The AI service is temporarily unavailable. Please try again.",
                "countries": [],
                "source": None,
            },
        )

    answer = result.get("final_answer") or result.get(
        "error_message",
        "Something went wrong. Please try again.",
    )
    countries = result.get("country_names", [])
    raw_responses = result.get("api_raw_responses") or []
    source = "restcountries.com" if raw_responses else None

    # Only include flag images when the user explicitly asked about the flag
    from api.schemas import FlagInfo
    flag_keywords = {"flag", "flags", "emblem", "banner"}
    asked_about_flag = bool(flag_keywords & set(body.question.lower().split()))
    flags = []
    if asked_about_flag:
        for r in raw_responses:
            flag_data = r.get("flags", {})
            png = flag_data.get("png", "")
            if png:
                flags.append(FlagInfo(
                    country=r.get("name", {}).get("common", ""),
                    png=png,
                    alt=flag_data.get("alt", ""),
                ))

    latency_ms = int((time.monotonic() - start) * 1000)
    logger.info(
        '{"request_id": "%s", "event": "request_completed", "countries": %s, "latency_ms": %d}',
        request_id,
        countries,
        latency_ms,
    )

    return AskResponse(
        answer=answer,
        countries=countries,
        flags=flags,
        source=source,
    )
