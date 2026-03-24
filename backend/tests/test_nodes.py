from unittest.mock import MagicMock, patch

import pytest

from agent.nodes import (
    GeminiRateLimitError,
    node1_identify,
    node2_fetch,
    node3_synthesize,
    node_error,
)
from agent.state import AgentState

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

SAMPLE_BRAZIL = {
    "name": {"common": "Brazil", "official": "Federative Republic of Brazil"},
    "population": 213421037,
    "capital": ["Brasília"],
    "currencies": {"BRL": {"name": "Brazilian real", "symbol": "R$"}},
    "languages": {"por": "Portuguese"},
    "flags": {
        "png": "https://flagcdn.com/w320/br.png",
        "svg": "https://flagcdn.com/br.svg",
        "alt": "The flag of Brazil has a green field with a large yellow rhombus.",
    },
}

SAMPLE_MEXICO = {
    "name": {"common": "Mexico", "official": "United Mexican States"},
    "population": 128932753,
    "capital": ["Mexico City"],
    "flags": {"png": "https://flagcdn.com/w320/mx.png", "svg": "", "alt": ""},
}


def _base_state(**kwargs) -> AgentState:
    defaults: AgentState = {
        "user_question": "What is the capital of France?",
        "country_names": [],
        "is_valid_query": False,
        "api_raw_responses": None,
        "api_error": None,
        "final_answer": None,
        "error_message": None,
    }
    defaults.update(kwargs)
    return defaults


# ---------------------------------------------------------------------------
# Node 1 — Country name extraction
# ---------------------------------------------------------------------------

@patch("agent.nodes._get_llm_fast")
def test_node1_single_country(mock_get_llm):
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content='{"country_names": ["France"], "is_valid": true}'
    )
    result = node1_identify(_base_state())
    assert result["country_names"] == ["France"]
    assert result["is_valid_query"] is True


@patch("agent.nodes._get_llm_fast")
def test_node1_multiple_countries(mock_get_llm):
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content='{"country_names": ["Brazil", "Mexico"], "is_valid": true}'
    )
    result = node1_identify(_base_state(user_question="Compare Brazil and Mexico"))
    assert result["country_names"] == ["Brazil", "Mexico"]
    assert result["is_valid_query"] is True


@patch("agent.nodes._get_llm_fast")
def test_node1_invalid_question(mock_get_llm):
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content='{"country_names": [], "is_valid": false}'
    )
    result = node1_identify(_base_state(user_question="What is 2 + 2?"))
    assert result["is_valid_query"] is False
    assert result["country_names"] == []


@patch("agent.nodes._get_llm_fast")
def test_node1_strips_markdown_fences(mock_get_llm):
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content='```json\n{"country_names": ["Japan"], "is_valid": true}\n```'
    )
    result = node1_identify(_base_state(user_question="Tell me about Japan"))
    assert result["country_names"] == ["Japan"]
    assert result["is_valid_query"] is True


@patch("agent.nodes._get_llm_fast")
def test_node1_handles_list_content_blocks(mock_get_llm):
    """Newer LangChain versions return content as a list of dicts."""
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content=[{"type": "text", "text": '{"country_names": ["Germany"], "is_valid": true}'}]
    )
    result = node1_identify(_base_state(user_question="Tell me about Germany"))
    assert result["country_names"] == ["Germany"]
    assert result["is_valid_query"] is True


@patch("agent.nodes._get_llm_fast")
def test_node1_sanitises_country_names_with_special_chars(mock_get_llm):
    """Country names containing injection chars must be dropped by sanitise_country_names."""
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content='{"country_names": ["France<script>", "Germany"], "is_valid": true}'
    )
    result = node1_identify(_base_state())
    assert "France<script>" not in result["country_names"]
    assert "Germany" in result["country_names"]


@patch("agent.nodes._get_llm_fast")
def test_node1_sanitises_overly_long_country_names(mock_get_llm):
    long_name = "A" * 101
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content=f'{{"country_names": ["{long_name}", "Japan"], "is_valid": true}}'
    )
    result = node1_identify(_base_state())
    assert long_name not in result["country_names"]
    assert "Japan" in result["country_names"]


@patch("agent.nodes._get_llm_fast")
def test_node1_raises_rate_limit_error_on_429(mock_get_llm):
    mock_get_llm.return_value.invoke.side_effect = Exception(
        "429 RESOURCE_EXHAUSTED: quota exceeded"
    )
    with pytest.raises(GeminiRateLimitError):
        node1_identify(_base_state())


@patch("agent.nodes._get_llm_fast")
def test_node1_returns_invalid_on_non_rate_limit_error(mock_get_llm):
    """Non-429 exceptions should return is_valid_query=False, not raise."""
    mock_get_llm.return_value.invoke.side_effect = ValueError("unexpected format")
    result = node1_identify(_base_state())
    assert result["is_valid_query"] is False
    assert result["country_names"] == []


@patch("agent.nodes._get_llm_fast")
def test_node1_uses_fast_model_not_full_model(mock_fast, monkeypatch):
    """Node 1 must use _get_llm_fast, not _get_llm."""
    mock_full = MagicMock()
    monkeypatch.setattr("agent.nodes._get_llm", mock_full)
    mock_fast.return_value.invoke.return_value = MagicMock(
        content='{"country_names": ["Japan"], "is_valid": true}'
    )
    node1_identify(_base_state())
    mock_fast.assert_called_once()
    mock_full.assert_not_called()


