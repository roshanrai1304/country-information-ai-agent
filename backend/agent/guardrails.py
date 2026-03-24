"""
Prompt injection guard rails.

Applied at two layers:
  1. User input — before the question reaches the LLM.
  2. LLM output (Node 1) — country names extracted by Gemini are validated
     before being used in further API calls or prompts.
"""

import re

# ---------------------------------------------------------------------------
# Layer 1 — User input sanitisation
# ---------------------------------------------------------------------------

# Patterns that are characteristic of prompt injection attempts.
# Checked case-insensitively against the raw user question.
_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above|your)\s+instructions?", re.I),
    re.compile(r"forget\s+(all\s+)?(previous|prior|above|your)\s+instructions?", re.I),
    re.compile(r"disregard\s+(all\s+)?(previous|prior|above|your)?\s*(instructions?|rules?|constraints?)", re.I),
    re.compile(r"override\s+(all\s+)?(previous|prior|your)?\s*(instructions?|rules?|guidelines?)", re.I),
    re.compile(r"bypass\s+(all\s+)?(previous|prior|your)?\s*(instructions?|rules?|safety)", re.I),
    re.compile(r"\bact\s+as\b.{0,30}\b(ai|assistant|bot|llm|model)\b", re.I),
    re.compile(r"\bpretend\s+(to\s+be|you\s+(are|have))\b", re.I),
    re.compile(r"\byou\s+are\s+now\b", re.I),
    re.compile(r"\bnew\s+(role|persona|instructions?|system\s+prompt)\b", re.I),
    re.compile(r"\b(reveal|print|output|show|return|repeat)\b.{0,20}\b(system\s+)?(prompt|instructions?)\b", re.I),
    re.compile(r"\bsystem\s*:", re.I),
    re.compile(r"<\s*system\s*>", re.I),
    re.compile(r"\[system\]", re.I),
    re.compile(r"\bjailbreak\b", re.I),
    re.compile(r"\bDAN\b"),                        # "Do Anything Now" jailbreak
    re.compile(r"\bdo\s+anything\s+now\b", re.I),
    re.compile(r"\btoken\s+limit\b", re.I),
    re.compile(r"\bprompt\s+injection\b", re.I),
]

# Maximum allowed length for a user question (also enforced by Pydantic, but
# we check here too so the guard rail is independent of the schema layer).
MAX_QUESTION_LENGTH = 500


def is_injection_attempt(question: str) -> bool:
    """Return True if the question looks like a prompt injection attempt."""
    if len(question) > MAX_QUESTION_LENGTH:
        return True
    for pattern in _INJECTION_PATTERNS:
        if pattern.search(question):
            return True
    return False


# ---------------------------------------------------------------------------
# Layer 2 — LLM output validation (Node 1 country names)
# ---------------------------------------------------------------------------

# A legitimate country name will not contain these characters.
_INVALID_NAME_CHARS = re.compile(r'[<>{}\[\]|\\;`"\n\r]')

# Reasonable upper bound for a country name in characters.
MAX_COUNTRY_NAME_LENGTH = 100


def sanitise_country_names(names: list) -> list[str]:
    """
    Validate and clean country names extracted by Node 1.

    - Ensures each entry is a non-empty string.
    - Rejects names containing characters that are never in a country name
      (guards against injected content from a malicious question).
    - Rejects names that are suspiciously long.
    - Strips leading/trailing whitespace.

    Returns only the names that pass all checks.
    """
    clean: list[str] = []
    for name in names:
        if not isinstance(name, str):
            continue
        name = name.strip()
        if not name:
            continue
        if len(name) > MAX_COUNTRY_NAME_LENGTH:
            continue
        if _INVALID_NAME_CHARS.search(name):
            continue
        clean.append(name)
    return clean
