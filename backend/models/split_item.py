from sqlalchemy import Column, Integer, Text, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class SplitItem(Base):
    __tablename__ = "split_items"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    category = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)

    transaction = relationship("Transaction", back_populates="split_items")
