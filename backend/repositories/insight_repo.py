from sqlalchemy.orm import Session
from models.insight import Insight, InsightType
from typing import Optional


def create(db: Session, text: str, insight_type: InsightType,
           upload_id: Optional[int] = None) -> Insight:
    insight = Insight(text=text, insight_type=insight_type, upload_id=upload_id)
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight


def get_latest_unseen(db: Session) -> Optional[Insight]:
    return db.query(Insight).filter(Insight.seen == False).order_by(
        Insight.generated_at.desc()
    ).first()


def mark_seen(db: Session, insight_id: int) -> None:
    insight = db.query(Insight).filter(Insight.id == insight_id).first()
    if insight:
        insight.seen = True
        db.commit()
