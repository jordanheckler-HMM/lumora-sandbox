#!/bin/bash
set -e

echo "🔧 Building backend executable with PyInstaller..."

# Check if PyInstaller is installed
if ! command -v pyinstaller &> /dev/null
then
    echo "📦 PyInstaller not found. Installing..."
    pip install pyinstaller
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build dist

# Build the executable
echo "🏗️  Building executable..."
pyinstaller \
    --name backend-server \
    --onefile \
    --clean \
    --noconfirm \
    --add-data "tools_router.py:." \
    main.py

# Check if build was successful
if [ -f "dist/backend-server" ]; then
    echo "✅ Backend executable built successfully!"
    echo "📍 Location: $SCRIPT_DIR/dist/backend-server"
    
    # Copy to frontend src-tauri binaries directory
    TAURI_BIN_DIR="$SCRIPT_DIR/../frontend/src-tauri/binaries"
    mkdir -p "$TAURI_BIN_DIR"
    
    # Copy and rename based on platform
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        cp "dist/backend-server" "$TAURI_BIN_DIR/backend-server-aarch64-apple-darwin"
        cp "dist/backend-server" "$TAURI_BIN_DIR/backend-server-x86_64-apple-darwin"
        chmod +x "$TAURI_BIN_DIR/backend-server-aarch64-apple-darwin"
        chmod +x "$TAURI_BIN_DIR/backend-server-x86_64-apple-darwin"
        echo "✅ Copied to Tauri binaries directory (macOS variants)"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        cp "dist/backend-server" "$TAURI_BIN_DIR/backend-server-x86_64-unknown-linux-gnu"
        chmod +x "$TAURI_BIN_DIR/backend-server-x86_64-unknown-linux-gnu"
        echo "✅ Copied to Tauri binaries directory (Linux)"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        cp "dist/backend-server.exe" "$TAURI_BIN_DIR/backend-server-x86_64-pc-windows-msvc.exe"
        echo "✅ Copied to Tauri binaries directory (Windows)"
    else
        echo "⚠️  Unknown OS type: $OSTYPE"
        echo "Please manually copy dist/backend-server to frontend/src-tauri/binaries/"
    fi
    
    echo ""
    echo "🎉 Backend is ready for Tauri bundling!"
else
    echo "❌ Build failed! Check the output above for errors."
    exit 1
fi
