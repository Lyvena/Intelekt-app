"""
Usage tracking and subscription API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from models.database import get_db
from models.database.user import User, SubscriptionTier
from utils.auth import get_current_user
from services.usage_service import usage_service, TIER_LIMITS

router = APIRouter(prefix="/api/usage", tags=["usage"])


class UsageResponse(BaseModel):
    """Response model for usage stats."""
    tier: str
    generations: Dict[str, Any]
    total_generations: int
    reset_date: str
    days_until_reset: int
    limits: Dict[str, Any]
    features: List[str]
    subscription: Dict[str, Any]


class TierInfo(BaseModel):
    """Information about a subscription tier."""
    name: str
    generations_per_month: int
    max_projects: int
    max_files_per_project: int
    ai_providers: List[str]
    features: List[str]
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None


class CanGenerateResponse(BaseModel):
    """Response model for can_generate check."""
    allowed: bool
    tier: str
    used: int
    limit: int
    remaining: int
    message: Optional[str] = None
    upgrade_url: Optional[str] = None


@router.get("", response_model=UsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's usage statistics."""
    return usage_service.get_usage_stats(db, current_user)


@router.get("/can-generate", response_model=CanGenerateResponse)
async def can_generate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user can make a generation request."""
    return usage_service.can_generate(db, current_user)


@router.get("/tiers")
async def get_tiers():
    """Get information about all subscription tiers."""
    tiers = []
    pricing = {
        SubscriptionTier.FREE.value: {"monthly": 0, "yearly": 0},
        SubscriptionTier.PRO.value: {"monthly": 19, "yearly": 190},
        SubscriptionTier.ENTERPRISE.value: {"monthly": 99, "yearly": 990},
    }
    
    for tier_name, limits in TIER_LIMITS.items():
        tiers.append({
            "name": tier_name,
            "display_name": tier_name.capitalize(),
            "generations_per_month": limits["generations_per_month"],
            "max_projects": limits["max_projects"],
            "max_files_per_project": limits["max_files_per_project"],
            "ai_providers": limits["ai_providers"],
            "features": limits["features"],
            "price_monthly": pricing[tier_name]["monthly"],
            "price_yearly": pricing[tier_name]["yearly"],
            "is_popular": tier_name == SubscriptionTier.PRO.value,
        })
    
    return {"tiers": tiers}


@router.post("/check-provider/{provider}")
async def check_provider_access(
    provider: str,
    current_user: User = Depends(get_current_user)
):
    """Check if user has access to a specific AI provider."""
    has_access = usage_service.check_ai_provider_access(current_user, provider)
    tier = usage_service.get_user_tier(current_user)
    limits = usage_service.get_tier_limits(tier)
    
    return {
        "provider": provider,
        "has_access": has_access,
        "tier": tier,
        "available_providers": limits["ai_providers"],
        "upgrade_required": not has_access,
    }


@router.get("/history")
async def get_usage_history(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get usage history for the past N days."""
    from models.database.analytics import AIUsageMetrics
    from datetime import timedelta
    from sqlalchemy import func
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get daily generation counts
    daily_usage = db.query(
        func.date(AIUsageMetrics.created_at).label('date'),
        func.count(AIUsageMetrics.id).label('count')
    ).filter(
        AIUsageMetrics.user_id == current_user.id,
        AIUsageMetrics.created_at >= start_date,
        AIUsageMetrics.success == True
    ).group_by(
        func.date(AIUsageMetrics.created_at)
    ).order_by(
        func.date(AIUsageMetrics.created_at)
    ).all()
    
    # Get provider breakdown
    provider_usage = db.query(
        AIUsageMetrics.provider,
        func.count(AIUsageMetrics.id).label('count')
    ).filter(
        AIUsageMetrics.user_id == current_user.id,
        AIUsageMetrics.created_at >= start_date,
        AIUsageMetrics.success == True
    ).group_by(
        AIUsageMetrics.provider
    ).all()
    
    return {
        "period_days": days,
        "daily_usage": [{"date": str(d.date), "count": d.count} for d in daily_usage],
        "provider_breakdown": {p.provider: p.count for p in provider_usage},
        "total": sum(d.count for d in daily_usage),
    }
