from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class UploadStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETE = "COMPLETE"
    FAILED = "FAILED"


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    filename = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    rows_found = Column(Integer, default=0)
    rows_saved = Column(Integer, default=0)
    rows_duplicate = Column(Integer, default=0)
    status = Column(SAEnum(UploadStatus), default=UploadStatus.PENDING)
    error_message = Column(Text)

    account = relationship("Account", back_populates="uploads")
    transactions = relationship("Transaction", back_populates="upload")
    investment_positions = relationship("InvestmentPosition", back_populates="upload")
    debt_snapshots = relationship("DebtSnapshot", back_populates="upload")
    insights = relationship("Insight", back_populates="upload")
