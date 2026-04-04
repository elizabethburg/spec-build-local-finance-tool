#!/bin/bash
# Start both the backend and frontend dev servers

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting FastAPI backend on http://localhost:8000 ..."
cd "$ROOT/backend"
.venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Vite frontend on http://localhost:5173 ..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers."

wait
