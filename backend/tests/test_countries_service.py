import pytest
import respx
import httpx

from services.countries_api import (
    fetch_country_data,
    fetch_multiple_countries,
    clear_country_cache,
    CountryAPIError,
    _pick_best_match,
)
from agent.nodes import _trim_for_llm

INDIA = {
    "name": {"common": "India", "official": "Republic of India"},
    "population": 1417492000,
    "cca3": "IND",
    "capital": ["New Delhi"],
}

CHINA = {
    "name": {"common": "China", "official": "People's Republic of China"},
    "population": 1408280000,
    "cca3": "CHN",
    "capital": ["Beijing"],
}

TAIWAN = {
    "name": {"common": "Taiwan", "official": "Republic of China (Taiwan)"},
    "population": 23317031,
    "cca3": "TWN",
}

BRAZIL = {
    "name": {"common": "Brazil", "official": "Federative Republic of Brazil"},
    "population": 213421037,
    "cca3": "BRA",
    "capital": ["Brasília"],
}

UK = {
    "name": {"common": "United Kingdom", "official": "United Kingdom of Great Britain and Northern Ireland"},
    "population": 67215293,
    "cca3": "GBR",
}


# ---------------------------------------------------------------------------
# _pick_best_match
# ---------------------------------------------------------------------------

def test_pick_best_match_exact_common_name():
    results = [TAIWAN, CHINA, INDIA]
    assert _pick_best_match(results, "India")["cca3"] == "IND"


def test_pick_best_match_case_insensitive():
    results = [TAIWAN, CHINA, INDIA]
    assert _pick_best_match(results, "india")["cca3"] == "IND"


def test_pick_best_match_falls_back_to_first():
    results = [BRAZIL, TAIWAN]
    assert _pick_best_match(results, "unknown")["cca3"] == "BRA"


# ---------------------------------------------------------------------------
# fetch_country_data — exact match (fullText=true) succeeds
# ---------------------------------------------------------------------------

@respx.mock
def test_fetch_uses_full_text_first():
    """Exact search should be attempted before partial search."""
    exact_route = respx.get("https://restcountries.com/v3.1/name/India").mock(
        return_value=httpx.Response(200, json=[INDIA])
    )
    fetch_country_data("India")
    # The first call must include fullText=true
    first_call_url = str(exact_route.calls[0].request.url)
    assert "fullText=true" in first_call_url


@respx.mock
def test_fetch_exact_match_returns_correct_country():
    respx.get("https://restcountries.com/v3.1/name/India").mock(
        return_value=httpx.Response(200, json=[INDIA])
    )
    result = fetch_country_data("India")
    assert result["cca3"] == "IND"
    assert result["population"] == 1417492000


# ---------------------------------------------------------------------------
# fetch_country_data — exact miss → partial fallback with best-match selection
# ---------------------------------------------------------------------------

@respx.mock
def test_fetch_falls_back_to_partial_when_exact_404():
    """On exact 404, partial search is used and best match is selected."""
    route = respx.get("https://restcountries.com/v3.1/name/UK").mock(
        side_effect=[
            httpx.Response(404),           # fullText=true → not found
            httpx.Response(200, json=[UK]), # partial → found
        ]
    )
    result = fetch_country_data("UK")
    assert result["cca3"] == "GBR"
    assert route.call_count == 2


@respx.mock
def test_fetch_partial_picks_correct_country_from_ambiguous_results():
    """When partial search returns multiple results, pick by name.common."""
    ambiguous = [TAIWAN, CHINA, INDIA]  # what /name/india returns without fullText
    route = respx.get("https://restcountries.com/v3.1/name/India").mock(
        side_effect=[
            httpx.Response(404),                         # fullText → miss
            httpx.Response(200, json=ambiguous),         # partial → ambiguous
        ]
    )
    result = fetch_country_data("India")
    assert result["cca3"] == "IND"


# ---------------------------------------------------------------------------
# fetch_country_data — both stages fail
# ---------------------------------------------------------------------------

@respx.mock
def test_fetch_raises_when_both_stages_404():
    respx.get("https://restcountries.com/v3.1/name/Wakanda").mock(
        return_value=httpx.Response(404)
    )
    with pytest.raises(CountryAPIError, match="not found"):
        fetch_country_data("Wakanda")


@respx.mock
def test_fetch_timeout_raises():
    respx.get("https://restcountries.com/v3.1/name/India").mock(
        side_effect=httpx.TimeoutException("timeout")
    )
    with pytest.raises(CountryAPIError, match="timed out"):
        fetch_country_data("India")


