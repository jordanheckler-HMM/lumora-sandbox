import sys
from pathlib import Path

from fastapi import HTTPException
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import main
import tools_router


def test_workspace_and_file_tools_respect_workspace_root(tmp_path, monkeypatch):
    allowed_root = (tmp_path / "allowed").resolve()
    allowed_root.mkdir()
    outside_root = (tmp_path / "outside").resolve()
    outside_root.mkdir()

    inside_file = allowed_root / "inside.txt"
    inside_file.write_text("hello", encoding="utf-8")
    outside_file = outside_root / "outside.txt"
    outside_file.write_text("secret", encoding="utf-8")

    monkeypatch.setattr(main, "WORKSPACE_ROOT", allowed_root)
    client = TestClient(main.app)

    # Workspace listing is allowed inside root
    ok_workspace = client.get("/workspace/files", params={"path": str(allowed_root)})
    assert ok_workspace.status_code == 200

    # Workspace listing is blocked outside root
    blocked_workspace = client.get("/workspace/files", params={"path": str(outside_root)})
    assert blocked_workspace.status_code == 403

    # File read is allowed inside root
    ok_read = client.post("/tools/read_file", json={"path": str(inside_file)})
    assert ok_read.status_code == 200
    assert ok_read.json()["content"] == "hello"

    # File read/write are blocked outside root
    blocked_read = client.post("/tools/read_file", json={"path": str(outside_file)})
    assert blocked_read.status_code == 403

    blocked_write = client.post(
        "/tools/write_file",
        json={"path": str(outside_root / "write.txt"), "content": "nope"},
    )
    assert blocked_write.status_code == 403


def test_chat_id_rejects_path_traversal(tmp_path, monkeypatch):
    chats_dir = (tmp_path / "chats").resolve()
    chats_dir.mkdir()
    monkeypatch.setattr(main, "CHATS_DIR", chats_dir)

    client = TestClient(main.app)

    blocked = client.post(
        "/chats/save",
        json={"id": "../escape", "title": "bad", "messages": []},
    )
    assert blocked.status_code == 400
    assert not (tmp_path / "escape.json").exists()

    allowed = client.post(
        "/chats/save",
        json={"id": "chat-123_abc", "title": "ok", "messages": []},
    )
    assert allowed.status_code == 200
    assert (chats_dir / "chat-123_abc.json").exists()


def test_tools_workspace_path_is_restricted(tmp_path, monkeypatch):
    allowed_root = (tmp_path / "allowed").resolve()
    allowed_root.mkdir()
    outside_root = (tmp_path / "outside").resolve()
    outside_root.mkdir()

    monkeypatch.setattr(tools_router, "WORKSPACE_ROOT", allowed_root)
    client = TestClient(main.app)

    blocked = client.post(
        "/api/tools/run",
        json={
            "toolName": "list_files",
            "workspacePath": str(outside_root),
            "model": "dummy-model",
        },
    )
    assert blocked.status_code == 403


def test_tools_returns_http_error_when_model_call_fails(tmp_path, monkeypatch):
    allowed_root = (tmp_path / "allowed").resolve()
    allowed_root.mkdir()

    monkeypatch.setattr(tools_router, "WORKSPACE_ROOT", allowed_root)

    async def fake_run_ollama_model(model: str, prompt: str) -> str:  # pragma: no cover - patched behavior
        raise HTTPException(status_code=503, detail="Cannot connect to Ollama: test")

    monkeypatch.setattr(tools_router, "run_ollama_model", fake_run_ollama_model)
    client = TestClient(main.app)

    failed = client.post(
        "/api/tools/run",
        json={
            "toolName": "summarize_workspace",
            "workspacePath": str(allowed_root),
            "model": "dummy-model",
        },
    )
    assert failed.status_code == 503
    assert "Cannot connect to Ollama" in failed.json()["detail"]


def test_health_reports_backend_and_ollama_status(monkeypatch):
    class FakeResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def get(self, *args, **kwargs):
            return FakeResponse({"models": [{"name": "model-a"}, {"name": "model-b"}]})

    monkeypatch.setattr(main.httpx, "AsyncClient", FakeAsyncClient)

    client = TestClient(main.app)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["backend"]["status"] == "ok"
    assert payload["ollama"]["status"] == "ok"
    assert payload["ollama"]["models_available"] == 2


def test_health_reports_ollama_error_when_unreachable(monkeypatch):
    class FailingAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return None

        async def get(self, *args, **kwargs):
            raise main.httpx.RequestError(
                "connection failed",
                request=main.httpx.Request("GET", "http://localhost:11434/api/tags"),
            )

    monkeypatch.setattr(main.httpx, "AsyncClient", FailingAsyncClient)

    client = TestClient(main.app)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["backend"]["status"] == "ok"
    assert payload["ollama"]["status"] == "error"
    assert "Cannot connect to Ollama" in payload["ollama"]["error"]
