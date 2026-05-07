from sqlalchemy import Column, Integer, Text, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base


class InsightType(str, enum.Enum):
    SPENDING = "SPENDING"
    INVESTMENT = "INVESTMENT"
    NET_WORTH = "NET_WORTH"
    DEBT = "DEBT"


class Insight(Base):
    __tablename__ = "insights"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=True)
    insight_type = Column(SAEnum(InsightType), nullable=False)
    seen = Column(Boolean, default=False)

    upload = relationship("Upload", back_populates="insights")
