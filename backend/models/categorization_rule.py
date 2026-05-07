from sqlalchemy import Column, Integer, Text, Enum as SAEnum
from database import Base
import enum


class RuleConfidence(str, enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"


class CategorizationRule(Base):
    __tablename__ = "categorization_rules"

    id = Column(Integer, primary_key=True, index=True)
    vendor_pattern = Column(Text, nullable=False)
    merchant_name = Column(Text, nullable=False)
    category = Column(Text, nullable=False)
    account_type = Column(Text, nullable=False)
    confidence = Column(SAEnum(RuleConfidence), default=RuleConfidence.MEDIUM)
    times_applied = Column(Integer, default=0)
