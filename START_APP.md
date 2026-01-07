# 🚀 Starting LUMORA Sandbox

Quick guide to start the complete application.

## Prerequisites

1. ✅ **Ollama running** on port 11434
   ```bash
   ollama serve
   # Pull at least one model:
   ollama pull llama2
   ```

2. ✅ **Python 3.11+** with dependencies installed
3. ✅ **Node.js 18+** with dependencies installed

## Start the Application

### Terminal 1: Backend

```bash
cd backend
pip install -r requirements.txt  # First time only
uvicorn main:app --reload --port 8000
```

✅ Backend runs on: `http://localhost:8000`

### Terminal 2: Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

✅ Frontend runs on: `http://localhost:5174`

## Open the App

Navigate to: **http://localhost:5174**

You should see:
- ✅ LUMORA Sandbox UI with sidebar
- ✅ Model selector with available Ollama models
- ✅ Four tabs: Chat, Code, Tools, Workspace

## Verify Everything Works

1. **Check Backend**: Visit `http://localhost:8000/docs`
2. **Check Frontend**: Visit `http://localhost:5174`
3. **Test Chat**: Select a model and send a message
4. **Test Workspace**: Browse files and open them
5. **Test Code Editor**: Edit and save files

## Troubleshooting

### Frontend shows white screen
- Check browser console for errors (F12)
- Ensure all dependencies installed: `cd frontend && npm install`
- Try rebuild: `npm run build`

### Backend won't start
- Check Python version: `python3 --version`
- Reinstall dependencies: `pip install -r requirements.txt`

### No models showing
- Ensure Ollama is running: `curl http://localhost:11434/api/tags`
- Start Ollama: `ollama serve`
- Pull a model: `ollama pull llama2`

## Tech Stack

- **Backend**: FastAPI + Uvicorn + Ollama
- **Frontend**: React 19 + Vite + TypeScript + Tailwind v4
- **Editor**: Monaco Editor
- **State**: Zustand
- **Ports**: Backend (8000), Frontend (5174), Ollama (11434)

---

Enjoy your local AI OS! 🌟

