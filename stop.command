#!/bin/bash
# Vantage — Stop
# Double-click this file, or call it from an Apple Shortcut via "Run Shell Script"

PID_FILE="$HOME/.vantage.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "Vantage is not running (no PID file found)."
    exit 0
fi

echo "Stopping Vantage..."
while IFS= read -r pid; do
    if kill "$pid" 2>/dev/null; then
        echo "  Stopped PID $pid"
    fi
done < "$PID_FILE"

rm -f "$PID_FILE"

# Belt-and-suspenders: kill anything still holding the ports
lsof -ti :8000 | xargs kill 2>/dev/null
lsof -ti :5173 | xargs kill 2>/dev/null

echo "Vantage stopped."
