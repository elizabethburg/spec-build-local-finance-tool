from sqlalchemy import Column, Integer, Text, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class InvestmentPosition(Base):
    __tablename__ = "investment_positions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    symbol = Column(Text, nullable=False)
    name = Column(Text)
    shares = Column(Numeric(18, 6), nullable=False)
    cost_basis_per_share = Column(Numeric(12, 4))
    current_price = Column(Numeric(12, 4), nullable=False)
    as_of_date = Column(Date, nullable=False)

    account = relationship("Account", back_populates="investment_positions")
    upload = relationship("Upload", back_populates="investment_positions")
