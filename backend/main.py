from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import httpx
import database
import auth
import csv_processor
import categorizer

ollama_available = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ollama_available
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("http://localhost:11434", timeout=3.0)
            ollama_available = resp.status_code < 500
    except Exception:
        ollama_available = False
    database.init_db()
    yield


app = FastAPI(title="Finance Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ollama_guard(request: Request, call_next):
    if not ollama_available and request.url.path != "/health":
        return JSONResponse({"detail": "Ollama not available"}, status_code=503)
    return await call_next(request)


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


# Simple in-memory upload status store
upload_status: dict = {"state": "idle", "message": "", "saved": 0, "duplicates": 0}

# In-memory Q&A session
qa_session: dict = {"queue": [], "index": 0, "auto_categorized": 0, "answered": 0}


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...), institution: str = Form("Unknown")):
    global upload_status
    upload_status = {"state": "processing", "message": "Analyzing your file...", "saved": 0, "duplicates": 0}

    file_bytes = await file.read()

    # File size check (50MB)
    if len(file_bytes) > 50 * 1024 * 1024:
        upload_status = {"state": "error", "message": "File exceeds the 50MB limit. Try splitting into smaller exports.", "saved": 0, "duplicates": 0}
        raise HTTPException(status_code=400, detail="file_too_large")

    try:
        result = csv_processor.process_csv(file_bytes, institution)

        # After saving transactions, kick off categorization
        auto_from_rules = categorizer.apply_rules_precheck()
        cat_result = categorizer.run_ollama_categorization()
        global qa_session
        qa_session = {
            "queue": cat_result["qa_queue"],
            "index": 0,
            "auto_categorized": auto_from_rules + cat_result["auto_categorized"],
            "answered": 0
        }

        upload_status = {
            "state": "complete",
            "message": f"Done! Saved {result['saved']} transactions.",
            "saved": result["saved"],
            "duplicates": result["duplicates"]
        }
        return upload_status
    except ValueError as e:
        err = str(e)
        messages = {
            "empty": "That file appears to be empty. Please try re-downloading it from your bank.",
            "garbled": "That file has encoding or formatting issues. Try re-downloading from your bank.",
            "missing_columns": "Some required columns are missing. Is this a bank transaction export?",
            "unrecognized": "I couldn't recognize this file format. Is it a CSV export from your bank?",
        }
        msg = messages.get(err.split(":")[0], f"Upload failed: {err}")
        upload_status = {"state": "error", "message": msg, "saved": 0, "duplicates": 0}
        raise HTTPException(status_code=422, detail=msg)


@app.get("/upload/status")
def get_upload_status():
    return upload_status


@app.post("/categorize/start")
def start_categorization():
    """Called after upload completes. Runs rules precheck + Ollama pass."""
    global qa_session
    auto_from_rules = categorizer.apply_rules_precheck()
    result = categorizer.run_ollama_categorization()
    qa_session = {
        "queue": result["qa_queue"],
        "index": 0,
        "auto_categorized": auto_from_rules + result["auto_categorized"],
        "answered": 0
    }
    return {
        "auto_categorized": qa_session["auto_categorized"],
        "qa_count": len(qa_session["queue"])
    }


@app.get("/qa/next")
def qa_next():
    if qa_session["index"] >= len(qa_session["queue"]):
        total_categorized = database.Transaction.select().where(database.Transaction.categorized == True).count()
        total = database.Transaction.select().count()
        return {"done": True, "categorized": total_categorized, "total": total}

    card = qa_session["queue"][qa_session["index"]]
    return {"done": False, "card": card, "progress": {"current": qa_session["index"] + 1, "total": len(qa_session["queue"])}}


@app.post("/qa/answer")
def qa_answer(body: dict):
    """
    body: { transaction_id, merchant, category, apply_to_similar: bool }
    """
    txn_id = body["transaction_id"]
    merchant = body["merchant"]
    category = body["category"]

    database.Transaction.update(
        merchant=merchant,
        category=category,
        categorized=True
    ).where(database.Transaction.id == txn_id).execute()

    qa_session["answered"] += 1

    # Check for similar vendor strings (same raw merchant, uncategorized)
    txn = database.Transaction.get_by_id(txn_id)
    similar = database.Transaction.select().where(
        (database.Transaction.merchant_raw == txn.merchant_raw) &
        (database.Transaction.id != txn_id) &
        (database.Transaction.categorized == False)
    )
    similar_count = similar.count()

    # Write or update categorization rule
    existing_rule = database.CategorizationRule.get_or_none(
        database.CategorizationRule.vendor_pattern == txn.merchant_raw.upper()
    )
    if existing_rule:
        existing_rule.merchant_name = merchant
        existing_rule.category = category
        existing_rule.times_applied += 1
        existing_rule.save()
    else:
        database.CategorizationRule.create(
            vendor_pattern=txn.merchant_raw.upper(),
            merchant_name=merchant,
            category=category,
            confidence="high",
            times_applied=1
        )

    # Advance queue
    qa_session["index"] += 1

    return {
        "ok": True,
        "similar_count": similar_count,
        "similar_merchant_raw": txn.merchant_raw if similar_count > 0 else None
    }


@app.post("/qa/bulk-apply")
def qa_bulk_apply(body: dict):
    """Apply merchant+category to all transactions with same merchant_raw."""
    merchant_raw = body["merchant_raw"]
    merchant = body["merchant"]
    category = body["category"]

    count = database.Transaction.update(
        merchant=merchant,
        category=category,
        categorized=True
    ).where(
        (database.Transaction.merchant_raw == merchant_raw) &
        (database.Transaction.categorized == False)
    ).execute()

    return {"updated": count}
