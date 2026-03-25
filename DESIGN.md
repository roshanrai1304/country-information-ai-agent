# Country Information AI Agent — Design Document

---

## 1. Project Overview

This project is an AI-powered chat agent that answers natural language questions about countries (population, currency, capital, language, borders, timezones, flags, etc.) using live public data from the REST Countries API. The agent is built with LangGraph to enforce a structured, multi-step reasoning pipeline. The LLM powering the agent is Google Gemini. The backend is implemented in Python (FastAPI) and serves a Next.js chat frontend.

---

## 2. Goals and Non-Goals

### Goals
- Answer single and multi-country questions in natural language.
- Support comparison queries (e.g. "Compare the population of India and China").
- Ground every answer exclusively in live REST Countries API data — no model memory.
- Handle invalid, ambiguous, casual, or informal inputs gracefully.
- Expose a clean REST API consumed by a chat-style frontend.
- Surface actionable error messages for quota limits, missing countries, and service outages.

### Non-Goals
- No authentication or authorisation.
- No persistent database or caching layer.
- No embeddings or RAG.
- No multi-turn conversation memory (each question is independent).
- No support for questions unrelated to countries.

---

## 3. Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │         Frontend (Next.js 14 / React / TypeScript)      │   │
│   │   - Chat UI (message thread, typing indicator)          │   │
│   │   - Auto-expanding text input pinned at bottom          │   │
│   │   - Session history via sessionStorage                  │   │
│   │   - ApiError class for structured error surfacing       │   │
│   └─────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP POST /ask (REST / JSON)
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                         BACKEND LAYER                           │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │          FastAPI Application  (Python)                  │   │
│   │                                                         │   │
│   │   POST /ask    — main question endpoint                 │   │
│   │   GET  /health — liveness probe                         │   │
│   │   GET  /docs   — auto-generated OpenAPI docs            │   │
│   └─────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│   ┌─────────────────────────▼───────────────────────────────┐   │
│   │              LangGraph Agent (core logic)               │   │
│   │                                                         │   │
│   │   Node 1: Country Name Extraction (Gemini)              │   │
│   │   Node 2: Multi-Country API Fetch (REST Countries)      │   │
│   │   Node 3: Answer Synthesis (Gemini)                     │   │
│   └─────────────────────────┬───────────────────────────────┘   │
│                             │                                   │
│   ┌─────────────────────────▼───────────────────────────────┐   │
│   │              Google Gemini (LLM)                        │   │
│   │   - Configurable model via GEMINI_MODEL env var         │   │
│   │   - Used in Node 1 (extraction) and Node 3 (synthesis)  │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│               EXTERNAL DATA SOURCE                              │
│                                                                 │
│   REST Countries API  —  restcountries.com/v3.1/name/{country}  │
│   (no auth, public, JSON)                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **Frontend** | Chat UI, message thread, session history, structured error display |
| **FastAPI** | HTTP endpoints, Pydantic validation, agent orchestration, error classification |
| **LangGraph Agent** | Three-node pipeline; state management across nodes |
| **Google Gemini** | Extracts country names (Node 1) and synthesises final answer (Node 3) |
| **REST Countries API** | Single source of truth for all country data |

---

## 4. Agent Flow (LangGraph Pipeline)

The agent uses an MCP-style tool-calling approach: Node 1 extracts which countries are mentioned, Node 2 fetches full data for all of them, Node 3 lets Gemini decide what is relevant to the user's question.

```
   ┌──────────┐
   │  START   │
   └────┬─────┘
        │  user_question (string)
        ▼
┌──────────────────────────────────────┐
│  NODE 1: Country Name Extraction     │
│                                      │
│  Input : raw user question           │
│  LLM   : Gemini                      │
│  Output: {                           │
│    country_names: list[str],         │
│    is_valid: bool                    │
│  }                                   │
│                                      │
│  - Handles casual / informal phrasing│
│  - Normalises names (uk → United     │
│    Kingdom, usa → United States)     │
│  - Supports multi-country queries    │
└──────────────┬───────────────────────┘
               │
         ┌─────▼─────────────────────┐
         │  is_valid == false?        │
         │  or country_names empty?   │
         └─────┬─────────────────────┘
               │ YES                      NO
               ▼                          ▼
   ┌───────────────────┐    ┌──────────────────────────────────┐
   │  NODE: Error /    │    │  NODE 2: Multi-Country Fetch     │
   │  Clarification    │    │                                  │
   │                   │    │  For each country_name:          │
   │  Returns guidance │    │  1. Try fullText=true (exact)    │
   │  message          │    │  2. Fall back to partial match   │
   └─────────┬─────────┘    │     + best-result selection      │
             │              │  Output: list of full API dicts  │
             │              │  Handles: 404, timeout, network  │
             │              └──────────────┬───────────────────┘
             │                             │
             │                             ▼
             │              ┌──────────────────────────────────┐
             │              │  NODE 3: Answer Synthesis        │
             │              │                                  │
             │              │  Input : question + all API data │
             │              │  LLM   : Gemini                  │
             │              │  Rules :                         │
             │              │  - Answer ONLY what was asked    │
             │              │  - Use only data from API        │
             │              │  - No emojis                     │
             │              │  - State if data unavailable     │
             └──────────────┴──────────────────────────────────┘
                                           │
                                           ▼
                                      ┌─────────┐
                                      │   END   │
                                      └─────────┘
```

