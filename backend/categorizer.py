import ollama
import json
from database import Transaction, CategorizationRule, Setting
import fnmatch
import re

CATEGORIES = [
    "Groceries", "Dining & Bars", "Coffee & Cafes",
    "Transportation", "Gas & Fuel", "Travel & Hotels",
    "Shopping & Retail", "General Household", "Entertainment",
    "Health & Medical", "Subscriptions", "Utilities & Bills",
    "Income", "Transfer", "Other"
]

def _extract_vendor_pattern(merchant_raw: str) -> str:
    """
    Extract a usable vendor pattern from a raw merchant string.
    Examples:
      AMZN*AB12CD → AMZN*
      WHOLEFOO27XY274 → WHOLEFOO*
      STARBUCKS 1234 → STARBUCKS*
    """
    raw = merchant_raw.upper()

    # Strip trailing transaction IDs after *, #, space, or dash
    result = re.sub(r'[\*\s\#\-][A-Z0-9]{4,}$', '*', raw)
    if result != raw:
        return result if result.endswith('*') else result + '*'

    # Strip trailing all-digit or short-alphanum suffixes
    result = re.sub(r'\d{3,}$', '*', raw)
    if result != raw:
        return result

    # If it's already a clean merchant name, add * suffix for future variations
    if len(raw) > 3 and raw.isalnum():
        return raw + '*'

    return raw

def _get_model() -> str:
    PREFERRED = ["gemma3:4b", "gemma3", "phi3.5", "llama3.2:3b", "llama3.2", "qwen2.5-coder:1.5b"]
    try:
        # Check if user has set an active model in settings
        active_setting = Setting.get_or_none(Setting.key == "active_model")
        if active_setting:
            return active_setting.value
    except Exception:
        pass

    try:
        installed = [m["model"] for m in ollama.list()["models"]]
        for p in PREFERRED:
            if p in installed:
                return p
        if installed:
            return installed[0]
    except Exception:
        pass
    return "llama3.2:3b"

def apply_rules_precheck():
    """Auto-categorize transactions that match existing rules. Returns count."""
    rules = list(CategorizationRule.select())
    if not rules:
        return 0

    uncategorized = Transaction.select().where(Transaction.categorized == False)
    count = 0
    for txn in uncategorized:
        for rule in rules:
            pattern = rule.vendor_pattern.replace("*", "*")
            if fnmatch.fnmatch(txn.merchant_raw.upper(), rule.vendor_pattern.upper()):
                Transaction.update(
                    category=rule.category,
                    merchant=rule.merchant_name,
                    categorized=True
                ).where(Transaction.id == txn.id).execute()
                rule.times_applied += 1
                rule.save()
                count += 1
                break
    return count

def run_ollama_categorization():
    """
    Send uncategorized transactions to Ollama.
    Returns dict with qa_queue list for Q&A flow.
    """
    uncategorized = list(Transaction.select().where(Transaction.categorized == False))
    if not uncategorized:
        return {"auto_categorized": 0, "qa_queue": []}

    rules = list(CategorizationRule.select())
    rules_context = [{"vendor_pattern": r.vendor_pattern, "merchant": r.merchant_name, "category": r.category} for r in rules]

    transactions_data = [
        {"id": t.id, "merchant_raw": t.merchant_raw, "amount": float(t.amount), "type": t.type}
        for t in uncategorized
    ]

    prompt = f"""You are categorizing bank transactions.

Known categorization rules (auto-apply these):
{json.dumps(rules_context, indent=2)}

Available categories: {json.dumps(CATEGORIES)}

New transactions to categorize:
{json.dumps(transactions_data, indent=2)}

For each transaction, assign it to one of these three buckets:
1. HIGH_CONFIDENCE: merchant is clear and category is obvious → auto-categorize
2. AMBIGUOUS_MERCHANT: vendor string is garbled or unclear → needs user confirmation
3. AMBIGUOUS_CATEGORY: merchant is clear but could fit multiple categories → needs user input

Respond with ONLY valid JSON:
{{
  "high_confidence": [
    {{"id": 1, "merchant": "Whole Foods", "category": "Groceries"}}
  ],
  "ambiguous_merchant": [
    {{"id": 2, "merchant_raw": "AMZN*AB12CD", "suggested_merchant": "Amazon", "suggested_category": "Shopping & Retail"}}
  ],
  "ambiguous_category": [
    {{"id": 3, "merchant": "Target", "suggested_category": "General Household", "alternatives": ["Shopping & Retail", "Groceries"]}}
  ]
}}"""

    try:
        response = ollama.chat(
            model=_get_model(),
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0}
        )
        content = response["message"]["content"].strip()
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1:
            return {"auto_categorized": 0, "qa_queue": [t.id for t in uncategorized]}
        result = json.loads(content[start:end])
    except Exception:
        # If Ollama fails, put everything in Q&A queue
        return {"auto_categorized": 0, "qa_queue": [
            {"id": t.id, "type": "ambiguous_category", "merchant_raw": t.merchant_raw,
             "merchant": t.merchant_raw, "suggested_category": "Other", "alternatives": CATEGORIES[:5]}
            for t in uncategorized
        ]}

    # Auto-categorize HIGH_CONFIDENCE
    auto_count = 0
    for item in result.get("high_confidence", []):
        Transaction.update(
            merchant=item.get("merchant", ""),
            category=item.get("category", "Other"),
            categorized=True
        ).where(Transaction.id == item["id"]).execute()
        auto_count += 1

    # Build Q&A queue
    qa_queue = []
    for item in result.get("ambiguous_merchant", []):
        qa_queue.append({
            "id": item["id"],
            "type": "ambiguous_merchant",
            "merchant_raw": item.get("merchant_raw", ""),
            "suggested_merchant": item.get("suggested_merchant", item.get("merchant_raw", "")),
            "suggested_category": item.get("suggested_category", "Other"),
        })
    for item in result.get("ambiguous_category", []):
        alts = item.get("alternatives", [])
        qa_queue.append({
            "id": item["id"],
            "type": "ambiguous_category",
            "merchant_raw": item.get("merchant_raw", item.get("merchant", "")),
            "merchant": item.get("merchant", item.get("merchant_raw", "")),
            "suggested_category": item.get("suggested_category", "Other"),
            "alternatives": alts,
        })

    # Deduplicate by merchant_raw — one card per unique vendor
    seen = set()
    deduped = []
    for item in qa_queue:
        key = item.get("merchant_raw", "").upper()
        if key not in seen:
            seen.add(key)
            deduped.append(item)

    return {"auto_categorized": auto_count, "qa_queue": deduped}
