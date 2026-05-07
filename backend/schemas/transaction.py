from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class SplitItemOut(BaseModel):
    id: int
    category: str
    amount: float

    class Config:
        from_attributes = True


class TransactionOut(BaseModel):
    id: int
    account_id: int
    date: date
    merchant_raw: str
    merchant: Optional[str] = None
    category: Optional[str] = None
    amount: float
    categorized: bool
    notes: Optional[str] = None
    tags: Optional[str] = None
    is_split: bool
    reconciled: bool
    split_items: list[SplitItemOut] = []

    class Config:
        from_attributes = True


class TransactionUpdate(BaseModel):
    merchant: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None


class SplitRequest(BaseModel):
    splits: list[dict]


class QAAnswer(BaseModel):
    transaction_id: int
    merchant: str
    category: str
    account_type: str
    apply_to_similar: bool = False
