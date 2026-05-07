from sqlalchemy.orm import Session
from sqlalchemy import func
from models.investment_position import InvestmentPosition
from decimal import Decimal


def get_latest_for_account(db: Session, account_id: int) -> list[InvestmentPosition]:
    subq = db.query(
        func.max(InvestmentPosition.upload_id).label("max_upload_id")
    ).filter(
        InvestmentPosition.account_id == account_id
    ).scalar_subquery()

    return db.query(InvestmentPosition).filter(
        InvestmentPosition.account_id == account_id,
        InvestmentPosition.upload_id == subq,
    ).all()


def create_positions(db: Session, positions: list[dict]) -> list[InvestmentPosition]:
    objs = [InvestmentPosition(**p) for p in positions]
    db.bulk_save_objects(objs)
    db.commit()
    return objs


def get_market_value_for_account(db: Session, account_id: int) -> Decimal:
    positions = get_latest_for_account(db, account_id)
    return sum(float(p.shares) * float(p.current_price) for p in positions)
