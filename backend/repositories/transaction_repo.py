from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case
from models.transaction import Transaction
from models.split_item import SplitItem
from datetime import date
from decimal import Decimal
from typing import Optional


def exists(db: Session, account_id: int, txn_date: date, amount: Decimal, merchant_raw: str) -> bool:
    return db.query(Transaction).filter(
        and_(
            Transaction.account_id == account_id,
            Transaction.date == txn_date,
            Transaction.amount == amount,
            Transaction.merchant_raw == merchant_raw,
        )
    ).first() is not None


def bulk_create(db: Session, transactions: list[dict]) -> list[Transaction]:
    objs = [Transaction(**t) for t in transactions]
    db.add_all(objs)
    db.flush()   # assigns IDs, keeps objects session-tracked
    db.commit()
    return objs


def get_for_account(db: Session, account_id: int,
                    from_date: Optional[date] = None,
                    to_date: Optional[date] = None) -> list[Transaction]:
    q = db.query(Transaction).filter(Transaction.account_id == account_id)
    if from_date:
        q = q.filter(Transaction.date >= from_date)
    if to_date:
        q = q.filter(Transaction.date <= to_date)
    return q.order_by(Transaction.date.desc()).all()


def get_filtered(db: Session, account_id: Optional[int] = None,
                 category: Optional[str] = None,
                 from_date: Optional[date] = None,
                 to_date: Optional[date] = None,
                 search: Optional[str] = None) -> list[Transaction]:
    q = db.query(Transaction)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if category:
        q = q.filter(Transaction.category == category)
    if from_date:
        q = q.filter(Transaction.date >= from_date)
    if to_date:
        q = q.filter(Transaction.date <= to_date)
    if search:
        q = q.filter(Transaction.merchant.ilike(f"%{search}%"))
    return q.order_by(Transaction.date.desc()).all()


def get_by_id(db: Session, txn_id: int) -> Optional[Transaction]:
    return db.query(Transaction).filter(Transaction.id == txn_id).first()


def update(db: Session, txn_id: int, **fields) -> Optional[Transaction]:
    txn = get_by_id(db, txn_id)
    if not txn:
        return None
    for k, v in fields.items():
        setattr(txn, k, v)
    db.commit()
    db.refresh(txn)
    return txn


def get_balance_for_account(db: Session, account_id: int) -> Decimal:
    result = db.query(func.sum(Transaction.amount)).filter(
        Transaction.account_id == account_id
    ).scalar()
    return result or Decimal(0)


def get_uncategorized(db: Session, account_id: Optional[int] = None) -> list[Transaction]:
    q = db.query(Transaction).filter(Transaction.categorized == False)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    return q.all()


def get_daily_cashflow(db: Session, account_ids: list[int],
                       from_date: date, to_date: date) -> list[dict]:
    rows = db.query(
        Transaction.date,
        func.sum(case((Transaction.amount > 0, Transaction.amount), else_=0)).label("income"),
        func.sum(case((Transaction.amount < 0, Transaction.amount), else_=0)).label("expenses"),
    ).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.date >= from_date,
        Transaction.date <= to_date,
    ).group_by(Transaction.date).order_by(Transaction.date).all()
    return [{"date": str(r.date), "income": float(r.income or 0), "expenses": float(abs(r.expenses or 0))} for r in rows]


def get_category_totals(db: Session, account_ids: list[int],
                        from_date: date, to_date: date) -> list[dict]:
    rows = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
    ).filter(
        Transaction.account_id.in_(account_ids),
        Transaction.date >= from_date,
        Transaction.date <= to_date,
        Transaction.amount < 0,
        Transaction.category.isnot(None),
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount)).all()
    return [{"name": r.category, "amount": float(abs(r.total or 0))} for r in rows]


def delete(db: Session, txn_id: int) -> bool:
    txn = get_by_id(db, txn_id)
    if not txn:
        return False
    db.delete(txn)
    db.commit()
    return True


def bulk_delete(db: Session, ids: list[int]) -> int:
    count = db.query(Transaction).filter(Transaction.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return count


def add_split(db: Session, txn_id: int, splits: list[dict]) -> Transaction:
    txn = get_by_id(db, txn_id)
    db.query(SplitItem).filter(SplitItem.transaction_id == txn_id).delete()
    for s in splits:
        db.add(SplitItem(transaction_id=txn_id, category=s["category"], amount=s["amount"]))
    txn.is_split = True
    db.commit()
    db.refresh(txn)
    return txn
