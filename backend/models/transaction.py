from sqlalchemy import Column, Integer, Text, Boolean, DateTime, Date, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    date = Column(Date, nullable=False)
    merchant_raw = Column(Text, nullable=False)
    merchant = Column(Text)
    category = Column(Text)
    amount = Column(Numeric(12, 2), nullable=False)
    categorized = Column(Boolean, default=False)
    notes = Column(Text)
    tags = Column(Text)  # JSON array
    is_split = Column(Boolean, default=False)
    parent_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    reconciled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="transactions")
    upload = relationship("Upload", back_populates="transactions")
    split_items = relationship("SplitItem", back_populates="transaction")
    children = relationship("Transaction", backref="parent", remote_side=[id], foreign_keys=[parent_id])
