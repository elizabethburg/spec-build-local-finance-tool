from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas.account import AccountOut, AccountCreate, AccountUpdate, InstitutionOut
from repositories import account_repo
from models.account import AccountType
from services.net_worth_service import _get_account_balance

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db)):
    return account_repo.get_all(db)


@router.post("", response_model=AccountOut)
def create_account(body: AccountCreate, db: Session = Depends(get_db)):
    try:
        acct_type = AccountType(body.type)
    except ValueError:
        raise HTTPException(400, f"Invalid account type: {body.type}")

    inst = account_repo.get_or_create_institution(db, body.institution_name)
    return account_repo.create(db, inst.id, body.name, acct_type, body.last_four)


@router.get("/{account_id}", response_model=AccountOut)
def get_account(account_id: int, db: Session = Depends(get_db)):
    acct = account_repo.get_by_id(db, account_id)
    if not acct:
        raise HTTPException(404, "Account not found")
    return acct


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(account_id: int, body: AccountUpdate, db: Session = Depends(get_db)):
    acct = account_repo.update(db, account_id, name=body.name, is_active=body.is_active)
    if not acct:
        raise HTTPException(404, "Account not found")
    return acct


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: int, db: Session = Depends(get_db)):
    from services.net_worth_service import compute_snapshot
    if not account_repo.delete(db, account_id):
        raise HTTPException(404, "Account not found")
    compute_snapshot(db)


@router.get("/{account_id}/balance")
def get_account_balance(account_id: int, db: Session = Depends(get_db)):
    from datetime import datetime
    acct = account_repo.get_by_id(db, account_id)
    if not acct:
        raise HTTPException(404, "Account not found")
    balance = _get_account_balance(db, acct)
    return {"balance": round(balance, 2), "as_of": datetime.utcnow().isoformat()}
