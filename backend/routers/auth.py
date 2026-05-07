from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.settings import Settings
from pydantic import BaseModel
import hashlib
import secrets
import json

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_TOKENS: set[str] = set()


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()


def generate_recovery_phrase() -> list[str]:
    words = [
        "apple", "bridge", "cloud", "delta", "eagle", "forest",
        "garden", "harbor", "island", "jungle", "kettle", "lemon",
        "maple", "north", "ocean", "pepper", "quiet", "river",
        "silver", "tower", "unity", "valley", "winter", "yellow",
    ]
    return [secrets.choice(words) for _ in range(6)]


class SetupRequest(BaseModel):
    name: str
    pin: str


class UnlockRequest(BaseModel):
    pin: str


class ChangePinRequest(BaseModel):
    current_pin: str
    new_pin: str


@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    setup = db.query(Settings).filter(Settings.key == "setup_complete").first()
    return {
        "setup_complete": setup is not None and setup.value == "true",
        "locked": True,
    }


@router.post("/setup")
def setup(req: SetupRequest, db: Session = Depends(get_db)):
    existing = db.query(Settings).filter(Settings.key == "setup_complete").first()
    if existing and existing.value == "true":
        raise HTTPException(400, "Already set up")

    phrase = generate_recovery_phrase()

    records = [
        Settings(key="setup_complete", value="true"),
        Settings(key="user_name", value=req.name),
        Settings(key="pin_hash", value=hash_pin(req.pin)),
        Settings(key="recovery_phrase_hash", value=hash_pin(" ".join(phrase))),
    ]
    for r in records:
        existing = db.query(Settings).filter(Settings.key == r.key).first()
        if existing:
            existing.value = r.value
        else:
            db.add(r)
    db.commit()

    token = secrets.token_urlsafe(32)
    SESSION_TOKENS.add(token)

    return {"session_token": token, "recovery_phrase": phrase}


@router.post("/unlock")
def unlock(req: UnlockRequest, db: Session = Depends(get_db)):
    pin_setting = db.query(Settings).filter(Settings.key == "pin_hash").first()
    if not pin_setting or pin_setting.value != hash_pin(req.pin):
        raise HTTPException(401, "Invalid PIN")

    token = secrets.token_urlsafe(32)
    SESSION_TOKENS.add(token)
    return {"session_token": token}


@router.post("/change-pin")
def change_pin(req: ChangePinRequest, db: Session = Depends(get_db)):
    pin_setting = db.query(Settings).filter(Settings.key == "pin_hash").first()
    if not pin_setting or pin_setting.value != hash_pin(req.current_pin):
        raise HTTPException(401, "Current PIN is incorrect")
    pin_setting.value = hash_pin(req.new_pin)
    db.commit()
    return {"ok": True}
