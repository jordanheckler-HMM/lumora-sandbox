from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
import aiofiles
import os
import json
import re
from pathlib import Path
from typing import List, Optional, Dict, Any
import pandas as pd
import io
from tools_router import router as tools_router

app = FastAPI(title="LUMORA Sandbox API")

# Include tools router
app.include_router(tools_router, prefix="/api/tools", tags=["tools"])

# CORS configuration - supports environment variable for production
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174,tauri://localhost,https://tauri.localhost,http://tauri.localhost').split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
WORKSPACE_ROOT = Path(os.getenv('WORKSPACE_ROOT', str(Path.home()))).expanduser().resolve()
CHAT_ID_PATTERN = re.compile(r'^[A-Za-z0-9_-]+$')

# Security constants
MAX_FILE_READ_SIZE = 50 * 1024 * 1024  # 50MB
MAX_CSV_UPLOAD_SIZE = 100 * 1024 * 1024  # 100MB

# Security utility function
def validate_safe_path(requested_path: str, allowed_base: Optional[str] = None) -> Path:
    """Validate path is safe and within allowed boundaries"""
    resolved = Path(requested_path).expanduser().resolve()

    allowed = Path(allowed_base).expanduser().resolve() if allowed_base else WORKSPACE_ROOT
    try:
        resolved.relative_to(allowed)
    except ValueError:
        raise HTTPException(status_code=403, detail=f"Path outside allowed workspace root: {allowed}")
    
    # Block sensitive paths
    sensitive_patterns = ['/etc/', '/sys/', '/proc/', '/.ssh/', '/root/']
    path_str = str(resolved)
    if any(pattern in path_str for pattern in sensitive_patterns):
        raise HTTPException(status_code=403, detail="Access to system directories denied")
    
    return resolved

def validate_chat_id(chat_id: str) -> str:
    """Allow only simple chat identifiers to prevent path traversal."""
    if not CHAT_ID_PATTERN.fullmatch(chat_id):
        raise HTTPException(status_code=400, detail="Invalid chat ID format")
    return chat_id

# Pydantic models
class RunModelRequest(BaseModel):
    model: str
    prompt: str

class ChatRequest(BaseModel):
    model: str
    messages: List[Dict[str, str]]  # Array of {role: "user"|"assistant", content: "..."}

class ReadFileRequest(BaseModel):
    path: str

class WriteFileRequest(BaseModel):
    path: str
    content: str

class SearchRequest(BaseModel):
    root: str
    query: str

class FileNode(BaseModel):
    name: str
    path: str
    type: str  # "file" or "directory"
    children: Optional[List['FileNode']] = None

class ChatMessage(BaseModel):
    id: str
    role: str  # "user" or "assistant"
    content: str
    model: str
    timestamp: int

class ChatSession(BaseModel):
    id: str
    title: str
    createdAt: int
    updatedAt: int
    messages: List[ChatMessage]

class SaveChatRequest(BaseModel):
    id: str
    title: str
    messages: List[Dict[str, Any]]

# Update forward references
FileNode.model_rebuild()

# Chat storage directory
CHATS_DIR = Path(__file__).parent / "chats"
CHATS_DIR.mkdir(exist_ok=True)

# Endpoints

@app.get("/")
async def root():
    return {"message": "LUMORA Sandbox API", "status": "running"}

@app.get("/health")
async def health():
    """Service health for backend and Ollama dependency."""
    health_payload: Dict[str, Any] = {
        "backend": {"status": "ok"},
        "ollama": {"status": "unknown", "models_available": 0},
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=5.0)
            response.raise_for_status()
            data = response.json()
            models = data.get("models", [])
            health_payload["ollama"] = {
                "status": "ok",
                "models_available": len(models),
            }
    except httpx.RequestError as e:
        health_payload["ollama"] = {
            "status": "error",
            "models_available": 0,
            "error": f"Cannot connect to Ollama: {str(e)}",
        }
    except httpx.HTTPStatusError as e:
        health_payload["ollama"] = {
            "status": "error",
            "models_available": 0,
            "error": f"Ollama returned status {e.response.status_code}",
        }
    except Exception as e:
        health_payload["ollama"] = {
            "status": "error",
            "models_available": 0,
            "error": str(e),
        }

    return health_payload

