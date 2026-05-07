import csv
import io
import chardet
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Optional
from models.account import AccountType


KNOWN_COLUMN_PATTERNS = {
    "date": ["date", "transaction date", "trans date", "posted date", "trans. date"],
    "merchant": ["description", "merchant", "payee", "name", "transaction description", "memo"],
    "amount": ["amount", "debit/credit", "transaction amount", "credit", "debit"],
    "category": ["category", "type"],
}

INVESTMENT_COLUMNS = {
    "symbol": ["symbol", "ticker", "security"],
    "name": ["name", "security name", "description"],
    "shares": ["shares", "quantity", "units"],
    "price": ["price", "current price", "market price", "last price"],
    "cost_basis": ["cost basis", "average cost", "avg cost", "cost/share"],
}


def detect_encoding(raw_bytes: bytes) -> str:
    result = chardet.detect(raw_bytes)
    return result.get("encoding", "utf-8") or "utf-8"


def parse_csv(content: bytes) -> tuple[list[str], list[dict]]:
    encoding = detect_encoding(content)
    text = content.decode(encoding, errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    rows = list(reader)
    return list(headers), rows


def detect_columns(headers: list[str]) -> dict:
    lower_headers = {h.lower().strip(): h for h in headers}
    result = {}
    for field, patterns in KNOWN_COLUMN_PATTERNS.items():
        for pattern in patterns:
            if pattern in lower_headers:
                result[field] = lower_headers[pattern]
                break
    return result


def detect_investment_columns(headers: list[str]) -> dict:
    lower_headers = {h.lower().strip(): h for h in headers}
    result = {}
    for field, patterns in INVESTMENT_COLUMNS.items():
        for pattern in patterns:
            if pattern in lower_headers:
                result[field] = lower_headers[pattern]
                break
    return result


def parse_amount(value: str) -> Optional[Decimal]:
    if not value:
        return None
    cleaned = value.replace("$", "").replace(",", "").strip()
    cleaned = cleaned.replace("(", "-").replace(")", "")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None


def parse_date(value: str) -> Optional[date]:
    if not value:
        return None
    value = value.strip()
    formats = ["%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y", "%d/%m/%Y", "%m/%d/%y", "%Y/%m/%d"]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def normalize_transaction_row(row: dict, col_map: dict, account_id: int, upload_id: int,
                               account_type: AccountType) -> Optional[dict]:
    date_col = col_map.get("date")
    merchant_col = col_map.get("merchant")
    amount_col = col_map.get("amount")

    if not all([date_col, merchant_col, amount_col]):
        return None

    txn_date = parse_date(row.get(date_col, ""))
    merchant_raw = row.get(merchant_col, "").strip()
    amount = parse_amount(row.get(amount_col, ""))

    if not txn_date or not merchant_raw or amount is None:
        return None

    # Credit cards: charges are positive in CSV but negative from user perspective
    if account_type == AccountType.CREDIT_CARD and amount > 0:
        amount = -amount
    elif account_type == AccountType.CREDIT_CARD and amount < 0:
        amount = abs(amount)

    return {
        "account_id": account_id,
        "upload_id": upload_id,
        "date": txn_date,
        "merchant_raw": merchant_raw,
        "merchant": merchant_raw,
        "amount": amount,
        "categorized": False,
    }


def normalize_investment_row(row: dict, col_map: dict,
                              account_id: int, upload_id: int,
                              as_of_date: date) -> Optional[dict]:
    symbol_col = col_map.get("symbol")
    shares_col = col_map.get("shares")
    price_col = col_map.get("price")

    if not all([symbol_col, shares_col, price_col]):
        return None

    symbol = row.get(symbol_col, "").strip()
    shares = parse_amount(row.get(shares_col, ""))
    price = parse_amount(row.get(price_col, ""))

    if not symbol or shares is None or price is None:
        return None

    name_col = col_map.get("name")
    cost_col = col_map.get("cost_basis")

    return {
        "account_id": account_id,
        "upload_id": upload_id,
        "symbol": symbol,
        "name": row.get(name_col, symbol) if name_col else symbol,
        "shares": shares,
        "current_price": price,
        "cost_basis_per_share": parse_amount(row.get(cost_col, "")) if cost_col else None,
        "as_of_date": as_of_date,
    }


def get_date_range(rows: list[dict], date_col: str) -> tuple[Optional[date], Optional[date]]:
    dates = []
    for row in rows:
        d = parse_date(row.get(date_col, ""))
        if d:
            dates.append(d)
    if not dates:
        return None, None
    return min(dates), max(dates)
