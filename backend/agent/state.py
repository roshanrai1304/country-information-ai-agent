from typing import Optional
from typing_extensions import TypedDict


class AgentState(TypedDict):
    user_question: str
    country_names: list[str]                  # supports multi-country queries
    is_valid_query: bool
    api_raw_responses: Optional[list[dict]]   # one dict per country fetched
    api_error: Optional[str]
    final_answer: Optional[str]
    error_message: Optional[str]
