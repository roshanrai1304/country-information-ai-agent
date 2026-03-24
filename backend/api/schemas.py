from typing import Optional
from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="A natural language question about one or more countries.",
        examples=["What is the capital and population of Brazil?",
                  "Compare the area of Brazil and Mexico."],
    )


class FlagInfo(BaseModel):
    country: str = Field(description="Common country name.")
    png: str = Field(description="PNG flag image URL.")
    alt: str = Field(default="", description="Text description of the flag.")


class AskResponse(BaseModel):
    answer: str = Field(description="Natural language answer to the question.")
    countries: list[str] = Field(
        default_factory=list,
        description="All countries identified and queried.",
    )
    flags: list[FlagInfo] = Field(
        default_factory=list,
        description="Flag image URLs for each country in the response.",
    )
    source: Optional[str] = Field(
        default=None, description="Data source used to answer the question."
    )
