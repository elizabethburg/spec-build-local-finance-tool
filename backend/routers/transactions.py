from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas.transaction import TransactionOut, TransactionUpdate, SplitRequest
from repositories import transaction_repo
from typing import Optional
from datetime import date
from pydantic import BaseModel


class BulkDeleteRequest(BaseModel):
    ids: list[int]

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    account_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    return transaction_repo.get_filtered(db, account_id, category, from_date, to_date, search)


@router.post("/bulk-delete", status_code=204)
def bulk_delete_transactions(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    from services.net_worth_service import compute_snapshot
    transaction_repo.bulk_delete(db, body.ids)
    compute_snapshot(db)


@router.get("/{txn_id}", response_model=TransactionOut)
def get_transaction(txn_id: int, db: Session = Depends(get_db)):
    txn = transaction_repo.get_by_id(db, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    return txn


@router.patch("/{txn_id}", response_model=TransactionOut)
def update_transaction(txn_id: int, body: TransactionUpdate, db: Session = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "category" in updates:
        updates["categorized"] = True
    txn = transaction_repo.update(db, txn_id, **updates)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    return txn


@router.post("/{txn_id}/split", response_model=TransactionOut)
def split_transaction(txn_id: int, body: SplitRequest, db: Session = Depends(get_db)):
    txn = transaction_repo.get_by_id(db, txn_id)
    if not txn:
        raise HTTPException(404, "Transaction not found")
    return transaction_repo.add_split(db, txn_id, body.splits)


@router.delete("/{txn_id}", status_code=204)
def delete_transaction(txn_id: int, db: Session = Depends(get_db)):
    from services.net_worth_service import compute_snapshot
    if not transaction_repo.delete(db, txn_id):
        raise HTTPException(404, "Transaction not found")
    compute_snapshot(db)
