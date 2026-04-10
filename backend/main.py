from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import httpx
import json
import database
from database import Insight, Settings, Transaction, Institution, CategorizationRule, SplitItem
import auth
import csv_processor
import categorizer
import insights as insights_module

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
    global ollama_available
    if request.url.path == "/health":
        return await call_next(request)
    if not ollama_available:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get("http://localhost:11434", timeout=2.0)
                ollama_available = resp.status_code < 500
        except Exception:
            ollama_available = False
    if not ollama_available:
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



@app.get("/status")
def app_status():
    count = database.Transaction.select().count()
    return {"has_transactions": count > 0}


@app.get("/dashboard")
def get_dashboard(period: str = "30d"):
    from datetime import date, timedelta
    from collections import defaultdict

    today = date.today()
    end = None  # upper bound for the period (None = no upper limit)

    if period == "30d":
        start = today - timedelta(days=30)
        prev_start = today - timedelta(days=60)
        prev_end = today - timedelta(days=30)
    elif period == "3m":
        start = today - timedelta(days=90)
        prev_start = today - timedelta(days=180)
        prev_end = today - timedelta(days=90)
    elif period == "this_month":
        start = today.replace(day=1)
        prev_start = (start - timedelta(days=1)).replace(day=1)
        prev_end = start
    elif period == "same_month_ly":
        # Same calendar month, one year ago
        start = today.replace(year=today.year - 1, day=1)
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
        prev_start = None
        prev_end = None
    else:  # "all"
        start = date(2000, 1, 1)
        prev_start = None
        prev_end = None

    period_filter = (database.Transaction.date >= start) & database.Transaction.parent_id.is_null(True)
    if end:
        period_filter = period_filter & (database.Transaction.date < end)
    current_txns = list(database.Transaction.select().where(period_filter))

    # Total spent (debits only)
    total_spent = sum(float(t.amount) for t in current_txns if t.type == "debit")

    # Categories current
    cat_map = {}
    for t in current_txns:
        if t.type == "debit" and t.category:
            cat_map[t.category] = cat_map.get(t.category, 0) + float(t.amount)
    categories_current = [{"name": k, "amount": round(v, 2)} for k, v in sorted(cat_map.items(), key=lambda x: -x[1])]

    # Categories previous (for comparison layer)
    categories_previous = None
    if prev_start and prev_end:
        prev_txns = list(database.Transaction.select().where(
            (database.Transaction.date >= prev_start) & (database.Transaction.date < prev_end) & database.Transaction.parent_id.is_null(True)
        ))
        prev_cat_map = {}
        for t in prev_txns:
            if t.type == "debit" and t.category:
                prev_cat_map[t.category] = prev_cat_map.get(t.category, 0) + float(t.amount)
        categories_previous = [{"name": k, "amount": round(v, 2)} for k, v in prev_cat_map.items()]

    # Area chart: monthly income vs expenses
    # Use YYYY-MM as sort key, display as "Mon YYYY"
    monthly = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "sort_key": ""})
    for t in current_txns:
        if hasattr(t.date, 'strftime'):
            sort_key = t.date.strftime("%Y-%m")
            display = t.date.strftime("%b %Y")
        else:
            sort_key = str(t.date)[:7]
            display = str(t.date)[:7]
        if sort_key not in monthly:
            monthly[sort_key]["sort_key"] = sort_key
            monthly[sort_key]["display"] = display
        if t.type == "credit":
            monthly[sort_key]["income"] += float(t.amount)
        else:
            monthly[sort_key]["expenses"] += float(t.amount)

    area_chart = [
        {"month": v.get("display", k), "income": round(v["income"], 2), "expenses": round(v["expenses"], 2)}
        for k, v in sorted(monthly.items())
    ]

    # Total income (credits in period)
    total_income = sum(float(t.amount) for t in current_txns if t.type == "credit")

    # Daily cashflow: income (positive) and expenses (positive) per day
    daily_income_map = defaultdict(float)
    daily_expense_map = defaultdict(float)
    daily_category_map = defaultdict(lambda: defaultdict(float))
    for t in current_txns:
        day_key = str(t.date) if hasattr(t.date, 'strftime') else str(t.date)[:10]
        if t.type == "credit":
            daily_income_map[day_key] += float(t.amount)
        else:
            daily_expense_map[day_key] += float(t.amount)
            if t.category:
                daily_category_map[day_key][t.category] += float(t.amount)

    all_days = sorted(set(list(daily_income_map.keys()) + list(daily_expense_map.keys())))
    daily_cashflow = [
        {
            "date": day,
            "income": round(daily_income_map[day], 2),
            "expenses": round(daily_expense_map[day], 2),
            "by_category": {k: round(v, 2) for k, v in daily_category_map[day].items()},
        }
        for day in all_days
    ]

    # Global category max across all time — pins Y-axis so periods are visually comparable
    all_txns = list(database.Transaction.select().where(database.Transaction.parent_id.is_null(True)))
    global_cat = {}
    for t in all_txns:
        if t.type == "debit" and t.category:
            global_cat[t.category] = global_cat.get(t.category, 0) + float(t.amount)
    global_category_max = round(max(global_cat.values()), 2) if global_cat else None

    return {
        "total_spent": round(total_spent, 2),
        "total_income": round(total_income, 2),
        "categories_current": categories_current,
        "categories_previous": categories_previous,
        "daily_cashflow": daily_cashflow,
        "global_category_max": global_category_max,
    }


