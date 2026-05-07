#!/bin/bash
# Vantage — Start
# Double-click this file, or call it from an Apple Shortcut via "Run Shell Script"

VANTAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$HOME/.vantage.pid"

# ── Load runtimes ────────────────────────────────────────────────────────────
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

# ── Kill any previous instance ───────────────────────────────────────────────
if [ -f "$PID_FILE" ]; then
    while IFS= read -r pid; do
        kill "$pid" 2>/dev/null
    done < "$PID_FILE"
    rm -f "$PID_FILE"
    sleep 1
fi

# ── Start backend ────────────────────────────────────────────────────────────
cd "$VANTAGE_DIR/backend"
uv run uvicorn main:app --port 8000 >> /tmp/vantage-backend.log 2>&1 &
echo $! >> "$PID_FILE"

# ── Start frontend ───────────────────────────────────────────────────────────
cd "$VANTAGE_DIR/frontend"
npm run dev >> /tmp/vantage-frontend.log 2>&1 &
echo $! >> "$PID_FILE"

# ── Open browser once frontend is ready ──────────────────────────────────────
echo "Starting Vantage — waiting for servers..."
for i in {1..15}; do
    sleep 1
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        open http://localhost:5173
        echo "Vantage is running at http://localhost:5173"
        exit 0
    fi
done

# Fallback: open anyway after 15s
open http://localhost:5173
echo "Vantage started (browser opened). Logs: /tmp/vantage-backend.log  /tmp/vantage-frontend.log"
