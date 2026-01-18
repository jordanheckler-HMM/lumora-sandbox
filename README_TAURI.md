# 🚀 Lumora Sandbox - Desktop Application (Tauri)

This guide explains how to run and build the Lumora Sandbox as a native desktop application using Tauri.

## 📋 Prerequisites

Before you can run the desktop app, ensure you have:

1. **Node.js 18+** (already required for frontend)
2. **Python 3.11+** (already required for backend)
3. **Rust** (latest stable)
   ```bash
   # Install Rust from https://rustup.rs/
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
4. **Ollama** (already required for AI models)
   ```bash
   # Must be running on port 11434
   ollama serve
   ```

## 🎯 Quick Start

### Development Mode

Development mode opens the app in a native window with hot reload enabled. The backend must be started separately.

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m uvicorn main:app --reload
```

**Terminal 2 - Desktop App:**
```bash
cd frontend
npm run tauri:dev
```

The app will open in a native window at 1400x900 resolution. Any changes to the frontend code will hot reload automatically.

### Production Build

Production build creates a standalone desktop application with the backend bundled inside.

**Step 1: Build the backend executable**
```bash
cd frontend
npm run tauri:build-backend
```

This will:
- Compile the Python backend using PyInstaller
- Create a platform-specific binary
- Copy it to `src-tauri/binaries/`

**Step 2: Build the desktop app**
```bash
npm run tauri:build
```

This will:
- Build the frontend for production
- Bundle the backend executable
- Create a native app in `src-tauri/target/release/bundle/`

**Step 3: Find your app**

- **macOS**: `src-tauri/target/release/bundle/macos/Lumora Sandbox.app`
- **Linux**: `src-tauri/target/release/bundle/appimage/lumora-sandbox_*.AppImage`
- **Windows**: `src-tauri/target/release/bundle/msi/Lumora Sandbox_*.msi`

## 🖥️ Running the Desktop App

### Development Mode Behavior

In development mode:
- Frontend runs via Vite dev server (hot reload enabled)
- Backend must be started manually in a separate terminal
- Dev tools are available in the window
- App connects to `http://localhost:8000` for backend API

### Production Mode Behavior

In production mode:
- Frontend is bundled into the app
- Backend starts automatically as a sidecar process
- No dev tools or console logs
- Backend runs on `http://localhost:8000`
- Backend terminates when app closes
- True one-click launch experience

## 📦 Package Scripts

All commands should be run from the `frontend` directory:

```bash
# Development
npm run tauri:dev          # Start desktop app in dev mode

# Production Build
npm run tauri:build-backend  # Build Python backend executable
npm run tauri:build          # Build complete desktop app (includes backend build)

# Utilities
npm run verify-ollama      # Check if Ollama is running
npm run tauri              # Direct access to Tauri CLI
```

## 🏗️ Project Structure

```
frontend/
├── src-tauri/              # Tauri Rust application
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   └── lib.rs         # Backend lifecycle management
│   ├── binaries/          # Backend executables (generated)
│   ├── tauri.conf.json    # Tauri configuration
│   ├── Cargo.toml         # Rust dependencies
│   └── build.rs           # Build script
├── scripts/
│   ├── build-backend.js   # Backend compilation script
│   └── verify-ollama.js   # Ollama verification
├── .env.development       # Dev environment variables
├── .env.production        # Prod environment variables
└── package.json           # NPM scripts

backend/
├── build-executable.sh    # Backend compilation script
└── dist/                  # Compiled backend (generated)
    └── backend-server
```

## 🔧 Configuration

### Window Settings

Configured in `src-tauri/tauri.conf.json`:
- Title: "Lumora Sandbox"
- Default size: 1400x900
- Min size: 1000x700
- Centered on launch
- Resizable

### Backend Configuration

The backend sidecar:
- Runs on port 8000 (same as development)
- Starts automatically in production builds
- Terminates gracefully when app closes
- Uses same backend code as standalone version

### CORS Configuration

The backend (`backend/main.py`) is configured to accept requests from:
- `http://localhost:5173` - Vite default
- `http://localhost:5174` - Vite configured
- `tauri://localhost` - Tauri protocol
- `https://tauri.localhost` - Tauri secure protocol
- `http://tauri.localhost` - Tauri http protocol

## 🐛 Troubleshooting

### "Backend binary not found" during build

**Solution:** Run the backend build script first:
```bash
npm run tauri:build-backend
```

### "Cannot connect to Ollama" in desktop app

**Solution:** Ensure Ollama is running:
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve

# Pull a model if needed
ollama pull llama2
```

### Backend won't start in production app

**Check the logs:** On macOS, you can view console logs:
```bash
log show --predicate 'process == "Lumora Sandbox"' --last 5m
```

### App won't launch in dev mode

1. Ensure backend is running in separate terminal
2. Check that port 5174 is not in use
3. Verify Rust toolchain is installed: `rustc --version`

### PyInstaller not found during backend build

**Solution:** Install PyInstaller:
```bash
pip install pyinstaller
```

## 📝 Development Tips

1. **Hot Reload:** In dev mode, frontend changes reload instantly. Backend changes require restarting the backend server.

2. **Backend Binary:** The backend binary is platform-specific. If you build on macOS, the app only works on macOS.

3. **Build Time:** First build takes 5-10 minutes due to Rust compilation. Subsequent builds are faster (1-2 minutes).

4. **App Size:** The final app will be 50-100MB depending on Python dependencies.

5. **Ollama Dependency:** Ollama must still be installed and running separately. It cannot be bundled into the app.

## 🎨 Customization

### Change App Name

Edit `src-tauri/tauri.conf.json`:
```json
{
  "productName": "Your App Name",
  "identifier": "com.yourcompany.yourapp"
}
```

### Change Window Size

Edit `src-tauri/tauri.conf.json`:
```json
{
  "app": {
    "windows": [{
      "width": 1600,
      "height": 1000
    }]
  }
}
```

### Change App Icon

Replace icon files in `src-tauri/icons/` and rebuild.

## 🚀 Distribution

To distribute your app:

1. **Build for production:**
   ```bash
   npm run tauri:build
   ```

2. **Locate the bundle:**
   - macOS: `src-tauri/target/release/bundle/macos/`
   - Linux: `src-tauri/target/release/bundle/appimage/`
   - Windows: `src-tauri/target/release/bundle/msi/`

3. **Share the app:**
   - macOS: Distribute the `.app` file or create a DMG
   - Linux: Distribute the `.AppImage` file
   - Windows: Distribute the `.msi` installer

**Note:** This setup does NOT include code signing or auto-updates. Users may see security warnings on macOS/Windows. For production distribution, you'll want to add code signing.

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/)
- [Tauri Sidecar Pattern](https://tauri.app/v1/guides/building/sidecar)
- [PyInstaller Documentation](https://pyinstaller.org/)

## ⚡ Performance Notes

- **Startup Time:** Production app starts in 2-3 seconds (includes backend startup)
- **Memory Usage:** ~150-200MB with backend running
- **CPU Usage:** Minimal when idle, spikes during AI model inference (Ollama)

## 🔒 Security Notes

- Backend runs on localhost only (not exposed to network)
- CORS configured for Tauri protocols only
- No authentication (local use only)
- File operations use same permissions as user account

---

**Happy Building! 🎉**

For issues or questions, refer to the main [README.md](../README.md) or [QUICKSTART.md](../QUICKSTART.md).
