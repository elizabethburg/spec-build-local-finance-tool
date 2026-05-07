#!/bin/bash
# Start both backend and frontend dev servers

export PATH="$HOME/.local/bin:$PATH"

echo "Starting Vantage V2..."
echo ""

# Backend
cd "$(dirname "$0")/backend"
uv run uvicorn main:app --port 8000 --reload &
BACKEND_PID=$!
echo "Backend started (PID $BACKEND_PID) → http://localhost:8000"

# Frontend
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend started (PID $FRONTEND_PID) → http://localhost:5173"

echo ""
echo "Vantage is running. Open http://localhost:5173 in your browser."
echo "Press Ctrl+C to stop both servers."

wait
