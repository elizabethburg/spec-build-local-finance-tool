# Vantage — Local Finance Dashboard

A local-first personal finance dashboard with AI-powered insights. Upload CSV exports from your bank, let the AI categorize transactions, and get a clear view of your spending — all without your data ever leaving your machine.

**Stack:** React 19 + TypeScript + Vite (frontend) · FastAPI + SQLAlchemy + SQLite (backend) · Ollama for local AI

---

## About This Repo

This repo exists to document growth, not just ship a product.

**`v1-original` branch** — built iteratively without a written spec. Features were added one at a time, each commit solving the immediate problem in front of me. The result works, but the architecture shows the seams of decisions made without a full picture.

**`main` branch (you're here)** — a complete rebuild driven by a written spec ([`vantage-spec.md`](../vantage-spec.md)). Before writing any code, the full data model, API surface, and UI were defined. The build followed the spec step by step.

Comparing the two branches shows the concrete difference that upfront design makes: fewer workarounds, cleaner separation of concerns, and a codebase that's easier to navigate.

---

## Prerequisites

- **Ollama** — [install](https://ollama.com) and run `ollama serve`, then pull a model:
  ```bash
  ollama pull llama3.2
  ```
- **Python 3.13+** with [uv](https://docs.astral.sh/uv/getting-started/installation/) for the backend
- **Node.js 18+** for the frontend — install via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org)

---

## Quick Start

```bash
git clone https://github.com/elizabethburg/spec-build-local-finance-tool.git
cd spec-build-local-finance-tool
./start.sh
```

Then open **http://localhost:5173** in your browser.

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs

`start.sh` starts both servers and keeps them running together. Press `Ctrl+C` to stop both.

---

## First-Time Setup

1. Create an account on the Setup page (local only — no external auth)
2. Go to **Accounts** and add your bank accounts
3. Go to **Upload** and import a CSV export from your bank
4. The AI will prompt you to review and confirm transaction categories
5. Your **Dashboard** will populate once categories are confirmed

---

## Manual Start (development)

**Backend:**
```bash
cd backend
uv run uvicorn main:app --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
vantage/
├── backend/
│   ├── main.py          # FastAPI app + router registration
│   ├── database.py      # SQLAlchemy engine + session
│   ├── models/          # ORM models (9 tables)
│   ├── routers/         # API routes (auth, accounts, transactions, dashboard, uploads, qa, settings)
│   ├── services/        # Business logic (ollama, csv, categorizer, net_worth, insight)
│   ├── schemas/         # Pydantic request/response models
│   └── migrations/      # Alembic migration history
└── frontend/
    └── src/
        └── pages/       # 8 pages (Login, Setup, Dashboard, Accounts, Transactions, Upload, QA, Settings)
```
