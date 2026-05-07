from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas.dashboard import DashboardOut, AccountSummary, InsightOut
from repositories import account_repo, net_worth_repo, transaction_repo, insight_repo
from services.net_worth_service import _get_account_balance, get_net_worth_history
from models.account import AccountType, AccountClass
from datetime import date, timedelta
from typing import Optional

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _period_dates(period: str) -> tuple[date, date]:
    today = date.today()
    if period == "30d":
        return today - timedelta(days=30), today
    if period == "3m":
        return today - timedelta(days=90), today
    if period == "this_month":
        return today.replace(day=1), today
    if period == "same_month_ly":
        last_year = today.replace(year=today.year - 1)
        return last_year.replace(day=1), last_year
    return date(2000, 1, 1), today


@router.get("", response_model=DashboardOut)
def get_dashboard(period: str = Query("this_month"), db: Session = Depends(get_db)):
    accounts = account_repo.get_all(db)
    from_date, to_date = _period_dates(period)

    account_summaries = []
    total_assets = 0.0
    total_liabilities = 0.0
    for acct in accounts:
        balance = _get_account_balance(db, acct)
        account_summaries.append(AccountSummary(id=acct.id, name=acct.name, type=acct.type.value, balance=round(balance, 2)))
        if acct.account_class == AccountClass.ASSET:
            total_assets += balance
        else:
            total_liabilities += balance

    nw = round(total_assets - total_liabilities, 2)
    assets = round(total_assets, 2)
    liabilities = round(total_liabilities, 2)

    history = net_worth_repo.get_history(db, limit=100)
    nw_history = [{"date": s.computed_at.strftime("%Y-%m-%d"), "net_worth": float(s.net_worth)} for s in history]

    nw_delta = None
    if len(history) >= 2:
        nw_delta = float(history[-1].net_worth) - float(history[-2].net_worth)

    cashflow_account_ids = [
        a.id for a in accounts
        if a.type in (AccountType.CHECKING, AccountType.SAVINGS, AccountType.CREDIT_CARD)
    ]
    daily_cashflow = transaction_repo.get_daily_cashflow(db, cashflow_account_ids, from_date, to_date)

    prev_start = from_date - (to_date - from_date) - timedelta(days=1)
    categories_current = transaction_repo.get_category_totals(db, cashflow_account_ids, from_date, to_date)
    categories_previous = transaction_repo.get_category_totals(db, cashflow_account_ids, prev_start, from_date - timedelta(days=1))

    total = sum(c["amount"] for c in categories_current) or 1
    for c in categories_current:
        c["percent"] = round(c["amount"] / total * 100, 1)

    insight_obj = insight_repo.get_latest_unseen(db)
    insight_out = None
    if insight_obj:
        insight_out = InsightOut(text=insight_obj.text, type=insight_obj.insight_type.value)
        insight_repo.mark_seen(db, insight_obj.id)

    return DashboardOut(
        net_worth=nw,
        net_worth_delta=round(nw_delta, 2) if nw_delta is not None else None,
        total_assets=assets,
        total_liabilities=liabilities,
        accounts=account_summaries,
        net_worth_history=nw_history,
        daily_cashflow=daily_cashflow,
        categories_current=categories_current,
        categories_previous=categories_previous,
        insight=insight_out,
    )
