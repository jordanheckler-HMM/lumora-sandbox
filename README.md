# 🌟 LUMORA Sandbox

A local AI OS layer for interacting with personal Lumora models via Ollama and a custom tool server.

## 🎯 Features

- **Chat Mode**: General assistant interface for conversing with local AI models
- **Code Mode**: Mini Cursor-style code editor with Monaco Editor
- **Tools Mode**: View outputs from file operations (read, write, search)
- **Workspace Mode**: File explorer with click-to-open functionality
- **Model Selector**: Switch between available local Ollama models
- **100% Local**: No external cloud dependencies - everything runs on your machine

## 🏗️ Architecture

### Backend (FastAPI)
- Python FastAPI server exposing REST endpoints
- Integrates with Ollama API for model inference
- Provides file system tools (read, write, search)
- Workspace file explorer functionality

### Frontend (React + Vite + Tailwind + Monaco)
- Modern React UI with TypeScript
- TailwindCSS for styling
- Monaco Editor for code editing
- Zustand for state management
- Axios for API communication

## 📋 Prerequisites

1. **Python 3.11+**: Make sure Python is installed
2. **Node.js 18+**: Required for the frontend
3. **Ollama**: Install and run Ollama locally
   ```bash
   # Install Ollama from https://ollama.ai
   # Pull some models:
   ollama pull llama2
   ollama pull codellama
   ollama pull mistral
   ```

## 🚀 Installation & Setup

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```

The backend will start on `http://localhost:8000`

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5174`

### 3. Verify Ollama is Running

Make sure Ollama is running on port 11434:

```bash
curl http://localhost:11434/api/tags
```

## 🎮 Usage

1. **Open the app**: Navigate to `http://localhost:5174` in your browser
2. **Select a model**: Choose from available Ollama models in the sidebar
3. **Choose a mode**:
   - **Chat**: Have conversations with your AI
   - **Code**: Edit files with syntax highlighting
   - **Tools**: View file operation outputs
   - **Workspace**: Browse and open files from your file system

### Chat Mode
- Type messages and get responses from your selected model
- Press Enter to send, Shift+Enter for new line

### Code Mode
- Open files from the Workspace tab
- Edit with full Monaco Editor features
- Click "Save File" to write changes back to disk

### Workspace Mode
- Enter a path and click "Load" to explore directories
- Click on files to open them in the Code editor
- Click folders to expand/collapse

### Tools Mode
- View history of all file operations
- See read, write, and search results

## 🔌 API Endpoints

### Models
- `GET /models` - List available Ollama models

### Model Inference
- `POST /run-model` - Run a prompt through a model
  ```json
  {
    "model": "llama2",
    "prompt": "Hello, how are you?"
  }
  ```

### File Tools
- `POST /tools/read_file` - Read file contents
  ```json
  {
    "path": "/path/to/file.txt"
  }
  ```

- `POST /tools/write_file` - Write content to file
  ```json
  {
    "path": "/path/to/file.txt",
    "content": "File contents here"
  }
  ```

- `POST /tools/search` - Search for files
  ```json
  {
    "root": "/path/to/search",
    "query": "search term"
  }
  ```

### Workspace
- `GET /workspace/files?path=/some/path` - Get file tree

## 🛠️ Development

### Backend Development
The FastAPI server runs with hot reload enabled:
```bash
cd backend
uvicorn main:app --reload
```

### Frontend Development
Vite provides hot module replacement:
```bash
cd frontend
npm run dev
```

### Build for Production
```bash
cd frontend
npm run build
```

## 🔒 Security Notes

- The backend allows file system access - use caution with paths
- CORS is configured for localhost:5174 only
- No authentication is implemented - this is for local use only
- File operations are not sandboxed - be careful with write operations

## 🐛 Troubleshooting

### "Cannot connect to Ollama"
- Ensure Ollama is running: `ollama serve`
- Check Ollama is on port 11434: `curl http://localhost:11434/api/tags`

### "Failed to load models"
- Make sure you have at least one model pulled: `ollama pull llama2`
- Check Ollama service is accessible

### Port Already in Use
- Backend: Change port with `uvicorn main:app --port 8001`
- Frontend: Configured to use port 5174 (change in `vite.config.ts` if needed)

## 📝 License

This is a personal sandbox project for local AI interaction.

## 🙏 Credits

- **Ollama** - Local AI model serving
- **FastAPI** - Backend framework
- **React** - Frontend framework
- **Monaco Editor** - Code editor component
- **TailwindCSS** - Styling framework

---

Built with ❤️ for local AI development

