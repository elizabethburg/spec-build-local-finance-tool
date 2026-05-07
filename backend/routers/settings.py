from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from repositories import rule_repo, account_repo
from services.ollama_service import ollama_service
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["settings"])


class RuleUpdate(BaseModel):
    vendor_pattern: Optional[str] = None
    merchant_name: Optional[str] = None
    category: Optional[str] = None


class InstitutionUpdate(BaseModel):
    name_display: str


@router.get("/rules")
def list_rules(db: Session = Depends(get_db)):
    return rule_repo.get_all(db)


@router.patch("/rules/{rule_id}")
def update_rule(rule_id: int, body: RuleUpdate, db: Session = Depends(get_db)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    rule = rule_repo.update(db, rule_id, **updates)
    if not rule:
        raise HTTPException(404, "Rule not found")
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    if not rule_repo.delete(db, rule_id):
        raise HTTPException(404, "Rule not found")


@router.get("/institutions")
def list_institutions(db: Session = Depends(get_db)):
    return account_repo.get_all_institutions(db)


@router.patch("/institutions/{institution_id}")
def update_institution(institution_id: int, body: InstitutionUpdate, db: Session = Depends(get_db)):
    inst = account_repo.update_institution(db, institution_id, body.name_display)
    if not inst:
        raise HTTPException(404, "Institution not found")
    return inst


@router.get("/ollama/status")
async def ollama_status():
    available = await ollama_service.is_available()
    active_model = await ollama_service.get_active_model() if available else None
    available_models = await ollama_service.get_available_models() if available else []
    return {
        "available": available,
        "active_model": active_model,
        "available_models": available_models,
    }
