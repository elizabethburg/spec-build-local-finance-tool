#!/bin/bash
# Start the finance dashboard — backend + frontend + browser

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Trap Ctrl+C and kill both servers cleanly
cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Done. Goodbye!"
  exit 0
}
trap cleanup INT TERM

echo "Starting FastAPI backend on http://localhost:8000 ..."
cd "$ROOT/backend"
.venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Vite frontend on http://localhost:5173 ..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend PID:  $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Waiting for servers to start..."
sleep 2

echo "Opening browser at http://localhost:5173 ..."
open "http://localhost:5173"

echo ""
echo "Finance Dashboard is running."
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

wait