@app.get("/models")
async def get_models():
    """Get list of available Ollama models"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=10.0)
            response.raise_for_status()
            data = response.json()
            return {"models": data.get("models", [])}
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to Ollama: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run-model")
async def run_model(request: RunModelRequest):
    """Run a model with a prompt"""
    try:
        async with httpx.AsyncClient() as client:
            # Ollama generate API
            payload = {
                "model": request.model,
                "prompt": request.prompt,
                "stream": False
            }
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return {
                "response": data.get("response", ""),
                "model": request.model,
                "done": data.get("done", False)
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to Ollama: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with a model using conversation history"""
    try:
        async with httpx.AsyncClient() as client:
            # Ollama chat API - supports conversation history
            payload = {
                "model": request.model,
                "messages": request.messages,
                "stream": False
            }
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json=payload,
                timeout=120.0
            )
            response.raise_for_status()
            data = response.json()
            return {
                "response": data.get("message", {}).get("content", ""),
                "model": request.model,
                "done": data.get("done", False)
            }
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Cannot connect to Ollama: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Chat with a model using conversation history with streaming response"""
    async def generate():
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Ollama chat API with streaming
                payload = {
                    "model": request.model,
                    "messages": request.messages,
                    "stream": True
                }
                
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json=payload
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if line.strip():
                            try:
                                chunk = json.loads(line)
                                if "message" in chunk:
                                    content = chunk["message"].get("content", "")
                                    if content:
                                        # Send as Server-Sent Event format
                                        yield f"data: {json.dumps({'content': content})}\n\n"
                                
                                # Send done signal
                                if chunk.get("done", False):
                                    yield f"data: {json.dumps({'done': True})}\n\n"
                            except json.JSONDecodeError:
                                continue
                                
        except httpx.RequestError as e:
            error_msg = f"Cannot connect to Ollama: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
        except Exception as e:
            error_msg = f"Error: {str(e)}"
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/tools/read_file")
async def read_file(request: ReadFileRequest):
    """Read file contents"""
    try:
        file_path = validate_safe_path(request.path)
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        if not file_path.is_file():
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        # Check file size before reading
        file_size = file_path.stat().st_size
        if file_size > MAX_FILE_READ_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large (max {MAX_FILE_READ_SIZE // 1024 // 1024}MB)")
        
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()
        
        return {
            "path": str(file_path),
            "content": content,
            "size": file_size
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not a text file")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/write_file")
async def write_file(request: WriteFileRequest):
    """Write content to a file"""
    try:
        file_path = validate_safe_path(request.path)
        
        # Create parent directories if they don't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
            await f.write(request.content)
        
        return {
            "path": str(file_path),
            "success": True,
            "size": len(request.content)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tools/search")
async def search_files(request: SearchRequest):
    """Search for files matching a query"""
    try:
        root_path = validate_safe_path(request.root)
        
        if not root_path.exists():
            raise HTTPException(status_code=404, detail="Root path not found")
        
        matches = []
        query_lower = request.query.lower()
        
        for file_path in root_path.rglob("*"):
            if file_path.is_file():
                # Search in filename
                if query_lower in file_path.name.lower():
                    matches.append(str(file_path))
                    continue
                
                # Search in file contents (for text files)
                try:
                    # Check file size before reading
                    if file_path.stat().st_size > MAX_FILE_READ_SIZE:
                        continue  # Skip large files
                    
                    async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                        content = await f.read()
                        if query_lower in content.lower():
                            matches.append(str(file_path))
                except:
                    # Skip binary files or files that can't be read
                    pass
        
        return {
            "query": request.query,
            "root": str(root_path),
            "matches": matches[:100]  # Limit to 100 results
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workspace/files")
async def get_workspace_files(path: str = "."):
    """Get SHALLOW (top-level only) list of files in workspace
    
    SAFE LOADER:
    - Only lists immediate children (no recursion)
    - Never reads file contents
    - Never interacts with models
    - Returns simple directory structure
    """
    try:
        root_path = validate_safe_path(path)
        
        if not root_path.exists():
            raise HTTPException(status_code=404, detail="Path not found")
        
        if root_path.is_file():
            # If path is a file, just return the file node
            return FileNode(
                name=root_path.name,
                path=str(root_path),
                type="file"
            )
        
        # SHALLOW LOADER - only list immediate children, no recursion
        children = []
        
        try:
            # Filter out hidden files and common ignored directories
            ignore_items = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', '.DS_Store'}
            
            # Read only immediate children (no recursion)
            items = sorted(root_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
            
            for item in items:
                # Skip hidden files and ignored directories
                if item.name.startswith('.') or item.name in ignore_items:
                    continue
                
                # Add item WITHOUT recursing into subdirectories
                if item.is_dir():
                    children.append(FileNode(
                        name=item.name,
                        path=str(item),
                        type="directory",
                        children=None  # No recursion - children not loaded
                    ))
                else:
                    children.append(FileNode(
                        name=item.name,
                        path=str(item),
                        type="file"
                    ))
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Return root node with only immediate children
        return FileNode(
            name=root_path.name or str(root_path),
            path=str(root_path),
            type="directory",
            children=children if children else None
        )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sheets/parse-csv")
async def parse_csv(file: UploadFile = File(...)):
    """Parse CSV file and return structured data"""
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Check file size
        if len(contents) > MAX_CSV_UPLOAD_SIZE:
            raise HTTPException(status_code=413, detail=f"File too large (max {MAX_CSV_UPLOAD_SIZE // 1024 // 1024}MB)")
        
        # Parse CSV with pandas
        df = pd.read_csv(io.BytesIO(contents))
        
        # Convert to JSON-friendly format
        columns = df.columns.tolist()
        rows = df.values.tolist()
        
        # Convert NaN to empty string
        rows = [[str(cell) if pd.notna(cell) else '' for cell in row] for row in rows]
        
        return {
            "filename": file.filename,
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "column_count": len(columns)
        }
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="CSV file is empty")
    except pd.errors.ParserError as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")

# ============================================================================
# CHAT SESSION ENDPOINTS
# ============================================================================

@app.get("/chats/list")
async def list_chats():
    """Get list of all chat sessions with metadata"""
    try:
        chat_files = list(CHATS_DIR.glob("*.json"))
        sessions = []
        
        for chat_file in chat_files:
            try:
                async with aiofiles.open(chat_file, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    chat_data = json.loads(content)
                    
                    # Validate required fields
                    required_fields = ['id', 'title', 'createdAt', 'updatedAt']
                    if not all(field in chat_data for field in required_fields):
                        print(f"Invalid chat file (missing fields): {chat_file}")
                        continue
                    
                    # Return metadata only
                    sessions.append({
                        "id": chat_data["id"],
                        "title": chat_data["title"],
                        "createdAt": chat_data["createdAt"],
                        "updatedAt": chat_data["updatedAt"]
                    })
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Error reading chat file {chat_file}: {e}")
                continue
            except Exception as e:
                print(f"Error reading chat file {chat_file}: {e}")
                continue
        
        # Sort by updatedAt (most recent first)
        sessions.sort(key=lambda x: x.get("updatedAt", 0), reverse=True)
        
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats/{chat_id}")
async def get_chat(chat_id: str):
    """Get full chat session by ID"""
    try:
        safe_chat_id = validate_chat_id(chat_id)
        chat_file = CHATS_DIR / f"{safe_chat_id}.json"
        
        if not chat_file.exists():
            raise HTTPException(status_code=404, detail="Chat not found")
        
        async with aiofiles.open(chat_file, 'r', encoding='utf-8') as f:
            content = await f.read()
            chat_data = json.loads(content)
        
        return chat_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chats/save")
async def save_chat(request: SaveChatRequest):
    """Save or update a chat session"""
    try:
        safe_chat_id = validate_chat_id(request.id)
        chat_file = CHATS_DIR / f"{safe_chat_id}.json"
        
        # Check if chat exists to preserve createdAt
        created_at = int(pd.Timestamp.now().timestamp() * 1000)
        if chat_file.exists():
            async with aiofiles.open(chat_file, 'r', encoding='utf-8') as f:
                content = await f.read()
                existing_data = json.loads(content)
                created_at = existing_data.get("createdAt", created_at)
        
        # Prepare chat data
        chat_data = {
            "id": safe_chat_id,
            "title": request.title,
            "createdAt": created_at,
            "updatedAt": int(pd.Timestamp.now().timestamp() * 1000),
            "messages": request.messages
        }
        
        # Save to file
        async with aiofiles.open(chat_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(chat_data, indent=2))
        
        return {
            "success": True,
            "id": safe_chat_id,
            "createdAt": created_at,
            "updatedAt": chat_data["updatedAt"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chats/{chat_id}")
async def delete_chat(chat_id: str):
    """Delete a chat session"""
    try:
        safe_chat_id = validate_chat_id(chat_id)
        chat_file = CHATS_DIR / f"{safe_chat_id}.json"
        
        if not chat_file.exists():
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Delete the file
        chat_file.unlink()
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
