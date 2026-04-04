from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import database
import auth

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


@app.get("/auth/status")
def auth_status():
    try:
        row = database.Settings.get(database.Settings.key == "setup_complete")
        return {"setup_complete": row.value == "true"}
    except database.Settings.DoesNotExist:
        return {"setup_complete": False}


@app.post("/auth/setup")
def auth_setup(body: dict):
    if body["pin"] != body["confirm_pin"]:
        raise HTTPException(status_code=400, detail="PINs do not match")
    pin_hash = auth.hash_pin(body["pin"])
    phrase = auth.generate_recovery_phrase()
    phrase_hash = auth.hash_phrase(phrase)
    database.Settings.replace(key="user_name", value=body["name"]).execute()
    database.Settings.replace(key="pin_hash", value=pin_hash).execute()
    database.Settings.replace(key="recovery_phrase_hash", value=phrase_hash).execute()
    database.Settings.replace(key="setup_complete", value="true").execute()
    database.Settings.replace(key="insight_mode", value="new_only").execute()
    token = auth.generate_session_token()
    return {"recovery_phrase": phrase, "session_token": token}


@app.post("/auth/unlock")
def auth_unlock(body: dict):
    try:
        row = database.Settings.get(database.Settings.key == "pin_hash")
    except database.Settings.DoesNotExist:
        raise HTTPException(status_code=400, detail="Not set up")
    if not auth.verify_pin(body["pin"], row.value):
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    token = auth.generate_session_token()
    return {"session_token": token}


@app.post("/auth/change-pin")
def auth_change_pin(body: dict):
    if body["new_pin"] != body["confirm_new_pin"]:
        raise HTTPException(status_code=400, detail="New PINs do not match")
    try:
        row = database.Settings.get(database.Settings.key == "pin_hash")
    except database.Settings.DoesNotExist:
        raise HTTPException(status_code=400, detail="Not set up")
    if not auth.verify_pin(body["current_pin"], row.value):
        raise HTTPException(status_code=401, detail="Incorrect current PIN")
    database.Settings.replace(key="pin_hash", value=auth.hash_pin(body["new_pin"])).execute()
    return {"ok": True}


@app.post("/auth/reset")
def auth_reset(body: dict):
    if body["new_pin"] != body["confirm_new_pin"]:
        raise HTTPException(status_code=400, detail="PINs do not match")
    try:
        row = database.Settings.get(database.Settings.key == "recovery_phrase_hash")
    except database.Settings.DoesNotExist:
        raise HTTPException(status_code=400, detail="No recovery phrase set")
    if not auth.verify_phrase(body["recovery_phrase"], row.value):
        raise HTTPException(status_code=401, detail="Incorrect recovery phrase")
    database.Settings.replace(key="pin_hash", value=auth.hash_pin(body["new_pin"])).execute()
    return {"ok": True}


@app.get("/status")
def app_status():
    count = database.Transaction.select().count()
    return {"has_transactions": count > 0}