### Agent State Schema

```
AgentState {
  user_question        : str
  country_names        : list[str]        # supports multiple countries
  is_valid_query       : bool
  api_raw_responses    : list[dict] | None  # one dict per country
  api_error            : str | None
  final_answer         : str | None
  error_message        : str | None
}
```

### Node Details

#### Node 1 — Country Name Extraction
- Calls Gemini with a permissive prompt focused solely on finding country names.
- Handles casual phrasing: `"whats the currency in japan"`, `"can you get me flag for india"`.
- Normalises abbreviations and native names to common English (`uk` → `United Kingdom`, `deutschland` → `Germany`).
- Extracts multiple countries for comparison queries.
- Raises `GeminiRateLimitError` if Gemini returns 429 RESOURCE_EXHAUSTED.
- Pure LLM reasoning — no external API calls.

#### Node 2 — Multi-Country Fetch
**Two-stage lookup** to avoid the REST Countries API's fuzzy translation matching (which causes `"india"` to return Taiwan, Hong Kong, etc.):

1. **Stage 1 — Exact match**: `GET /v3.1/name/{name}?fullText=true` — matches `name.common` and `name.official` only.
2. **Stage 2 — Partial match fallback**: `GET /v3.1/name/{name}` with `_pick_best_match()` — selects by `name.common` → `name.official` → first result.

Fetches a comprehensive fixed field set for every country (no per-request field filtering):
```
name, cca2, cca3, capital, region, subregion, population, area,
currencies, languages, idd, flags, flag, timezones, continents,
borders, unMember, landlocked, independent, latlng, demonyms,
car, maps, tld, altSpellings
```
The `translations` field (50+ languages, ~3 KB noise) is intentionally excluded.

Handles partial failures: if one country in a multi-country query fails, the others still return.

#### Node 3 — Answer Synthesis
- Receives the full raw API payload for all countries + the original question.
- Gemini decides which fields are relevant — no pre-filtering.
- Prompt enforces: answer only what was asked, no emojis, no invented data, no extra fields volunteered.
- Raises `GeminiRateLimitError` if Gemini returns 429.
- Explicitly tells Gemini how to decode nested structures (`currencies`, `languages`, `idd`, `flags`, etc.).

---

## 5. API Contract (Backend)

### POST /ask

**Request**
```json
{
  "question": "Compare the population of India and China"
}
```
- `question`: 1–500 characters, required.

**Response — success**
```json
{
  "answer": "India has a population of 1,417,492,000 and China has 1,408,280,000.",
  "countries": ["India", "China"],
  "source": "restcountries.com"
}
```

**Response — invalid query (HTTP 200)**
```json
{
  "answer": "I could not identify any country in your question. Please try something like 'What is the capital of Japan?'",
  "countries": [],
  "source": null
}
```

**Response — country not found (HTTP 200)**
```json
{
  "answer": "I could not retrieve data for: Wakanda. Country 'Wakanda' was not found.",
  "countries": ["Wakanda"],
  "source": null
}
```

**Response — Gemini rate limit (HTTP 429)**
```json
{
  "answer": "The AI service has reached its request limit. Please wait a moment and try again.",
  "countries": [],
  "source": null
}
```

**Response — service unavailable (HTTP 502)**
```json
{
  "answer": "The AI service is temporarily unavailable. Please try again.",
  "countries": [],
  "source": null
}
```

**Response — malformed request (HTTP 422)**
Pydantic validation error — returned before the agent is invoked.

### GET /health
Returns `{ "status": "ok" }` — used by load balancers and uptime monitors.

---

## 6. Error Handling Strategy

| Error Type | Detection | HTTP Status | User Message |
|---|---|---|---|
| Unrecognised question | Node 1: `is_valid=false` | 200 | Guidance to rephrase |
| Country not found | Node 2: REST API 404 | 200 | Country not found message |
| REST Countries API down | Node 2: 5xx / timeout | 200 | Degraded service message |
| Gemini rate limit (429) | `GeminiRateLimitError` | **429** | Rate limit message with retry hint |
| Gemini service failure | Uncaught exception | **502** | Generic service unavailable |
| Malformed request | Pydantic validation | **422** | Validation error detail |

