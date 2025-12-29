"""
Usage tracking and tier enforcement service for Intelekt.
Tracks AI generations per user and enforces tier limits.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from models.database.user import User, SubscriptionTier
from fastapi import HTTPException, status


# Tier limits configuration
TIER_LIMITS = {
    SubscriptionTier.FREE.value: {
        "generations_per_month": 50,
        "max_projects": 3,
        "max_files_per_project": 20,
        "ai_providers": ["claude"],  # Free tier only gets Claude
        "features": ["basic_chat", "code_generation", "export"],
    },
    SubscriptionTier.PRO.value: {
        "generations_per_month": -1,  # Unlimited
        "max_projects": -1,  # Unlimited
        "max_files_per_project": -1,  # Unlimited
        "ai_providers": ["claude", "grok"],
        "features": ["basic_chat", "code_generation", "export", "live_preview", "templates", "priority_support"],
    },
    SubscriptionTier.ENTERPRISE.value: {
        "generations_per_month": -1,  # Unlimited
        "max_projects": -1,  # Unlimited
        "max_files_per_project": -1,  # Unlimited
        "ai_providers": ["claude", "grok"],
        "features": ["basic_chat", "code_generation", "export", "live_preview", "templates", "priority_support", "sso", "audit_logs", "custom_models"],
    },
}


class UsageService:
    """Service for tracking usage and enforcing tier limits."""
    
    def get_user_tier(self, user: User) -> str:
        """Get the user's current subscription tier."""
        # Special case: Owners get unlimited enterprise access forever
        if user.email in ["akshay@lyvena.xyz", "verchenko.work@gmail.com", "1580509@gmail.com"]:
            return SubscriptionTier.ENTERPRISE.value
        
        # Check if subscription has expired
        if user.subscription_tier != SubscriptionTier.FREE.value:
            if user.subscription_expires_at and user.subscription_expires_at < datetime.utcnow():
                return SubscriptionTier.FREE.value
        return user.subscription_tier or SubscriptionTier.FREE.value
    
    def get_tier_limits(self, tier: str) -> Dict[str, Any]:
        """Get the limits for a specific tier."""
        return TIER_LIMITS.get(tier, TIER_LIMITS[SubscriptionTier.FREE.value])
    
    def check_and_reset_monthly_usage(self, db: Session, user: User) -> None:
        """Reset monthly usage counter if a new month has started."""
        now = datetime.utcnow()
        reset_at = user.generations_reset_at or now
        
        # Check if we're in a new month
        if now.year > reset_at.year or (now.year == reset_at.year and now.month > reset_at.month):
            user.generations_this_month = 0
            user.generations_reset_at = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            db.commit()
    
    def can_generate(self, db: Session, user: User) -> Dict[str, Any]:
        """
        Check if user can make a generation request.
        Returns dict with 'allowed' boolean and details.
        """
        # Reset monthly usage if needed
        self.check_and_reset_monthly_usage(db, user)
        
        tier = self.get_user_tier(user)
        limits = self.get_tier_limits(tier)
        
        generations_limit = limits["generations_per_month"]
        current_usage = user.generations_this_month or 0
        
        # Unlimited (-1) or under limit
        if generations_limit == -1 or current_usage < generations_limit:
            return {
                "allowed": True,
                "tier": tier,
                "used": current_usage,
                "limit": generations_limit,
                "remaining": -1 if generations_limit == -1 else (generations_limit - current_usage),
            }
        
        return {
            "allowed": False,
            "tier": tier,
            "used": current_usage,
            "limit": generations_limit,
            "remaining": 0,
            "message": f"You've reached your monthly limit of {generations_limit} generations. Upgrade to Pro for unlimited generations.",
            "upgrade_url": "/pricing",
        }
    
    def increment_usage(self, db: Session, user: User) -> Dict[str, Any]:
        """
        Increment user's generation count.
        Call this after a successful generation.
        """
        # Reset monthly usage if needed
        self.check_and_reset_monthly_usage(db, user)
        
        user.generations_this_month = (user.generations_this_month or 0) + 1
        user.total_generations = (user.total_generations or 0) + 1
        db.commit()
        
        tier = self.get_user_tier(user)
        limits = self.get_tier_limits(tier)
        generations_limit = limits["generations_per_month"]
        
        return {
            "used": user.generations_this_month,
            "limit": generations_limit,
            "remaining": -1 if generations_limit == -1 else max(0, generations_limit - user.generations_this_month),
            "total": user.total_generations,
        }
    
    def get_usage_stats(self, db: Session, user: User) -> Dict[str, Any]:
        """Get detailed usage statistics for a user."""
        # Reset monthly usage if needed
        self.check_and_reset_monthly_usage(db, user)
        
        tier = self.get_user_tier(user)
        limits = self.get_tier_limits(tier)
        generations_limit = limits["generations_per_month"]
        
        # Calculate days until reset
        now = datetime.utcnow()
        next_month = (now.replace(day=1) + timedelta(days=32)).replace(day=1)
        days_until_reset = (next_month - now).days
        
        return {
            "tier": tier,
            "generations": {
                "used": user.generations_this_month or 0,
                "limit": generations_limit,
                "remaining": -1 if generations_limit == -1 else max(0, generations_limit - (user.generations_this_month or 0)),
                "unlimited": generations_limit == -1,
                "percentage": 0 if generations_limit == -1 else min(100, round(((user.generations_this_month or 0) / generations_limit) * 100)),
            },
            "total_generations": user.total_generations or 0,
            "reset_date": next_month.isoformat(),
            "days_until_reset": days_until_reset,
            "limits": {
                "max_projects": limits["max_projects"],
                "max_files_per_project": limits["max_files_per_project"],
                "ai_providers": limits["ai_providers"],
            },
            "features": limits["features"],
            "subscription": {
                "tier": tier,
                "started_at": user.subscription_started_at.isoformat() if user.subscription_started_at else None,
                "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
                "is_active": tier != SubscriptionTier.FREE.value,
            },
        }
    
    def check_ai_provider_access(self, user: User, provider: str) -> bool:
        """Check if user has access to a specific AI provider."""
        tier = self.get_user_tier(user)
        limits = self.get_tier_limits(tier)
        return provider.lower() in limits["ai_providers"]
    
    def enforce_generation_limit(self, db: Session, user: User) -> None:
        """
        Enforce generation limit - raises HTTPException if limit exceeded.
        Call this before processing a generation request.
        """
        result = self.can_generate(db, user)
        if not result["allowed"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "generation_limit_exceeded",
                    "message": result["message"],
                    "used": result["used"],
                    "limit": result["limit"],
                    "upgrade_url": result.get("upgrade_url", "/pricing"),
                }
            )
    
    def enforce_ai_provider_access(self, user: User, provider: str) -> None:
        """
        Enforce AI provider access - raises HTTPException if not allowed.
        """
        if not self.check_ai_provider_access(user, provider):
            tier = self.get_user_tier(user)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "ai_provider_not_allowed",
                    "message": f"Your {tier} plan doesn't include access to {provider}. Upgrade to Pro for access to all AI providers.",
                    "current_tier": tier,
                    "requested_provider": provider,
                    "upgrade_url": "/pricing",
                }
            )


# Singleton instance
usage_service = UsageService()
