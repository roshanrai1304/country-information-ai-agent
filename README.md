# Country Information AI Agent

An AI-powered chat agent that answers natural language questions about countries using live data from the [REST Countries API](https://restcountries.com). Supports single-country queries, multi-country comparisons, and casual phrasing — all answers are grounded exclusively in real API data, never model memory.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Running Both Servers](#running-both-servers)
- [Docker](#docker)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **LLM (Node 1 — extraction)** | Google Gemini Flash | `gemini-1.5-flash` (configurable) |
| **LLM (Node 3 — synthesis)** | Google Gemini Pro | `gemini-1.5-pro` (configurable) |
| **Agent orchestration** | LangGraph + LangChain | `langgraph>=0.2`, `langchain-google-genai>=2.0` |
| **Backend framework** | FastAPI + Uvicorn | `fastapi>=0.115`, `uvicorn>=0.32` |
| **Backend language** | Python | 3.13+ |
| **Python package manager** | uv | 0.9+ |
| **Frontend framework** | Next.js (App Router) | 14.2.5 |
| **Frontend language** | TypeScript | 5+ |
| **Styling** | Tailwind CSS | 3.4+ |
| **Frontend package manager** | npm | 11+ |
| **Node.js** | Node.js | 20+ |
| **External data source** | REST Countries API | v3.1 (public, no auth) |
| **Containerisation** | Docker + docker-compose | latest |

---

## Project Structure

```
Country Information AI Agent/
├── backend/
│   ├── agent/
│   │   ├── graph.py          # LangGraph pipeline definition
│   │   ├── guardrails.py     # Prompt injection protection
│   │   ├── nodes.py          # Node 1 (extraction), Node 2 (fetch), Node 3 (synthesis)
│   │   ├── prompts.py        # Gemini prompt templates
│   │   └── state.py          # AgentState TypedDict
│   ├── api/
│   │   ├── main.py           # FastAPI app and routes
│   │   └── schemas.py        # Pydantic request/response models
│   ├── services/
│   │   └── countries_api.py  # REST Countries API client (two-stage lookup)
│   ├── tests/
│   │   ├── test_api.py
│   │   ├── test_countries_service.py
│   │   ├── test_guardrails.py
│   │   └── test_nodes.py
│   ├── .env.example
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── Procfile              # Railway deployment
│   ├── railway.json          # Railway build config
│   ├── vercel.json           # Vercel serverless config
│   ├── Makefile
│   ├── requirements.in       # Direct dependencies (edit this)
│   └── requirements.txt      # Pinned dependencies (compiled by uv)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Chat interface
│   │   │   ├── history/page.tsx   # Session archive
│   │   │   └── about/page.tsx     # Methodology
│   │   ├── components/
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopNav.tsx
│   │   └── lib/
│   │       ├── api.ts             # Backend API client + ApiError
│   │       └── history.ts         # sessionStorage helpers
│   ├── .env.local.example
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── vercel.json           # Vercel deployment config
│   ├── Makefile
│   ├── next.config.mjs       # output: standalone + flagcdn.com image domain
│   ├── package.json
│   └── tailwind.config.ts
├── docker-compose.yml        # Run backend + frontend together locally
├── DESIGN.md
└── README.md
```

---

## Prerequisites

Install these tools before starting.

### Python (backend)

**Python 3.13+** is required.

```bash
# Check your version
python3 --version   # should print Python 3.13.x or higher
```

Install from [python.org](https://www.python.org/downloads/) or via your system package manager.

---

**uv** — fast Python package and virtual environment manager.

```bash
# Install uv (macOS / Linux)
curl -Ls https://astral.sh/uv/install.sh | sh

# Verify
uv --version   # should print uv 0.9.x or higher
```

---

### Node.js (frontend)

**Node.js 20+** and **npm 11+** are required.

```bash
# Check your versions
node --version   # should print v20.x or higher
npm --version    # should print 11.x or higher
```

Install from [nodejs.org](https://nodejs.org/).

---

### Google Gemini API Key

The backend requires a Gemini API key.

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a new API key.
3. Copy the key — you will need it in the backend `.env` file below.

---

## Backend Setup

All commands run from the `backend/` directory.

### 1. Navigate to the backend folder

```bash
cd backend
```

### 2. Create the virtual environment and install dependencies

```bash
make install
```

This runs:
```
uv venv .venv
uv pip install -r requirements.txt --python .venv/bin/python
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# Required — your Google Gemini API key
GOOGLE_API_KEY=your_google_api_key_here

# Optional — Gemini model to use (default: gemini-3.1-pro)
GEMINI_MODEL=gemini-2.5-flash

# Optional — allowed frontend origins for CORS (default: * for development)
CORS_ORIGINS=*
```

> **Note:** For production, set `CORS_ORIGINS` to your frontend URL, e.g. `https://your-app.vercel.app`.

### 4. Start the backend server

```bash
make run
```

The server starts at **http://localhost:8000**.

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

---

## Frontend Setup

All commands run from the `frontend/` directory.

### 1. Navigate to the frontend folder

```bash
cd frontend
```

### 2. Install dependencies

```bash
make install
```

This runs `npm install`.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local`:

```env
# URL of the running backend server
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Start the frontend development server

```bash
make dev
```

The app opens at **http://localhost:3000**.

---

## Running Both Servers

You need **two terminal windows** running simultaneously.

**Terminal 1 — Backend:**
```bash
cd backend
make run
# Backend running at http://localhost:8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
make dev
# Frontend running at http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## Docker

Run both services with a single command:

```bash
# Build and start backend + frontend
docker-compose up --build

# Backend → http://localhost:8000
# Frontend → http://localhost:3000
```

> Make sure `backend/.env` exists with your `GOOGLE_API_KEY` before running.

Stop and remove containers:
```bash
docker-compose down
```

---

## Deployment

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** → `frontend`
3. Set **Framework Preset** → `Next.js`
4. Add environment variable: `NEXT_PUBLIC_API_URL=<your backend URL>`
5. Deploy

### Backend → Railway (recommended)

1. Go to [Railway](https://railway.app) → New Project → Deploy from GitHub
2. Set **Root Directory** → `backend`
3. Add environment variables:
   ```
   GOOGLE_API_KEY=your_key
   GEMINI_MODEL=gemini-1.5-pro
   GEMINI_MODEL_FAST=gemini-1.5-flash
   CORS_ORIGINS=https://your-app.vercel.app
   ```
4. Start Command (auto-detected from `Procfile`): `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

> **Note:** If deploying the backend on Vercel instead of Railway, the in-memory country cache will not persist between requests (serverless cold starts).

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_API_KEY` | Yes | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-1.5-pro` | Gemini model for Node 3 (synthesis) |
| `GEMINI_MODEL_FAST` | No | `gemini-1.5-flash` | Gemini model for Node 1 (extraction) |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed frontend origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend server URL |

---

## API Reference

### `POST /ask`

Submit a natural language question about one or more countries.

**Request**
```json
{
  "question": "What is the capital of Japan?"
}
```

| Field | Type | Required | Max length |
|---|---|---|---|
| `question` | string | Yes | 500 characters |

**Response — success**
```json
{
  "answer": "The capital of Japan is Tokyo.",
  "countries": ["Japan"],
  "flags": [],
  "source": "restcountries.com"
}
```

> `flags` is populated only when the question explicitly asks about a flag (keywords: `flag`, `flags`, `emblem`, `banner`).

**Response — flag question**
```json
{
  "answer": "The flag of Japan is a white rectangular flag with a red disc in the centre.",
  "countries": ["Japan"],
  "flags": [
    {
      "country": "Japan",
      "png": "https://flagcdn.com/w320/jp.png",
      "alt": "The flag of Japan is white with a red disc in the centre."
    }
  ],
  "source": "restcountries.com"
}
```

**Error responses**

| HTTP Status | Cause |
|---|---|
| `400` | Prompt injection attempt detected |
| `422` | Malformed request (empty question, exceeds 500 chars) |
| `429` | Gemini API rate limit exceeded |
| `502` | Gemini service unavailable |

---

### `GET /health`

```json
{ "status": "ok" }
```

Used as a liveness probe by load balancers.

---

## Running Tests

From the `backend/` directory:

```bash
# Run all tests
make test

# Run with coverage report
make test-cov
```

Test files:

| File | Coverage |
|---|---|
| `test_api.py` | FastAPI endpoints, error codes, flags, injection blocking, rate limiting |
| `test_nodes.py` | Node 1–3 logic, rate limit errors, country name sanitisation |
| `test_countries_service.py` | Two-stage API lookup, partial failures, best-match selection |
| `test_guardrails.py` | Injection pattern detection, country name sanitisation |

Current test count: **93 tests, all passing**.

---

## Makefile Commands

### Backend

| Command | Description |
|---|---|
| `make install` | Create `.venv` and install pinned dependencies |
| `make compile` | Recompile `requirements.txt` from `requirements.in` |
| `make sync` | Compile then install (use after editing `requirements.in`) |
| `make run` | Start Uvicorn dev server on port 8000 |
| `make test` | Run pytest |
| `make test-cov` | Run pytest with coverage report |
| `make clean` | Remove `.venv` and cache directories |

### Frontend

| Command | Description |
|---|---|
| `make install` | Run `npm install` |
| `make dev` | Start Next.js dev server on port 3000 |
| `make build` | Build for production |
| `make start` | Start production server (run `make build` first) |
| `make lint` | Run ESLint |
