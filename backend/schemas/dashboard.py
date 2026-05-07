from pydantic import BaseModel
from typing import Optional


class AccountSummary(BaseModel):
    id: int
    name: str
    type: str
    balance: float


class InsightOut(BaseModel):
    text: str
    type: str


class DashboardOut(BaseModel):
    net_worth: float
    net_worth_delta: Optional[float] = None
    total_assets: float
    total_liabilities: float
    accounts: list[AccountSummary]
    net_worth_history: list[dict]
    daily_cashflow: list[dict]
    categories_current: list[dict]
    categories_previous: list[dict]
    insight: Optional[InsightOut] = None
