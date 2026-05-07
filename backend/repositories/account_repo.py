from sqlalchemy.orm import Session
from models.account import Account, AccountType, AccountClass
from models.institution import Institution
from typing import Optional


def _derive_class(account_type: AccountType) -> AccountClass:
    if account_type in (AccountType.CHECKING, AccountType.SAVINGS, AccountType.INVESTMENT):
        return AccountClass.ASSET
    return AccountClass.LIABILITY


def get_all(db: Session, include_inactive: bool = False) -> list[Account]:
    q = db.query(Account)
    if not include_inactive:
        q = q.filter(Account.is_active == True)
    return q.all()


def get_by_id(db: Session, account_id: int) -> Optional[Account]:
    return db.query(Account).filter(Account.id == account_id).first()


def create(db: Session, institution_id: int, name: str, account_type: AccountType,
           last_four: Optional[str] = None) -> Account:
    account = Account(
        institution_id=institution_id,
        name=name,
        type=account_type,
        account_class=_derive_class(account_type),
        last_four=last_four,
        is_active=True,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


def update(db: Session, account_id: int, name: Optional[str] = None,
           is_active: Optional[bool] = None) -> Optional[Account]:
    account = get_by_id(db, account_id)
    if not account:
        return None
    if name is not None:
        account.name = name
    if is_active is not None:
        account.is_active = is_active
    db.commit()
    db.refresh(account)
    return account


def get_or_create_institution(db: Session, name_raw: str) -> Institution:
    inst = db.query(Institution).filter(Institution.name_raw == name_raw).first()
    if not inst:
        inst = Institution(name_raw=name_raw, name_display=name_raw)
        db.add(inst)
        db.commit()
        db.refresh(inst)
    return inst


def get_all_institutions(db: Session) -> list[Institution]:
    return db.query(Institution).all()


def delete(db: Session, account_id: int) -> bool:
    from models.transaction import Transaction
    from models.split_item import SplitItem
    from models.investment_position import InvestmentPosition
    from models.debt_snapshot import DebtSnapshot
    from models.upload import Upload

    acct = get_by_id(db, account_id)
    if not acct:
        return False

    institution_id = acct.institution_id

    txn_ids = [t.id for t in db.query(Transaction.id).filter(Transaction.account_id == account_id).all()]
    if txn_ids:
        db.query(SplitItem).filter(SplitItem.transaction_id.in_(txn_ids)).delete(synchronize_session=False)
    db.query(Transaction).filter(Transaction.account_id == account_id).delete(synchronize_session=False)
    db.query(InvestmentPosition).filter(InvestmentPosition.account_id == account_id).delete(synchronize_session=False)
    db.query(DebtSnapshot).filter(DebtSnapshot.account_id == account_id).delete(synchronize_session=False)
    db.query(Upload).filter(Upload.account_id == account_id).delete(synchronize_session=False)
    db.delete(acct)
    db.flush()

    # Remove the institution if it has no remaining accounts
    remaining = db.query(Account).filter(Account.institution_id == institution_id).count()
    if remaining == 0:
        inst = db.query(Institution).filter(Institution.id == institution_id).first()
        if inst:
            db.delete(inst)

    db.commit()
    return True


def update_institution(db: Session, institution_id: int, name_display: str) -> Optional[Institution]:
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        return None
    inst.name_display = name_display
    db.commit()
    db.refresh(inst)
    return inst
