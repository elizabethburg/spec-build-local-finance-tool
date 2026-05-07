from sqlalchemy.orm import Session
from models.insight import InsightType
from repositories import insight_repo, transaction_repo, net_worth_repo
from services.ollama_service import ollama_service
from typing import Optional
import json


async def generate(db: Session, upload_id: int, user_name: str = "") -> Optional[str]:
    if not await ollama_service.is_available():
        return None

    history = net_worth_repo.get_history(db, limit=2)
    if len(history) >= 2:
        prev, latest = history[-2], history[-1]
        delta = float(latest.net_worth) - float(prev.net_worth)
        text = await ollama_service.generate_insight({
            "user_name": user_name,
            "insight_type": "NET_WORTH",
            "delta": delta,
        })
        if text:
            insight_repo.create(db, text=text, insight_type=InsightType.NET_WORTH, upload_id=upload_id)
            return text

    return None
