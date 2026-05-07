from sqlalchemy.orm import Session
from models.account import Account, AccountType, AccountClass
from repositories import transaction_repo, investment_repo, net_worth_repo
from repositories.account_repo import get_all


def compute_snapshot(db: Session) -> dict:
    accounts = get_all(db)
    account_balances = []
    total_assets = 0.0
    total_liabilities = 0.0

    for acct in accounts:
        balance = _get_account_balance(db, acct)
        account_balances.append({
            "id": acct.id,
            "name": acct.name,
            "type": acct.type.value,
            "balance": round(balance, 2),
        })
        if acct.account_class == AccountClass.ASSET:
            total_assets += balance
        else:
            total_liabilities += balance

    net_worth = total_assets - total_liabilities
    breakdown = {"accounts": account_balances}

    snap = net_worth_repo.create(
        db,
        total_assets=round(total_assets, 2),
        total_liabilities=round(total_liabilities, 2),
        net_worth=round(net_worth, 2),
        breakdown=breakdown,
    )
    return {
        "net_worth": snap.net_worth,
        "total_assets": snap.total_assets,
        "total_liabilities": snap.total_liabilities,
    }


def _get_account_balance(db: Session, account: Account) -> float:
    if account.type in (AccountType.CHECKING, AccountType.SAVINGS):
        return float(transaction_repo.get_balance_for_account(db, account.id))

    if account.type == AccountType.CREDIT_CARD:
        balance = float(transaction_repo.get_balance_for_account(db, account.id))
        return abs(balance) if balance < 0 else 0.0

    if account.type == AccountType.INVESTMENT:
        return float(investment_repo.get_market_value_for_account(db, account.id))

    if account.type == AccountType.LOAN:
        from models.debt_snapshot import DebtSnapshot
        snap = db.query(DebtSnapshot).filter(
            DebtSnapshot.account_id == account.id
        ).order_by(DebtSnapshot.as_of_date.desc()).first()
        return float(snap.balance) if snap else 0.0

    return 0.0


def get_net_worth_history(db: Session) -> list[dict]:
    history = net_worth_repo.get_history(db)
    return [
        {"date": snap.computed_at.strftime("%Y-%m-%d"), "net_worth": float(snap.net_worth)}
        for snap in history
    ]
