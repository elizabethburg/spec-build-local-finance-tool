from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas.transaction import QAAnswer
from services.categorizer_service import get_qa_queue, answer_qa

router = APIRouter(prefix="/qa", tags=["qa"])


@router.get("/next")
def get_next_qa(db: Session = Depends(get_db)):
    queue = get_qa_queue(db)
    if not queue:
        return {"done": True}
    return queue[0]


@router.post("/answer")
def submit_answer(body: QAAnswer, db: Session = Depends(get_db)):
    applied = answer_qa(
        db,
        body.transaction_id,
        body.merchant,
        body.category,
        body.account_type,
        body.apply_to_similar,
    )
    remaining = len(get_qa_queue(db))
    return {"applied": applied, "remaining": remaining}
