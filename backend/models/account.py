from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class AccountType(str, enum.Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    INVESTMENT = "INVESTMENT"
    LOAN = "LOAN"


class AccountClass(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=False)
    name = Column(Text, nullable=False)
    type = Column(SAEnum(AccountType), nullable=False)
    account_class = Column(SAEnum(AccountClass), nullable=False)
    last_four = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    institution = relationship("Institution", back_populates="accounts")
    uploads = relationship("Upload", back_populates="account")
    transactions = relationship("Transaction", back_populates="account")
    investment_positions = relationship("InvestmentPosition", back_populates="account")
    debt_snapshots = relationship("DebtSnapshot", back_populates="account")
