from sqlalchemy import Column, Integer, String, DateTime, Enum as SAEnum, JSON
from sqlalchemy.sql import func
from enum import Enum
from .base import Base


class ShareType(str, Enum):
    FRAMEWORK = "framework"
    SNIPPET = "snippet"


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    type = Column(SAEnum(ShareType), nullable=False)
    title = Column(String(255), nullable=True)
    payload = Column(JSON, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
