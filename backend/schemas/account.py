from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InstitutionOut(BaseModel):
    id: int
    name_raw: str
    name_display: str

    class Config:
        from_attributes = True


class AccountOut(BaseModel):
    id: int
    institution_id: int
    name: str
    type: str
    account_class: str
    last_four: Optional[str] = None
    is_active: bool
    created_at: datetime
    institution: Optional[InstitutionOut] = None

    class Config:
        from_attributes = True


class AccountCreate(BaseModel):
    institution_name: str
    name: str
    type: str
    last_four: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
