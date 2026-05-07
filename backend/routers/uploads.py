from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
from schemas.upload import UploadInitiate, UploadPreview, UploadConfirmResult, UploadOut
from repositories import account_repo, upload_repo, transaction_repo, investment_repo
from repositories.account_repo import get_or_create_institution
from models.account import AccountType
from models.upload import UploadStatus
from models.debt_snapshot import DebtSnapshot
from services import csv_service, categorizer_service, net_worth_service, insight_service, ollama_service
from services.ollama_service import ollama_service as _ollama
from models.settings import Settings
from datetime import date

router = APIRouter(prefix="/uploads", tags=["uploads"])

# Temporary in-memory store for previewing parsed CSV before confirmation
_pending_previews: dict[int, dict] = {}


@router.post("/initiate")
async def initiate_upload(body: UploadInitiate, db: Session = Depends(get_db)):
    if body.account_id:
        acct = account_repo.get_by_id(db, body.account_id)
        if not acct:
            raise HTTPException(404, "Account not found")
    else:
        if not body.institution_name or not body.account_name or not body.account_type:
            raise HTTPException(400, "Provide account_id or institution_name + account_name + account_type")
        try:
            acct_type = AccountType(body.account_type)
        except ValueError:
            raise HTTPException(400, f"Invalid account type: {body.account_type}")
        inst = get_or_create_institution(db, body.institution_name)
        acct = account_repo.create(db, inst.id, body.account_name, acct_type)

    upload = upload_repo.create(db, acct.id, body.filename)
    return {"upload_id": upload.id}