# Simple in-memory upload status store
upload_status: dict = {"state": "idle", "message": "", "saved": 0, "duplicates": 0}

# Q&A session is now persisted to database, but keep in-memory cache for current session
# This is populated on upload and read from /qa/next
qa_session: dict = {
    "queue": [],
    "index": 0,
    "auto_categorized": 0,
    "answered": 0,
    "total_in_session": 0,
    "flagged_count": 0
}

def _load_qa_session():
    """Load Q&A session from settings table."""
    try:
        setting = database.Settings.get(database.Settings.key == "qa_session")
        session_data = json.loads(setting.value)
        return session_data
    except (database.Settings.DoesNotExist, json.JSONDecodeError):
        return {"queue": [], "index": 0, "auto_categorized": 0, "answered": 0, "total_in_session": 0, "flagged_count": 0}

def _save_qa_session(session: dict):
    """Save Q&A session to settings table."""
    try:
        setting = database.Settings.get(database.Settings.key == "qa_session")
        setting.value = json.dumps(session)
        setting.save()
    except database.Settings.DoesNotExist:
        database.Settings.create(key="qa_session", value=json.dumps(session))


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
        total_in_session = auto_from_rules + cat_result["auto_categorized"] + len(cat_result["qa_queue"])
        qa_session = {
            "queue": cat_result["qa_queue"],
            "index": 0,
            "auto_categorized": auto_from_rules + cat_result["auto_categorized"],
            "answered": 0,
            "total_in_session": total_in_session,
            "flagged_count": len([q for q in cat_result["qa_queue"] if q.get("type") == "ambiguous_category"])
        }
        # Persist to database so it survives server restarts
        _save_qa_session(qa_session)

        upload_status = {
            "state": "complete",
            "message": f"Done! Saved {result['saved']} transactions.",
            "saved": result["saved"],
            "duplicates": result["duplicates"]
        }

        # Generate insight in background (non-blocking)
        try:
            insights_module.generate_insight()
        except Exception:
            pass  # Don't fail the upload if insight generation fails

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


@app.get("/insight")
def get_insight():
    # Get the most recent unseen insight, or most recent overall
    latest = Insight.select().order_by(Insight.generated_at.desc()).first()
    if not latest or not latest.text:
        return {"text": None, "seen": True}

    # Check insight mode setting
    try:
        mode_row = database.Settings.get(database.Settings.key == "insight_mode")
        insight_mode = mode_row.value
    except database.Settings.DoesNotExist:
        insight_mode = "new_only"

    if insight_mode == "always" or not latest.seen:
        return {"text": latest.text, "seen": latest.seen, "id": latest.id}
    return {"text": None, "seen": True}


@app.post("/insight/dismiss")
def dismiss_insight():
    latest = Insight.select().order_by(Insight.generated_at.desc()).first()
    if latest:
        latest.seen = True
        latest.save()
    return {"ok": True}


@app.post("/categorize/start")
def start_categorization():
    """Called after upload completes. Runs rules precheck + Ollama pass."""
    global qa_session
    auto_from_rules = categorizer.apply_rules_precheck()
    result = categorizer.run_ollama_categorization()
    total_in_session = auto_from_rules + result["auto_categorized"] + len(result["qa_queue"])
    qa_session = {
        "queue": result["qa_queue"],
        "index": 0,
        "auto_categorized": auto_from_rules + result["auto_categorized"],
        "answered": 0,
        "total_in_session": total_in_session,
        "flagged_count": len([q for q in result["qa_queue"] if q.get("type") == "ambiguous_category"])
    }
    # Persist to database so it survives server restarts
    _save_qa_session(qa_session)
    return {
        "auto_categorized": qa_session["auto_categorized"],
        "qa_count": len(qa_session["queue"])
    }


