import pandas as pd
import ollama
import json
from database import Transaction, Institution
import chardet

# Preferred models in priority order — first one found wins
PREFERRED_MODELS = ["llama3.2:3b", "llama3.2", "phi3.5", "gemma3:4b", "gemma3", "qwen2.5-coder:1.5b"]

def _get_available_model() -> str:
    """Return the first preferred model that's installed, or fall back to whatever is available."""
    try:
        installed = [m["model"] for m in ollama.list()["models"]]
        for preferred in PREFERRED_MODELS:
            if preferred in installed:
                return preferred
        # Fall back to first installed model
        if installed:
            return installed[0]
    except Exception:
        pass
    return "llama3.2:3b"  # last resort default


def detect_encoding(file_bytes: bytes) -> str:
    result = chardet.detect(file_bytes)
    return result.get("encoding") or "utf-8"


def process_csv(file_bytes: bytes, institution_name: str = "Unknown") -> dict:
    """
    Returns: { "saved": int, "duplicates": int, "errors": list[str] }
    Raises ValueError on unrecognizable / empty / garbled file.
    """
    encoding = detect_encoding(file_bytes)

    try:
        import io
        df = pd.read_csv(io.BytesIO(file_bytes), encoding=encoding)
    except Exception as e:
        raise ValueError(f"garbled:{str(e)}")

    if df.empty:
        raise ValueError("empty")

    if len(df.columns) < 2:
        raise ValueError("missing_columns")

    # Use Ollama to identify columns
    column_info = _identify_columns(df)
    if not column_info:
        raise ValueError("unrecognized")

    # Normalize rows
    rows = _normalize_rows(df, column_info, institution_name)

    # Duplicate detection and save
    saved = 0
    duplicates = 0
    for row in rows:
        existing = Transaction.select().where(
            (Transaction.date == row["date"]) &
            (Transaction.amount == row["amount"]) &
            (Transaction.merchant_raw == row["merchant_raw"])
        ).count()
        if existing > 0:
            duplicates += 1
            continue
        Transaction.create(**row)
        saved += 1

    # Upsert institution — match by name_raw or name_display (handles renamed tabs)
    inst = Institution.get_or_none(Institution.name_raw == institution_name)
    if inst is None:
        inst = Institution.get_or_none(Institution.name_display == institution_name)
    if inst is None:
        Institution.create(name_raw=institution_name, name_display=institution_name)

    return {"saved": saved, "duplicates": duplicates, "errors": []}


def _identify_columns(df: pd.DataFrame) -> dict | None:
    """Ask Ollama which columns are date, amount, merchant, type."""
    columns_sample = {}
    for col in df.columns[:10]:  # limit to first 10 cols
        columns_sample[col] = df[col].dropna().head(3).astype(str).tolist()

    prompt = f"""You are analyzing a bank CSV export. Here are the column names and sample values:

{json.dumps(columns_sample, indent=2)}

Identify which column contains each of these fields (use exact column names from above):
- date: the transaction date
- amount: the transaction amount (positive or negative number)
- merchant: the merchant/description/payee name
- type: transaction type (debit/credit/charge) — may not exist, use null if absent

Respond with ONLY valid JSON in this exact format:
{{"date": "column_name", "amount": "column_name", "merchant": "column_name", "type": "column_name_or_null"}}

If you cannot identify date or amount columns, respond with: {{"error": "unrecognized"}}"""

    try:
        response = ollama.chat(
            model=_get_available_model(),
            messages=[{"role": "user", "content": prompt}],
            options={"temperature": 0}
        )
        content = response["message"]["content"].strip()
        # Extract JSON from response
        start = content.find("{")
        end = content.rfind("}") + 1
        if start == -1:
            return None
        result = json.loads(content[start:end])
        if "error" in result:
            return None
        return result
    except Exception:
        return None


def _normalize_rows(df: pd.DataFrame, column_info: dict, institution: str) -> list[dict]:
    rows = []
    date_col = column_info.get("date")
    amount_col = column_info.get("amount")
    merchant_col = column_info.get("merchant")
    type_col = column_info.get("type")

    for _, row in df.iterrows():
        try:
            date_val = pd.to_datetime(row[date_col]).date()
            amount_raw = str(row[amount_col]).replace("$", "").replace(",", "").strip()
            amount_val = float(amount_raw)
            merchant_val = str(row[merchant_col]).strip() if merchant_col else "Unknown"

            if type_col and type_col != "null" and type_col in df.columns:
                type_val = str(row[type_col]).lower()
                if "credit" in type_val or amount_val > 0:
                    txn_type = "credit"
                else:
                    txn_type = "debit"
            else:
                txn_type = "credit" if amount_val > 0 else "debit"

            rows.append({
                "date": date_val,
                "merchant_raw": merchant_val,
                "merchant": merchant_val,
                "category": None,
                "amount": abs(amount_val),
                "type": txn_type,
                "institution": institution,
                "is_split": False,
                "parent_id": None,
                "categorized": False,
                "notes": None,
                "tags": None,
                "reconciled": False,
            })
        except Exception:
            continue  # skip unparseable rows

    return rows