@router.post("/{upload_id}/file")
async def upload_file(upload_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    upload = upload_repo.get_by_id(db, upload_id)
    if not upload:
        raise HTTPException(404, "Upload not found")

    content = await file.read()
    headers, rows = csv_service.parse_csv(content)

    if not rows:
        upload_repo.update_status(db, upload_id, UploadStatus.FAILED, error_message="No data found in file")
        raise HTTPException(400, "No data found in file. Make sure it's a CSV.")

    acct = account_repo.get_by_id(db, upload.account_id)
    account_type = acct.type

    # Try Ollama for unknown type detection (won't happen here since type is set on account)
    col_map = csv_service.detect_columns(headers)

    if not col_map and await _ollama.is_available():
        col_map = await _ollama.identify_columns(headers, rows[:3])

    date_col = col_map.get("date")
    date_min, date_max = None, None
    if date_col:
        date_min, date_max = csv_service.get_date_range(rows, date_col)

    date_range_str = "Unknown date range"
    if date_min and date_max:
        date_range_str = f"{date_min.strftime('%b %-d')} – {date_max.strftime('%b %-d, %Y')}"

    sample = rows[:3]

    _pending_previews[upload_id] = {
        "rows": rows,
        "headers": headers,
        "col_map": col_map,
        "account_type": account_type.value,
    }

    upload_repo.update_status(db, upload_id, UploadStatus.PROCESSING)

    return UploadPreview(
        upload_id=upload_id,
        rows_found=len(rows),
        date_range=date_range_str,
        account_type_confirmed=account_type.value,
        institution=acct.institution.name_display if acct.institution else "Unknown",
        sample=[{k: v for k, v in row.items()} for row in sample],
    )


@router.post("/{upload_id}/confirm")
async def confirm_upload(upload_id: int, db: Session = Depends(get_db)):
    upload = upload_repo.get_by_id(db, upload_id)
    if not upload:
        raise HTTPException(404, "Upload not found")

    pending = _pending_previews.get(upload_id)
    if not pending:
        raise HTTPException(400, "No pending preview for this upload. Upload the file first.")

    rows = pending["rows"]
    col_map = pending["col_map"]
    account_type_str = pending["account_type"]
    acct = account_repo.get_by_id(db, upload.account_id)
    account_type = AccountType(account_type_str)

    rows_saved = 0
    rows_duplicate = 0
    has_qa_queue = False

    try:
        if account_type in (AccountType.CHECKING, AccountType.SAVINGS, AccountType.CREDIT_CARD):
            saved, dupes, has_qa = await _process_transactions(db, rows, col_map, acct, upload, account_type)
            rows_saved = saved
            rows_duplicate = dupes
            has_qa_queue = has_qa

        elif account_type == AccountType.INVESTMENT:
            inv_col_map = csv_service.detect_investment_columns(pending["headers"])
            today = date.today()
            positions = []
            for row in rows:
                pos = csv_service.normalize_investment_row(row, inv_col_map, acct.id, upload_id, today)
                if pos:
                    positions.append(pos)
            investment_repo.create_positions(db, positions)
            rows_saved = len(positions)

        elif account_type == AccountType.LOAN:
            _process_loan(db, rows, col_map, acct, upload)
            rows_saved = 1

        upload_repo.update_status(db, upload_id, UploadStatus.COMPLETE,
                                   rows_found=len(rows), rows_saved=rows_saved,
                                   rows_duplicate=rows_duplicate)

        prev_snap = net_worth_repo_get_latest(db)
        prev_nw = float(prev_snap.net_worth) if prev_snap else 0.0

        snap = net_worth_service.compute_snapshot(db)
        net_worth_delta = float(snap["net_worth"]) - prev_nw

        user_name = _get_user_name(db)
        insight_text = await insight_service.generate(db, upload_id, user_name)

        del _pending_previews[upload_id]

        return UploadConfirmResult(
            saved=rows_saved,
            duplicates=rows_duplicate,
            net_worth=float(snap["net_worth"]),
            net_worth_delta=round(net_worth_delta, 2),
            has_qa_queue=has_qa_queue,
            insight=insight_text,
        )

    except Exception as e:
        upload_repo.update_status(db, upload_id, UploadStatus.FAILED,
                                   error_message="We couldn't process that file. Make sure it's a valid CSV and try again.")
        raise HTTPException(500, "We couldn't process that file. Make sure it's a valid CSV and try again.")


async def _process_transactions(db, rows, col_map, acct, upload, account_type):
    normalized = []
    for row in rows:
        txn = csv_service.normalize_transaction_row(row, col_map, acct.id, upload.id, account_type)
        if txn:
            normalized.append(txn)

    saved = 0
    dupes = 0
    new_txns = []

    for txn in normalized:
        if transaction_repo.exists(db, acct.id, txn["date"], txn["amount"], txn["merchant_raw"]):
            dupes += 1
        else:
            new_txns.append(txn)
            saved += 1

    created = transaction_repo.bulk_create(db, new_txns)

    uncategorized = categorizer_service.apply_rules_precheck(db, created, account_type.value)
    qa_items = await categorizer_service.run_ollama_categorization(db, uncategorized, account_type.value)
    has_qa = len(qa_items) > 0

    return saved, dupes, has_qa


def _process_loan(db, rows, col_map, acct, upload):
    balance_col = None
    for h in rows[0].keys() if rows else []:
        if any(p in h.lower() for p in ["balance", "amount owed", "principal"]):
            balance_col = h
            break

    balance = 0.0
    if balance_col and rows:
        parsed = csv_service.parse_amount(rows[0].get(balance_col, ""))
        if parsed:
            balance = abs(float(parsed))

    snap = DebtSnapshot(
        account_id=acct.id,
        upload_id=upload.id,
        as_of_date=date.today(),
        balance=balance,
    )
    db.add(snap)
    db.commit()


def net_worth_repo_get_latest(db):
    from repositories import net_worth_repo
    return net_worth_repo.get_latest(db)


def _get_user_name(db) -> str:
    setting = db.query(Settings).filter(Settings.key == "user_name").first()
    return setting.value if setting else ""


@router.get("", response_model=list[UploadOut])
def list_uploads(db: Session = Depends(get_db)):
    return upload_repo.get_all(db)
