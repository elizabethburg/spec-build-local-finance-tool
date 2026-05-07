from sqlalchemy import Column, Integer, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class DebtSnapshot(Base):
    __tablename__ = "debt_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    as_of_date = Column(Date, nullable=False)
    balance = Column(Numeric(12, 2), nullable=False)
    minimum_payment = Column(Numeric(12, 2))
    interest_rate = Column(Numeric(6, 4))
    interest_paid_period = Column(Numeric(12, 2))
    principal_paid_period = Column(Numeric(12, 2))

    account = relationship("Account", back_populates="debt_snapshots")
    upload = relationship("Upload", back_populates="debt_snapshots")
