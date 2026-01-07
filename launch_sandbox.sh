#!/bin/bash

# Absolute path to your LUMORA Sandbox folder
APP_DIR="$HOME/lumora-sandbox"

###
### START BACKEND (new Terminal window)
###
osascript <<END
tell application "Terminal"
    do script "cd \"$APP_DIR/backend\"; source venv/bin/activate; uvicorn main:app --reload --port 8000"
end tell
END

###
### START FRONTEND (new Terminal window)
###
osascript <<END
tell application "Terminal"
    do script "cd \"$APP_DIR/frontend\"; npm run dev"
end tell
END

echo "LUMORA Sandbox backend + frontend launched in separate Terminal windows."
