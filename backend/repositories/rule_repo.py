from sqlalchemy.orm import Session
from models.categorization_rule import CategorizationRule, RuleConfidence
from typing import Optional
import fnmatch


def get_all(db: Session) -> list[CategorizationRule]:
    return db.query(CategorizationRule).order_by(CategorizationRule.times_applied.desc()).all()


def get_for_account_type(db: Session, account_type: str) -> list[CategorizationRule]:
    return db.query(CategorizationRule).filter(
        CategorizationRule.account_type == account_type
    ).all()


def find_match(db: Session, merchant_raw: str, account_type: str) -> Optional[CategorizationRule]:
    rules = get_for_account_type(db, account_type)
    for rule in rules:
        if fnmatch.fnmatch(merchant_raw.upper(), rule.vendor_pattern.upper()):
            return rule
    return None


def create_or_update(db: Session, vendor_pattern: str, merchant_name: str,
                     category: str, account_type: str,
                     confidence: RuleConfidence = RuleConfidence.HIGH) -> CategorizationRule:
    existing = db.query(CategorizationRule).filter(
        CategorizationRule.vendor_pattern == vendor_pattern,
        CategorizationRule.account_type == account_type,
    ).first()
    if existing:
        existing.merchant_name = merchant_name
        existing.category = category
        existing.confidence = confidence
        existing.times_applied += 1
        db.commit()
        db.refresh(existing)
        return existing
    rule = CategorizationRule(
        vendor_pattern=vendor_pattern,
        merchant_name=merchant_name,
        category=category,
        account_type=account_type,
        confidence=confidence,
        times_applied=1,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


def increment_applied(db: Session, rule_id: int) -> None:
    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if rule:
        rule.times_applied += 1
        db.commit()


def update(db: Session, rule_id: int, **fields) -> Optional[CategorizationRule]:
    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if not rule:
        return None
    for k, v in fields.items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return rule


def delete(db: Session, rule_id: int) -> bool:
    rule = db.query(CategorizationRule).filter(CategorizationRule.id == rule_id).first()
    if not rule:
        return False
    db.delete(rule)
    db.commit()
    return True
