from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database

app = FastAPI(title="Finance Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    database.init_db()


@app.get("/health")
def health_check():
    return {"status": "ok"}
