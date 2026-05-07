from sqlalchemy.orm import Session
from models.net_worth_snapshot import NetWorthSnapshot
from typing import Optional
import json


def create(db: Session, total_assets: float, total_liabilities: float,
           net_worth: float, breakdown: dict) -> NetWorthSnapshot:
    snap = NetWorthSnapshot(
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=net_worth,
        breakdown=json.dumps(breakdown),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


def get_latest(db: Session) -> Optional[NetWorthSnapshot]:
    return db.query(NetWorthSnapshot).order_by(NetWorthSnapshot.computed_at.desc()).first()


def get_history(db: Session, limit: int = 100) -> list[NetWorthSnapshot]:
    return db.query(NetWorthSnapshot).order_by(NetWorthSnapshot.computed_at.asc()).limit(limit).all()
