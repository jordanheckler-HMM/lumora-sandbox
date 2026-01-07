# 🚀 LUMORA Sandbox - Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:

1. ✅ **Ollama installed and running**
   ```bash
   # Check if Ollama is running:
   curl http://localhost:11434/api/tags
   
   # If not running, start it:
   ollama serve
   
   # Pull a model if you haven't:
   ollama pull llama2
   ```

2. ✅ **Python 3.11+**
   ```bash
   python3 --version
   ```

3. ✅ **Node.js 18+**
   ```bash
   node --version
   ```

## 🎬 Starting the Application

### Terminal 1 - Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

You should see:
```
VITE v5.x.x ready in xxx ms
➜  Local:   http://localhost:5174/
```

### 🌐 Open the App

Navigate to: **http://localhost:5174**

## 🎯 First Steps

1. **Select a Model**: Choose from your Ollama models in the left sidebar
2. **Try Chat**: Send a message to test the connection
3. **Explore Workspace**: Navigate to the Workspace tab and browse files
4. **Edit Code**: Open a file and switch to Code tab to edit

## 🔧 Troubleshooting

### Backend won't start
- Check Python version: `python3 --version`
- Try: `python3 -m pip install -r requirements.txt`

### Frontend won't start
- Delete `node_modules` and retry: `rm -rf node_modules && npm install`

### No models showing
- Make sure Ollama is running: `ollama serve`
- Pull a model: `ollama pull llama2`
- Check Ollama: `curl http://localhost:11434/api/tags`

### CORS errors
- Ensure backend is running on port 8000
- Ensure frontend is running on port 5174

## 📁 Project Structure

```
lumora-sandbox/
├── backend/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── CodePanel.tsx
│   │   │   ├── ToolsPanel.tsx
│   │   │   └── WorkspacePanel.tsx
│   │   ├── api.ts           # API client
│   │   ├── store.ts         # Zustand state management
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── index.html
│   └── package.json
│
└── README.md                # Full documentation
```

## 🎮 Usage Tips

- **Chat**: Press Enter to send, Shift+Enter for new lines
- **Code**: Open files from Workspace, edit, then click "Save File"
- **Workspace**: Click folders to expand, files to open in editor
- **Tools**: View history of all file operations

Enjoy your local AI OS! 🌟