@app.get("/qa/next")
def qa_next():
    global qa_session
    # Reload from database in case of server restart
    db_session = _load_qa_session()
    if db_session["queue"]:
        qa_session = db_session

    # Skip already-categorized transactions in the queue
    queue_len = len(qa_session["queue"])
    start_index = qa_session["index"]
    while qa_session["index"] < queue_len:
        card = qa_session["queue"][qa_session["index"]]
        txn = database.Transaction.get_by_id(card["id"])
        if txn.categorized == False:
            break
        qa_session["index"] += 1

    # Sync updated index back to database
    _save_qa_session(qa_session)

    if qa_session["index"] >= queue_len:
        # Return counts from this session, not entire database
        return {
            "done": True,
            "categorized": qa_session["auto_categorized"] + qa_session["answered"],
            "total": qa_session["total_in_session"],
            "flagged": qa_session["flagged_count"]
        }

    card = qa_session["queue"][qa_session["index"]]
    return {"done": False, "card": card, "progress": {"current": qa_session["index"] + 1, "total": queue_len}}


@app.post("/qa/answer")
def qa_answer(body: dict):
    """
    body: { transaction_id, merchant, category, apply_to_similar: bool }
    """
    global qa_session
    # Reload from database in case of server restart
    db_session = _load_qa_session()
    if db_session["queue"]:
        qa_session = db_session

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

    # Write or update categorization rule with pattern extraction
    from categorizer import _extract_vendor_pattern
    vendor_pattern = _extract_vendor_pattern(txn.merchant_raw)
    existing_rule = database.CategorizationRule.get_or_none(
        database.CategorizationRule.vendor_pattern == vendor_pattern
    )
    if existing_rule:
        existing_rule.merchant_name = merchant
        existing_rule.category = category
        existing_rule.times_applied += 1
        existing_rule.save()
    else:
        database.CategorizationRule.create(
            vendor_pattern=vendor_pattern,
            merchant_name=merchant,
            category=category,
            confidence="high",
            times_applied=1
        )

    # Advance queue
    qa_session["index"] += 1

    # Persist updated session to database
    _save_qa_session(qa_session)

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


@app.get("/transactions")
def get_transactions():
    txns = list(Transaction.select().order_by(Transaction.date.desc()))
    result = []
    for t in txns:
        result.append({
            "id": t.id,
            "date": str(t.date),
            "merchant_raw": t.merchant_raw,
            "merchant": t.merchant or t.merchant_raw,
            "category": t.category or "Uncategorized",
            "amount": float(t.amount),
            "type": t.type,
            "institution": t.institution,
            "is_split": t.is_split,
            "parent_id": t.parent_id,
            "categorized": t.categorized,
        })
    return result


@app.patch("/transactions/bulk-category")
def bulk_update_category(body: dict):
    # body: { merchant_raw, category }
    count = Transaction.update(
        category=body["category"],
        categorized=True
    ).where(
        (Transaction.merchant_raw == body["merchant_raw"]) &
        (Transaction.category != body["category"])
    ).execute()

    # Write/update rule with pattern extraction
    from categorizer import _extract_vendor_pattern
    vendor_pattern = _extract_vendor_pattern(body["merchant_raw"])
    existing = CategorizationRule.get_or_none(
        CategorizationRule.vendor_pattern == vendor_pattern
    )
    if existing:
        existing.category = body["category"]
        existing.times_applied += 1
        existing.save()
    else:
        CategorizationRule.create(
            vendor_pattern=vendor_pattern,
            merchant_name=body.get("merchant", body["merchant_raw"]),
            category=body["category"],
            confidence="high",
            times_applied=1
        )

    return {"updated": count}


