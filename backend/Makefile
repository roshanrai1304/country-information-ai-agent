.PHONY: install compile run test test-cov clean

# Compile pinned requirements.txt from requirements.in
compile:
	uv pip compile requirements.in -o requirements.txt

# Create virtual environment and install pinned dependencies
install:
	uv venv .venv
	uv pip install -r requirements.txt --python .venv/bin/python

# Compile then install (use this after editing requirements.in)
sync: compile install

# Run the FastAPI development server
run:
	.venv/bin/uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# Run the test suite
test:
	.venv/bin/pytest tests/ -v

# Run tests with coverage report
test-cov:
	.venv/bin/pytest tests/ -v --cov=. --cov-report=term-missing

# Remove virtual environment and cache
clean:
	rm -rf .venv __pycache__ .pytest_cache
