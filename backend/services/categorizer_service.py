from sqlalchemy.orm import Session
from models.transaction import Transaction
from services.ollama_service import ollama_service
from repositories import rule_repo
from typing import Optional


QA_QUEUE: list[dict] = []


def apply_rules_precheck(db: Session, transactions: list[Transaction], account_type: str) -> list[Transaction]:
    """Apply saved rules to transactions. Returns uncategorized remainder."""
    uncategorized = []
    for txn in transactions:
        rule = rule_repo.find_match(db, txn.merchant_raw, account_type)
        if rule:
            txn.merchant = rule.merchant_name
            txn.category = rule.category
            txn.categorized = True
            rule_repo.increment_applied(db, rule.id)
        else:
            uncategorized.append(txn)
    db.commit()
    return uncategorized


async def run_ollama_categorization(db: Session, transactions: list[Transaction],
                                    account_type: str) -> list[dict]:
    """Categorize via Ollama. Returns Q&A queue items for ambiguous results."""
    if not transactions:
        return []

    tx_dicts = [{"id": t.id, "merchant_raw": t.merchant_raw} for t in transactions]

    if not await ollama_service.is_available():
        return _build_qa_queue(transactions)

    results = await ollama_service.categorize_batch(tx_dicts)
    qa_items = []

    result_map = {r["index"]: r for r in results if "index" in r}

    for i, txn in enumerate(transactions):
        result = result_map.get(i)
        if result and result.get("category") and result.get("merchant"):
            txn.merchant = result["merchant"]
            txn.category = result["category"]
            txn.categorized = True
            rule_repo.create_or_update(
                db,
                vendor_pattern=txn.merchant_raw.upper() + "*",
                merchant_name=result["merchant"],
                category=result["category"],
                account_type=account_type,
            )
        else:
            qa_items.append({
                "type": "AMBIGUOUS_MERCHANT",
                "transaction_id": txn.id,
                "merchant_raw": txn.merchant_raw,
                "amount": float(txn.amount),
                "date": str(txn.date),
            })

    db.commit()
    return qa_items


def _build_qa_queue(transactions: list[Transaction]) -> list[dict]:
    return [
        {
            "type": "AMBIGUOUS_MERCHANT",
            "transaction_id": txn.id,
            "merchant_raw": txn.merchant_raw,
            "amount": float(txn.amount),
            "date": str(txn.date),
        }
        for txn in transactions
    ]


def answer_qa(db: Session, transaction_id: int, merchant: str, category: str,
              account_type: str, apply_to_similar: bool = False) -> int:
    from repositories import transaction_repo
    txn = transaction_repo.get_by_id(db, transaction_id)
    if txn:
        txn.merchant = merchant
        txn.category = category
        txn.categorized = True
        db.commit()

    rule = rule_repo.create_or_update(
        db,
        vendor_pattern=txn.merchant_raw.upper() + "*" if txn else merchant.upper() + "*",
        merchant_name=merchant,
        category=category,
        account_type=account_type,
    )

    applied = 1
    if apply_to_similar and txn:
        from repositories import transaction_repo
        similar = db.query(Transaction).filter(
            Transaction.merchant_raw == txn.merchant_raw,
            Transaction.categorized == False,
        ).all()
        for s in similar:
            s.merchant = merchant
            s.category = category
            s.categorized = True
            applied += 1
        db.commit()

    return applied


def get_qa_queue(db: Session) -> list[dict]:
    from repositories import transaction_repo
    uncategorized = transaction_repo.get_uncategorized(db)
    return [
        {
            "type": "AMBIGUOUS_MERCHANT",
            "transaction_id": txn.id,
            "merchant_raw": txn.merchant_raw,
            "amount": float(txn.amount),
            "date": str(txn.date),
        }
        for txn in uncategorized
    ]
