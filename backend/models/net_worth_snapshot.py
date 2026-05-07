from sqlalchemy import Column, Integer, Numeric, DateTime, Text
from datetime import datetime
from database import Base


class NetWorthSnapshot(Base):
    __tablename__ = "net_worth_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    computed_at = Column(DateTime, default=datetime.utcnow)
    total_assets = Column(Numeric(14, 2), nullable=False)
    total_liabilities = Column(Numeric(14, 2), nullable=False)
    net_worth = Column(Numeric(14, 2), nullable=False)
    breakdown = Column(Text)  # JSON
