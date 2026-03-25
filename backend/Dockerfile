# ── Stage 1: dependency installation ────────────────────────────────────────
FROM python:3.13-slim AS builder

WORKDIR /app

# Install uv for fast dependency resolution
RUN pip install --no-cache-dir uv

# Copy dependency files first so Docker can cache this layer
COPY requirements.txt .

# Install all dependencies into a virtual environment
RUN uv venv .venv && \
    uv pip install -r requirements.txt --python .venv/bin/python

# ── Stage 2: production image ────────────────────────────────────────────────
FROM python:3.13-slim

WORKDIR /app

# Copy the virtual environment from the builder stage
COPY --from=builder /app/.venv .venv

# Copy only the source code needed at runtime (no tests, no dev files)
COPY agent/ agent/
COPY api/ api/
COPY services/ services/

# Make the venv Python the default
ENV PATH="/app/.venv/bin:$PATH"

# Expose the port Uvicorn will listen on
EXPOSE 8000

# Run the FastAPI server
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
