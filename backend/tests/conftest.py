import os
import sys

import pytest

# Ensure the backend/ directory is on the Python path so absolute imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set a dummy API key so langchain_google_genai doesn't raise on import
os.environ.setdefault("GOOGLE_API_KEY", "test-key")


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the country cache before every test to prevent state bleed."""
    from services.countries_api import clear_country_cache
    clear_country_cache()
    yield
    clear_country_cache()