# ---------------------------------------------------------------------------
# Node 2 — Multi-country API fetch
# ---------------------------------------------------------------------------

@patch("agent.nodes.fetch_multiple_countries")
def test_node2_single_country_success(mock_fetch):
    mock_fetch.return_value = ([SAMPLE_BRAZIL], [])
    result = node2_fetch(_base_state(country_names=["Brazil"]))
    assert result["api_raw_responses"] == [SAMPLE_BRAZIL]
    assert result["api_error"] is None


@patch("agent.nodes.fetch_multiple_countries")
def test_node2_multi_country_success(mock_fetch):
    mock_fetch.return_value = ([SAMPLE_BRAZIL, SAMPLE_MEXICO], [])
    result = node2_fetch(_base_state(country_names=["Brazil", "Mexico"]))
    assert len(result["api_raw_responses"]) == 2
    assert result["api_error"] is None


@patch("agent.nodes.fetch_multiple_countries")
def test_node2_all_failed(mock_fetch):
    mock_fetch.return_value = ([], ["Country 'Wakanda' was not found."])
    result = node2_fetch(_base_state(country_names=["Wakanda"]))
    assert result["api_raw_responses"] is None
    assert "Wakanda" in result["api_error"]


@patch("agent.nodes.fetch_multiple_countries")
def test_node2_partial_failure_still_returns_data(mock_fetch):
    mock_fetch.return_value = ([SAMPLE_BRAZIL], ["Country 'Wakanda' was not found."])
    result = node2_fetch(_base_state(country_names=["Brazil", "Wakanda"]))
    assert len(result["api_raw_responses"]) == 1
    assert result["api_error"] is not None


# ---------------------------------------------------------------------------
# Node 3 — Answer synthesis
# ---------------------------------------------------------------------------

@patch("agent.nodes._get_llm")
def test_node3_synthesizes_answer(mock_get_llm):
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content="The capital of Brazil is Brasília."
    )
    state = _base_state(
        user_question="What is the capital of Brazil?",
        country_names=["Brazil"],
        api_raw_responses=[SAMPLE_BRAZIL],
    )
    result = node3_synthesize(state)
    assert "Brasília" in result["final_answer"]
    assert result["error_message"] is None


@patch("agent.nodes._get_llm")
def test_node3_comparison_query(mock_get_llm):
    mock_get_llm.return_value.invoke.return_value = MagicMock(
        content="Brazil has a population of 213M; Mexico has 129M."
    )
    state = _base_state(
        user_question="Compare the population of Brazil and Mexico",
        country_names=["Brazil", "Mexico"],
        api_raw_responses=[SAMPLE_BRAZIL, SAMPLE_MEXICO],
    )
    result = node3_synthesize(state)
    assert result["final_answer"] is not None
    assert result["error_message"] is None


def test_node3_returns_error_message_when_no_api_data():
    state = _base_state(
        country_names=["Wakanda"],
        api_raw_responses=None,
        api_error="Country 'Wakanda' was not found.",
    )
    result = node3_synthesize(state)
    assert "Wakanda" in result["final_answer"]
    assert result["error_message"] is None


@patch("agent.nodes._get_llm")
def test_node3_raises_rate_limit_error_on_429(mock_get_llm):
    mock_get_llm.return_value.invoke.side_effect = Exception(
        "RESOURCE_EXHAUSTED: quota exceeded"
    )
    state = _base_state(
        user_question="What is the capital of Brazil?",
        country_names=["Brazil"],
        api_raw_responses=[SAMPLE_BRAZIL],
    )
    with pytest.raises(GeminiRateLimitError):
        node3_synthesize(state)


@patch("agent.nodes._get_llm")
def test_node3_returns_error_message_on_non_rate_limit_failure(mock_get_llm):
    """Non-429 exceptions should degrade gracefully, not raise."""
    mock_get_llm.return_value.invoke.side_effect = ConnectionError("network error")
    state = _base_state(
        user_question="What is the capital of Brazil?",
        country_names=["Brazil"],
        api_raw_responses=[SAMPLE_BRAZIL],
    )
    result = node3_synthesize(state)
    assert result["final_answer"] is None
    assert result["error_message"] is not None


@patch("agent.nodes._get_llm")
def test_node3_includes_partial_error_note_when_some_countries_failed(mock_get_llm):
    """Partial fetch errors should be noted in the prompt sent to Gemini."""
    captured_content = {}

    def capture_invoke(messages):
        captured_content["user"] = messages[-1].content
        return MagicMock(content="Brazil's capital is Brasília.")

    mock_get_llm.return_value.invoke.side_effect = capture_invoke

    state = _base_state(
        user_question="Tell me about Brazil and Wakanda",
        country_names=["Brazil", "Wakanda"],
        api_raw_responses=[SAMPLE_BRAZIL],
        api_error="Country 'Wakanda' was not found.",
    )
    node3_synthesize(state)
    assert "Wakanda" in captured_content["user"]


# ---------------------------------------------------------------------------
# Error node
# ---------------------------------------------------------------------------

def test_node_error_returns_guidance_message():
    result = node_error(_base_state())
    assert result["error_message"] is not None
    assert result["final_answer"] is None


def test_node_error_message_contains_example():
    result = node_error(_base_state())
    msg = result["error_message"].lower()
    assert "capital" in msg or "population" in msg or "japan" in msg