@respx.mock
def test_fetch_server_error_raises():
    respx.get("https://restcountries.com/v3.1/name/India").mock(
        return_value=httpx.Response(500)
    )
    with pytest.raises(CountryAPIError, match="unexpected error"):
        fetch_country_data("India")


# ---------------------------------------------------------------------------
# fetch_multiple_countries
# ---------------------------------------------------------------------------

@respx.mock
def test_fetch_multiple_both_succeed():
    respx.get("https://restcountries.com/v3.1/name/India").mock(
        return_value=httpx.Response(200, json=[INDIA])
    )
    respx.get("https://restcountries.com/v3.1/name/China").mock(
        return_value=httpx.Response(200, json=[CHINA])
    )
    responses, errors = fetch_multiple_countries(["India", "China"])
    assert len(responses) == 2
    assert errors == []
    assert responses[0]["cca3"] == "IND"
    assert responses[1]["cca3"] == "CHN"


@respx.mock
def test_fetch_multiple_partial_failure():
    respx.get("https://restcountries.com/v3.1/name/Brazil").mock(
        return_value=httpx.Response(200, json=[BRAZIL])
    )
    respx.get("https://restcountries.com/v3.1/name/Wakanda").mock(
        return_value=httpx.Response(404)
    )
    responses, errors = fetch_multiple_countries(["Brazil", "Wakanda"])
    assert len(responses) == 1
    assert len(errors) == 1
    assert "Wakanda" in errors[0]


# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------

@respx.mock
def test_cache_second_call_skips_http():
    """Second fetch for the same country must not make an HTTP request."""
    route = respx.get("https://restcountries.com/v3.1/name/Japan").mock(
        return_value=httpx.Response(200, json=[INDIA])  # data doesn't matter here
    )
    fetch_country_data("Japan")
    fetch_country_data("Japan")
    # Only one HTTP call despite two fetches
    assert route.call_count == 1


@respx.mock
def test_cache_is_case_insensitive():
    """'japan' and 'Japan' should resolve to the same cache entry."""
    route = respx.get("https://restcountries.com/v3.1/name/japan").mock(
        return_value=httpx.Response(200, json=[INDIA])
    )
    fetch_country_data("japan")
    fetch_country_data("japan")
    assert route.call_count == 1


def test_clear_cache_removes_entries():
    """clear_country_cache() should empty the cache."""
    from services.countries_api import _country_cache, _cache_key
    # Manually seed the cache
    _country_cache[_cache_key("TestCountry")] = ({"name": "test"}, 9999999999)
    assert _cache_key("testcountry") in _country_cache
    clear_country_cache()
    assert len(_country_cache) == 0


# ---------------------------------------------------------------------------
# _trim_for_llm (token optimisation)
# ---------------------------------------------------------------------------

def test_trim_removes_noisy_fields():
    country = {
        "name": {"common": "Brazil"},
        "population": 213421037,
        "altSpellings": ["BR", "Brasil"],   # should be removed
        "maps": {"googleMaps": "https://..."}, # should be removed
        "flag": "🇧🇷",                          # should be removed
        "latlng": [-10.0, -55.0],             # should be removed
        "cca2": "BR",                          # should be removed
        "cca3": "BRA",                         # should be kept
    }
    trimmed = _trim_for_llm(country)
    assert "altSpellings" not in trimmed
    assert "maps" not in trimmed
    assert "flag" not in trimmed
    assert "latlng" not in trimmed
    assert "cca2" not in trimmed
    assert "cca3" in trimmed
    assert "population" in trimmed


def test_trim_keeps_only_flags_alt():
    country = {
        "flags": {
            "png": "https://flagcdn.com/w320/br.png",
            "svg": "https://flagcdn.com/br.svg",
            "alt": "The flag of Brazil has a green field.",
        }
    }
    trimmed = _trim_for_llm(country)
    assert trimmed["flags"] == {"alt": "The flag of Brazil has a green field."}
    assert "png" not in trimmed["flags"]
    assert "svg" not in trimmed["flags"]


def test_trim_keeps_only_english_demonym():
    country = {
        "demonyms": {
            "eng": {"f": "Brazilian", "m": "Brazilian"},
            "fra": {"f": "Brésilienne", "m": "Brésilien"},
        }
    }
    trimmed = _trim_for_llm(country)
    assert "fra" not in trimmed["demonyms"]
    assert trimmed["demonyms"]["eng"]["m"] == "Brazilian"


def test_trim_handles_missing_optional_fields():
    """Countries that are missing optional fields should not cause errors."""
    country = {"name": {"common": "Nowhere"}, "population": 0}
    trimmed = _trim_for_llm(country)
    assert trimmed["name"]["common"] == "Nowhere"