The frontend's `ApiError` class reads the `answer` field from non-200 response bodies, so the backend's specific message is always displayed in the chat — regardless of HTTP status code.

---

## 7. Frontend

### Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS with custom colours (`navy: #1B2E6B`, `surface: #EDEDE9`)
- **HTTP Client**: Native `fetch` with `ApiError` wrapper
- **Package Manager**: npm

### Chat Interface
The UI is a full-page chat — no separate landing, processing, or result pages.

```
┌──────────────────────────────────────────────┐
│ Sidebar  │ TopNav (Query | History | About)  │
│          ├──────────────────────────────────  │
│          │  Message thread (scrollable)       │
│          │                                    │
│          │          [Empty state /            │
│          │           example prompts]         │
│          │                                    │
│          │    [User message]           →      │
│          │    ← [Typing indicator ···]        │
│          │    ← [Assistant answer]            │
│          │                                    │
│          ├────────────────────────────────── │
│          │  [Input textarea]     [Send ▶]    │
│          │  Data sourced from REST Countries  │
└──────────────────────────────────────────────┘
```

### Components

| Component | File | Purpose |
|---|---|---|
| `Sidebar` | `components/Sidebar.tsx` | Fixed left nav — Intelligence, Archives, Methodology |
| `TopNav` | `components/TopNav.tsx` | Top bar with Query / History / About tabs |
| `ChatMessage` | `components/ChatMessage.tsx` | Single message bubble (user or assistant) |
| `ChatInput` | `components/ChatInput.tsx` | Auto-expanding textarea, pinned at bottom |
| `EmptyState` | inline in `page.tsx` | Welcome screen with 6 clickable example prompts |

### Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Main chat interface |
| `/history` | `app/history/page.tsx` | Session query archive |
| `/about` | `app/about/page.tsx` | Methodology and limitations |

### Chat Session Storage
Chat history is stored entirely in the browser's `sessionStorage` — no backend persistence.

```ts
// lib/history.ts
sessionStorage.setItem('archivist_history', JSON.stringify(entries))
```

- Key: `archivist_history`
- Max entries: 50 (oldest entries dropped)
- Survives page refresh within the same tab
- Cleared when the tab is closed
- Not shared across tabs or devices
- Backend remains fully stateless

### Error Handling in the Frontend

```ts
// lib/api.ts
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { ... }
}

// On non-OK response: reads body.answer for the backend's specific message
throw new ApiError(body.answer, response.status)
```

The chat page catches `ApiError` and displays its `.message` directly in the thread — so rate limit messages, country-not-found messages, and service errors all show as proper chat bubbles.

### Frontend-Backend Integration
- `POST /ask` called with `{ question }` on every user message.
- Backend URL injected via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).
- Frontend never calls the REST Countries API directly.
- CORS: backend defaults to `*` in development; restrict via `CORS_ORIGINS` env var in production.

---

## 8. Production Behaviour

### Request Lifecycle
1. User types a message and presses Enter (or clicks Send).
2. User message appears immediately; typing indicator shown.
3. Frontend calls `POST /ask`.
4. FastAPI validates the request (Pydantic 422 on failure).
5. LangGraph agent runs: Node 1 → Node 2 → Node 3 (or error path).
6. FastAPI serialises and returns the response.
7. Frontend replaces the typing indicator with the answer bubble.

### Timeouts and Retries
- REST Countries API: 5 s timeout, 1 retry on network timeout.
- Gemini API: managed by `langchain-google-genai` with built-in backoff on 429.
- On persistent 429, `GeminiRateLimitError` is raised and returned as HTTP 429.

### Logging
- Structured JSON logs via Python `logging` with JSON formatter.
- Each request gets a `request_id` (UUID) threaded through all log lines.
- Logged fields: `request_id`, `event`, `question`, `countries`, `latency_ms`.
- Rate limit hits logged at `WARNING`; agent errors logged at `ERROR`.

### Configuration
All secrets and config are via environment variables:

| Variable | Description | Default |
|---|---|---|
| `GOOGLE_API_KEY` | Gemini API key | — (required) |
| `GEMINI_MODEL` | Gemini model ID | `gemini-1.5-pro` |
| `CORS_ORIGINS` | Allowed frontend origins | `*` |

### Scalability
- Backend is fully stateless — horizontally scalable.
- LangGraph agent is compiled once at startup and invoked per-request.
- No shared mutable state between requests.

---

## 9. Known Limitations and Trade-offs

### No Caching
**Decision**: No caching layer per constraints.
**Impact**: Every request hits both the REST Countries API and Gemini. Latency is ~3–6 s total. A short-lived cache (Redis, 1-hour TTL) on API responses would significantly reduce latency and Gemini costs since country data changes infrequently.