@app.patch("/transactions/{txn_id}/category")
def update_category(txn_id: int, body: dict):
    # body: { category }
    try:
        t = Transaction.get_by_id(txn_id)
    except Transaction.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")

    old_merchant_raw = t.merchant_raw
    Transaction.update(category=body["category"], categorized=True).where(Transaction.id == txn_id).execute()

    # Count similar uncategorized OR differently-categorized transactions with same merchant_raw
    similar = Transaction.select().where(
        (Transaction.merchant_raw == old_merchant_raw) &
        (Transaction.id != txn_id) &
        (Transaction.category != body["category"])
    )
    similar_count = similar.count()

    return {"ok": True, "similar_count": similar_count, "merchant_raw": old_merchant_raw}


@app.get("/transactions/{txn_id}")
def get_transaction(txn_id: int):
    try:
        t = Transaction.get_by_id(txn_id)
    except Transaction.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")
    splits = list(Transaction.select().where(Transaction.parent_id == txn_id))
    return {
        "id": t.id,
        "date": str(t.date),
        "merchant_raw": t.merchant_raw,
        "merchant": t.merchant or t.merchant_raw,
        "category": t.category or "Uncategorized",
        "amount": float(t.amount),
        "type": t.type,
        "institution": t.institution,
        "is_split": t.is_split,
        "parent_id": t.parent_id,
        "notes": t.notes,
        "tags": t.tags,
        "reconciled": t.reconciled,
        "splits": [{"id": s.id, "category": s.category, "amount": float(s.amount)} for s in splits],
    }


@app.patch("/transactions/{txn_id}")
def update_transaction(txn_id: int, body: dict):
    try:
        t = Transaction.get_by_id(txn_id)
    except Transaction.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")

    updates = {}
    if "date" in body: updates["date"] = body["date"]
    if "merchant" in body: updates["merchant"] = body["merchant"]
    if "category" in body: updates["category"] = body["category"]
    if "amount" in body: updates["amount"] = body["amount"]
    if "notes" in body: updates["notes"] = body["notes"]
    if "tags" in body: updates["tags"] = body["tags"]
    if "reconciled" in body: updates["reconciled"] = body["reconciled"]

    if updates:
        Transaction.update(**updates).where(Transaction.id == txn_id).execute()

    return {"ok": True}


@app.post("/transactions/{txn_id}/splits")
def create_splits(txn_id: int, body: dict):
    # body: { splits: [{ category, amount }] }
    try:
        t = Transaction.get_by_id(txn_id)
    except Transaction.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")

    splits = body.get("splits", [])
    total = sum(float(s["amount"]) for s in splits)

    if abs(total - float(t.amount)) > 0.01:
        raise HTTPException(status_code=400, detail=f"Splits must sum to ${float(t.amount):.2f}. Current total: ${total:.2f}")

    # Clear existing splits if any
    SplitItem.delete().where(SplitItem.transaction_id == txn_id).execute()
    Transaction.delete().where(Transaction.parent_id == txn_id).execute()

    # Create new split items
    for s in splits:
        SplitItem.create(transaction_id=txn_id, category=s["category"], amount=s["amount"])
        # Also create child transaction rows for the list view
        Transaction.create(
            date=t.date,
            merchant_raw=t.merchant_raw,
            merchant=t.merchant,
            category=s["category"],
            amount=s["amount"],
            type=t.type,
            institution=t.institution,
            is_split=False,
            parent_id=txn_id,
            categorized=True,
            notes=None,
            tags=None,
            reconciled=False,
        )

    # Mark parent as split
    Transaction.update(is_split=True).where(Transaction.id == txn_id).execute()

    return {"ok": True, "split_count": len(splits)}


@app.get("/transactions/{txn_id}/splits")
def get_splits(txn_id: int):
    splits = list(SplitItem.select().where(SplitItem.transaction_id == txn_id))
    return [{"id": s.id, "category": s.category, "amount": float(s.amount)} for s in splits]


@app.get("/institutions")
def get_institutions():
    insts = list(Institution.select())
    return [{"id": i.id, "name_raw": i.name_raw, "name_display": i.name_display} for i in insts]


@app.patch("/institutions/{inst_id}/name")
def rename_institution(inst_id: int, body: dict):
    try:
        inst = Institution.get_by_id(inst_id)
    except Institution.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")
    inst.name_display = body["name"]
    inst.save()
    return {"ok": True}


@app.get("/settings")
def get_settings():
    rows = list(database.Settings.select())
    return {r.key: r.value for r in rows}


@app.patch("/settings/name")
def update_settings_name(body: dict):
    database.Settings.replace(key="user_name", value=body["name"]).execute()
    return {"ok": True}


