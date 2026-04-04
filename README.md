# Local Finance Dashboard

A local-first personal finance dashboard built with React + Vite (frontend) and FastAPI + SQLite (backend).

## Quick Start

```bash
./start.sh
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

## Development

### Backend

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm run dev
```

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, React Router v7
- **Backend**: FastAPI, Uvicorn, Peewee ORM, SQLite
