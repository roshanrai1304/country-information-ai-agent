import time
import httpx

BASE_URL = "https://restcountries.com/v3.1"
TIMEOUT_SECONDS = 5.0
MAX_RETRIES = 1
CACHE_TTL_SECONDS = 3600  # Country data changes rarely — cache for 1 hour

# Comprehensive field set — covers everything useful without the 50-language
# "translations" object that adds ~3 KB of noise per country.
FETCH_FIELDS = ",".join([
    "name", "cca2", "cca3", "capital", "region", "subregion",
    "population", "area", "currencies", "languages", "idd",
    "flags", "flag", "timezones", "continents", "borders",
    "unMember", "landlocked", "independent", "latlng",
    "demonyms", "car", "maps", "tld", "altSpellings",
])

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------

# { normalised_name: (data_dict, fetched_at_timestamp) }
_country_cache: dict[str, tuple[dict, float]] = {}


def _cache_key(name: str) -> str:
    return name.lower().strip()


def _get_cached(name: str) -> dict | None:
    key = _cache_key(name)
    if key in _country_cache:
        data, fetched_at = _country_cache[key]
        if time.time() - fetched_at < CACHE_TTL_SECONDS:
            return data
        del _country_cache[key]   # expired — evict
    return None


def _put_cache(name: str, data: dict) -> None:
    _country_cache[_cache_key(name)] = (data, time.time())


def clear_country_cache() -> None:
    """Clear the in-memory cache. Used in tests to prevent state bleed."""
    _country_cache.clear()


# ---------------------------------------------------------------------------
# Core fetch helpers
# ---------------------------------------------------------------------------

class CountryAPIError(Exception):
    pass


def _pick_best_match(results: list[dict], query: str) -> dict:
    """Select the most relevant entry from a partial-name search result list.

    The API fuzzy-matches against translations in every language, so a search
    for 'India' can return Taiwan or China (they have 'ind' as an Indonesian
    translation key). We pick by:
      1. Exact match on name.common  (case-insensitive)
      2. Exact match on name.official (case-insensitive)
      3. First result (API's own ranking)
    """
    q = query.lower().strip()

    for r in results:
        if r.get("name", {}).get("common", "").lower() == q:
            return r

    for r in results:
        if r.get("name", {}).get("official", "").lower() == q:
            return r

    return results[0]


def _do_fetch(url: str, params: dict) -> list[dict] | None:
    """Execute the HTTP request with retry on timeout. Returns None on 404."""
    attempts = 0
    while attempts <= MAX_RETRIES:
        try:
            with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
                response = client.get(url, params=params)

            if response.status_code == 404:
                return None

            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else [data]

        except httpx.TimeoutException:
            attempts += 1
            if attempts > MAX_RETRIES:
                raise CountryAPIError(
                    "The REST Countries API request timed out. Please try again later."
                )
        except httpx.HTTPStatusError as e:
            raise CountryAPIError(
                f"REST Countries API returned an unexpected error "
                f"(HTTP {e.response.status_code})."
            )
        except httpx.RequestError as e:
            raise CountryAPIError(
                f"A network error occurred while reaching the REST Countries API: {e}"
            )


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def fetch_country_data(country_name: str) -> dict:
    """
    Fetch comprehensive data for a single country.

    Results are cached in memory for CACHE_TTL_SECONDS (1 hour) so repeated
    queries for the same country within a server session make zero HTTP calls.

    Lookup strategy (to avoid the REST Countries API fuzzy-translation bug):
      1. fullText=true  — exact match on name.common / name.official only
      2. Partial match  — pick best result by name.common similarity

    Raises CountryAPIError if the country cannot be found or the API fails.
    """
    cached = _get_cached(country_name)
    if cached is not None:
        return cached

    url = f"{BASE_URL}/name/{country_name}"
    base_params = {"fields": FETCH_FIELDS}

    # Stage 1: exact match
    results = _do_fetch(url, {**base_params, "fullText": "true"})
    if results:
        data = results[0]
        _put_cache(country_name, data)
        return data

    # Stage 2: partial match + best-result selection
    results = _do_fetch(url, base_params)
    if results:
        data = _pick_best_match(results, country_name)
        _put_cache(country_name, data)
        return data

    raise CountryAPIError(
        f"Country '{country_name}' was not found. "
        "Please check the spelling and try again."
    )


def fetch_multiple_countries(country_names: list[str]) -> tuple[list[dict], list[str]]:
    """
    Fetch data for multiple countries.

    Returns:
        (responses, errors) — responses for successful lookups,
        errors for countries that could not be found.
    """
    responses: list[dict] = []
    errors: list[str] = []

    for name in country_names:
        try:
            responses.append(fetch_country_data(name))
        except CountryAPIError as e:
            errors.append(str(e))

    return responses, errors
