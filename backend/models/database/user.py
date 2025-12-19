from sqlalchemy import Column, String, DateTime, Boolean, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
import uuid
import enum


class SubscriptionTier(str, enum.Enum):
    """User subscription tiers."""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class User(Base):
    """User model."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Subscription fields
    subscription_tier = Column(String, default=SubscriptionTier.FREE.value)
    subscription_started_at = Column(DateTime, nullable=True)
    subscription_expires_at = Column(DateTime, nullable=True)
    stripe_customer_id = Column(String, nullable=True, unique=True)
    stripe_subscription_id = Column(String, nullable=True, unique=True)
    
    # Usage tracking
    generations_this_month = Column(Integer, default=0)
    generations_reset_at = Column(DateTime, default=datetime.utcnow)
    total_generations = Column(Integer, default=0)

    # Relationships
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
