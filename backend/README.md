# LUMORA Sandbox Backend

FastAPI backend for LUMORA Sandbox - provides AI model routing and file system tools.

## Requirements

- Python 3.11+
- Ollama running locally on port 11434

## Installation

```bash
pip install -r requirements.txt
```

## Running

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### Core
- `GET /` - Health check
- `GET /health` - Backend + Ollama dependency status

### Models
- `GET /models` - List available Ollama models
- `POST /run-model` - Run a prompt through a model

### File Tools
- `POST /tools/read_file` - Read file contents
- `POST /tools/write_file` - Write content to a file
- `POST /tools/search` - Search for files and content

### Workspace
- `GET /workspace/files?path=/path` - Get shallow file tree (immediate children only)

## CORS

Configured to allow requests from:
- `http://localhost:5173`
- `http://localhost:5174`

## Dependencies

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **Pydantic** - Data validation
- **aiofiles** - Async file operations
- **httpx** - Async HTTP client for Ollama
- **python-multipart** - Form data parsing
- **requests** - HTTP library
