from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models  # registers all ORM models with Base

from routers import auth, accounts, uploads, transactions, dashboard, qa, settings

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vantage API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(uploads.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)
app.include_router(qa.router)
app.include_router(settings.router)


@app.get("/")
def root():
    return {"service": "Vantage API", "version": "2.0.0"}
