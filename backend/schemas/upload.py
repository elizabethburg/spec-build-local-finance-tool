from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UploadInitiate(BaseModel):
    account_id: Optional[int] = None
    filename: str
    institution_name: Optional[str] = None
    account_name: Optional[str] = None
    account_type: Optional[str] = None


class UploadPreview(BaseModel):
    upload_id: int
    rows_found: int
    date_range: str
    account_type_confirmed: str
    institution: str
    sample: list[dict]
    account_type_suggested: Optional[str] = None


class UploadConfirmResult(BaseModel):
    saved: int
    duplicates: int
    net_worth: float
    net_worth_delta: Optional[float] = None
    has_qa_queue: bool
    ai_categorized: int = 0
    qa_count: int = 0
    insight: Optional[str] = None


class UploadOut(BaseModel):
    id: int
    account_id: int
    filename: str
    uploaded_at: datetime
    rows_found: int
    rows_saved: int
    rows_duplicate: int
    status: str
    error_message: Optional[str] = None

    class Config:
        from_attributes = True