@app.patch("/settings/insight-mode")
def update_insight_mode(body: dict):
    mode = body["mode"]
    if mode not in ("always", "new_only"):
        raise HTTPException(status_code=400, detail="mode must be 'always' or 'new_only'")
    database.Settings.replace(key="insight_mode", value=mode).execute()
    return {"ok": True}


@app.get("/categories")
def get_categories():
    """Return all distinct categories in use, merged with the default list."""
    DEFAULT = [
        "Groceries", "Dining & Bars", "Coffee & Cafes", "Transportation",
        "Gas & Fuel", "Travel & Hotels", "Shopping & Retail", "General Household",
        "Entertainment", "Health & Medical", "Subscriptions", "Utilities & Bills",
        "Income", "Transfer", "Other"
    ]
    from_txns = [
        t.category for t in Transaction.select(Transaction.category).where(
            Transaction.category.is_null(False)
        ).distinct()
    ]
    merged = list(dict.fromkeys(DEFAULT + from_txns))  # dedupe, preserve order
    return merged


@app.get("/rules")
def get_rules():
    rules = list(database.CategorizationRule.select())
    return [
        {
            "id": r.id,
            "vendor_pattern": r.vendor_pattern,
            "merchant_name": r.merchant_name,
            "category": r.category,
            "confidence": r.confidence,
            "times_applied": r.times_applied,
        }
        for r in rules
    ]


@app.patch("/rules/{rule_id}")
def update_rule(rule_id: int, body: dict):
    try:
        rule = database.CategorizationRule.get_by_id(rule_id)
    except database.CategorizationRule.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")
    if "vendor_pattern" in body:
        rule.vendor_pattern = body["vendor_pattern"]
    if "merchant_name" in body:
        rule.merchant_name = body["merchant_name"]
    if "category" in body:
        rule.category = body["category"]
    rule.save()
    return {"ok": True}


@app.delete("/rules/{rule_id}")
def delete_rule(rule_id: int):
    try:
        rule = database.CategorizationRule.get_by_id(rule_id)
    except database.CategorizationRule.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")
    rule.delete_instance()
    return {"ok": True}


@app.delete("/transactions/{txn_id}")
def delete_transaction(txn_id: int):
    """Delete a single transaction and its split children if any."""
    try:
        txn = database.Transaction.get_by_id(txn_id)
    except database.Transaction.DoesNotExist:
        raise HTTPException(status_code=404, detail="Not found")

    # Delete split items if this is a split parent
    if txn.is_split:
        database.SplitItem.delete().where(database.SplitItem.transaction_id == txn_id).execute()
        database.Transaction.delete().where(database.Transaction.parent_id == txn_id).execute()

    # Delete the transaction itself
    txn.delete_instance()
    return {"ok": True}


@app.delete("/transactions/by-institution/{institution_name}")
def delete_institution_transactions(institution_name: str):
    """Delete all transactions from a given institution, including splits."""
    # Find all top-level transactions for this institution
    top_level = database.Transaction.select().where(
        (database.Transaction.institution == institution_name) &
        (database.Transaction.parent_id.is_null())
    )

    deleted_count = 0
    for txn in top_level:
        if txn.is_split:
            # Delete split items
            database.SplitItem.delete().where(database.SplitItem.transaction_id == txn.id).execute()
            # Delete split children
            database.Transaction.delete().where(database.Transaction.parent_id == txn.id).execute()
        txn.delete_instance()
        deleted_count += 1

    # Delete the institution record
    try:
        inst = database.Institution.get(database.Institution.name_raw == institution_name)
        inst.delete_instance()
    except database.Institution.DoesNotExist:
        pass

    return {"deleted": deleted_count}


RECOMMENDED_MODELS = ["gemma3:4b", "gemma3", "phi3.5", "llama3.2:3b", "llama3.2", "qwen2.5-coder:1.5b"]

@app.get("/ollama/models")
def get_ollama_models():
    """Return installed Ollama models and the one that will be used."""
    try:
        import ollama as _ollama
        installed = [m["model"] for m in _ollama.list()["models"]]
    except Exception:
        return {"running": False, "installed": [], "active": None, "recommended": RECOMMENDED_MODELS}

    # Active = first preferred model found, or first installed
    active = next((m for m in RECOMMENDED_MODELS if m in installed), installed[0] if installed else None)

    return {
        "running": True,
        "installed": installed,
        "active": active,
        "recommended": RECOMMENDED_MODELS,
    }