### Gemini Hallucination Risk
**Decision**: Gemini synthesises answers from raw API data.
**Impact**: The synthesis prompt strictly instructs the model to use only provided data, not add emojis, and not volunteer unrequested fields. A post-synthesis validation step (cross-checking values against the raw API payload) would further reduce risk but is not implemented.

### Single API Source
**Decision**: REST Countries API is the sole data source.
**Impact**: GDP, HDI, historical data, and climate are not available — the agent explicitly says so rather than guessing. If the service is down, no questions can be answered.

### No Conversation Memory
**Decision**: Each question is independent — no prior context sent to the agent.
**Impact**: Follow-up questions like "What about its currency?" without restating the country name will fail. Session history is visible in the UI for the user's reference only. Multi-turn support would require passing history in each request.

### Session-Only Chat Storage
**Decision**: `sessionStorage` only — no database.
**Impact**: History is lost when the tab is closed. No cross-device access, no search, no persistence across sessions.

### Gemini Rate Limits
**Decision**: Free-tier Gemini quota is limited (20 requests/day on some models).
**Impact**: The agent detects 429 RESOURCE_EXHAUSTED errors, raises `GeminiRateLimitError`, and returns HTTP 429 with a clear "please wait and retry" message displayed in the chat. Upgrading to a paid Gemini tier removes this constraint.

### No Rate Limiting on the Backend
**Decision**: Not implemented.
**Impact**: Repeated requests can exhaust the Gemini quota. Production deployment should add per-IP rate limiting (e.g. `slowapi` or an API gateway).

### REST Countries API Fuzzy Matching
**Decision**: Mitigated with a two-stage lookup.
**Context**: The API's `/name/{query}` endpoint fuzzy-matches against translations in 50+ languages, causing `"india"` to return Taiwan and China (which have Indonesian translations keyed as `"ind"`). This is resolved by trying `fullText=true` first, then falling back to partial match with best-result selection by `name.common`.

---

## 10. Directory Structure

```
Country Information AI Agent/
├── backend/
│   ├── agent/
│   │   ├── __init__.py
│   │   ├── graph.py          # LangGraph graph definition + compiled agent
│   │   ├── nodes.py          # Node 1, 2, 3 + GeminiRateLimitError
│   │   ├── state.py          # AgentState TypedDict
│   │   └── prompts.py        # Gemini prompt templates (intent + synthesis)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app, routes, error classification
│   │   └── schemas.py        # AskRequest / AskResponse (Pydantic)
│   ├── services/
│   │   └── countries_api.py  # Two-stage REST Countries API client
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_nodes.py
│   │   ├── test_api.py
│   │   └── test_countries_service.py
│   ├── .env.example
│   ├── requirements.in       # Direct dependencies (edit this)
│   ├── requirements.txt      # Pinned deps (compiled via uv)
│   └── Makefile              # install / compile / run / test
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx         # App shell (Sidebar + TopNav)
│   │   │   ├── page.tsx           # Chat interface + EmptyState
│   │   │   ├── globals.css
│   │   │   ├── history/page.tsx   # Session archive
│   │   │   └── about/page.tsx     # Methodology
│   │   ├── components/
│   │   │   ├── Sidebar.tsx        # Left navigation
│   │   │   ├── TopNav.tsx         # Top bar with tabs
│   │   │   ├── ChatMessage.tsx    # Message bubble (user + assistant)
│   │   │   └── ChatInput.tsx      # Auto-expanding textarea + send button
│   │   └── lib/
│   │       ├── api.ts             # askQuestion() + ApiError class
│   │       └── history.ts         # sessionStorage read/write/clear
│   ├── .env.local.example
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── package.json
│   └── Makefile                   # install / dev / build / lint
└── DESIGN.md                      # This document
```

---

## 11. Development Commands

### Backend
```bash
cd backend
make install    # uv venv + uv pip install -r requirements.txt
make compile    # uv pip compile requirements.in -o requirements.txt
make run        # uvicorn api.main:app --reload --port 8000
make test       # pytest tests/ -v
make test-cov   # pytest with coverage report
```

### Frontend
```bash
cd frontend
make install    # npm install
make dev        # next dev (http://localhost:3000)
make build      # next build
make lint       # next lint
```

---

## 12. Development Phases (Completed)

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** | Backend: LangGraph agent (3 nodes), REST Countries API client, unit tests | Done |
| **Phase 2** | Backend: FastAPI wrapper, schemas, error handling, rate limit detection | Done |
| **Phase 3** | Frontend: Next.js chat UI, session history, error surfacing | Done |
| **Phase 4** | Dockerisation, docker-compose, deployment configuration | Pending |

---

*Document version: 2.0 — March 2026*
