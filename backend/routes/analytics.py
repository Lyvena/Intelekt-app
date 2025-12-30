"""
Analytics API Routes for Intelekt App.
Provides endpoints for tracking events and retrieving analytics data.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from datetime import datetime

from models.database import get_db
from services.analytics_service import analytics_service


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ==================== Request/Response Models ====================

class TrackEventRequest(BaseModel):
    """Request model for tracking an event."""
    event_type: str
    event_category: str
    event_action: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    event_label: Optional[str] = None
    event_value: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None
    page_url: Optional[str] = None


class TrackPageViewRequest(BaseModel):
    """Request model for tracking a page view."""
    page_url: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    referrer: Optional[str] = None


class StartSessionRequest(BaseModel):
    """Request model for starting a session."""
    user_id: Optional[str] = None
    entry_page: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    country: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None


class EndSessionRequest(BaseModel):
    """Request model for ending a session."""
    session_id: str
    exit_page: Optional[str] = None


class TrackAIUsageRequest(BaseModel):
    """Request model for tracking AI usage."""
    provider: str
    request_type: str
    input_tokens: int = 0
    output_tokens: int = 0
    response_time_ms: Optional[int] = None
    success: bool = True
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    model: Optional[str] = None
    error_type: Optional[str] = None


class TrackFeatureUsageRequest(BaseModel):
    """Request model for tracking feature usage."""
    feature_name: str
    feature_category: str
    user_id: Optional[str] = None


class TrackFunnelStepRequest(BaseModel):
    """Request model for tracking funnel steps."""
    funnel_name: str
    step_name: str
    step_order: int
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    completed: bool = True
    time_to_complete_seconds: Optional[int] = None


class BatchEventsRequest(BaseModel):
    """Request model for batch event tracking."""
    events: List[TrackEventRequest]


# ==================== Event Tracking Endpoints ====================

@router.post("/track")
async def track_event(
    request: TrackEventRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Track a single analytics event."""
    try:
        event = analytics_service.track_event(
            db=db,
            event_type=request.event_type,
            event_category=request.event_category,
            event_action=request.event_action,
            user_id=request.user_id,
            session_id=request.session_id,
            event_label=request.event_label,
            event_value=request.event_value,
            properties=request.properties,
            page_url=request.page_url,
            user_agent=http_request.headers.get("user-agent"),
            ip_address=http_request.client.host if http_request.client else None
        )
        return {"success": True, "event_id": event.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/batch")
async def track_batch_events(
    request: BatchEventsRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    """Track multiple events in a batch."""
    try:
        event_ids = []
        for event_req in request.events:
            event = analytics_service.track_event(
                db=db,
                event_type=event_req.event_type,
                event_category=event_req.event_category,
                event_action=event_req.event_action,
                user_id=event_req.user_id,
                session_id=event_req.session_id,
                event_label=event_req.event_label,
                event_value=event_req.event_value,
                properties=event_req.properties,
                page_url=event_req.page_url,
                user_agent=http_request.headers.get("user-agent"),
                ip_address=http_request.client.host if http_request.client else None
            )
            event_ids.append(event.id)
        return {"success": True, "events_tracked": len(event_ids), "event_ids": event_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/pageview")
async def track_page_view(
    request: TrackPageViewRequest,
    db: Session = Depends(get_db)
):
    """Track a page view event."""
    try:
        event = analytics_service.track_page_view(
            db=db,
            page_url=request.page_url,
            user_id=request.user_id,
            session_id=request.session_id,
            referrer=request.referrer
        )
        return {"success": True, "event_id": event.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/ai-usage")
async def track_ai_usage(
    request: TrackAIUsageRequest,
    db: Session = Depends(get_db)
):
    """Track AI provider usage."""
    try:
        usage = analytics_service.track_ai_usage(
            db=db,
            provider=request.provider,
            request_type=request.request_type,
            input_tokens=request.input_tokens,
            output_tokens=request.output_tokens,
            response_time_ms=request.response_time_ms,
            success=request.success,
            user_id=request.user_id,
            project_id=request.project_id,
            model=request.model,
            error_type=request.error_type
        )
        return {"success": True, "usage_id": usage.id, "estimated_cost_usd": usage.cost_usd}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/feature")
async def track_feature_usage(
    request: TrackFeatureUsageRequest,
    db: Session = Depends(get_db)
):
    """Track feature usage."""
    try:
        analytics_service.track_feature_usage(
            db=db,
            feature_name=request.feature_name,
            feature_category=request.feature_category,
            user_id=request.user_id
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/track/funnel")
async def track_funnel_step(
    request: TrackFunnelStepRequest,
    db: Session = Depends(get_db)
):
    """Track a conversion funnel step."""
    try:
        analytics_service.track_funnel_step(
            db=db,
            funnel_name=request.funnel_name,
            step_name=request.step_name,
            step_order=request.step_order,
            user_id=request.user_id,
            session_id=request.session_id,
            completed=request.completed,
            time_to_complete_seconds=request.time_to_complete_seconds
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Session Management Endpoints ====================

@router.post("/session/start")
async def start_session(
    request: StartSessionRequest,
    db: Session = Depends(get_db)
):
    """Start a new user session."""
    try:
        session = analytics_service.start_session(
            db=db,
            user_id=request.user_id,
            entry_page=request.entry_page,
            device_type=request.device_type,
            browser=request.browser,
            os=request.os,
            country=request.country,
            utm_source=request.utm_source,
            utm_medium=request.utm_medium,
            utm_campaign=request.utm_campaign
        )
        return {"success": True, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/session/end")
async def end_session(
    request: EndSessionRequest,
    db: Session = Depends(get_db)
):
    """End a user session."""
    try:
        session = analytics_service.end_session(
            db=db,
            session_id=request.session_id,
            exit_page=request.exit_page
        )
        if session:
            return {
                "success": True,
                "duration_seconds": session.duration_seconds,
                "page_views": session.page_views,
                "is_bounced": session.is_bounced
            }
        return {"success": False, "message": "Session not found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Dashboard & Analytics Endpoints ====================

@router.get("/dashboard")
async def get_dashboard_metrics(
    user_id: Optional[str] = Query(None),
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard metrics."""
    try:
        metrics = analytics_service.get_dashboard_metrics(
            db=db,
            user_id=user_id,
            days=days
        )
        return {"success": True, "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime")
async def get_realtime_metrics(db: Session = Depends(get_db)):
    """Get real-time metrics (last 5 minutes)."""
    try:
        metrics = analytics_service.get_realtime_metrics(db)
        return {"success": True, "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_analytics(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get analytics for a specific user."""
    try:
        analytics = analytics_service.get_user_analytics(db, user_id)
        return {"success": True, "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}")
async def get_project_analytics(
    project_id: str,
    db: Session = Depends(get_db)
):
    """Get analytics for a specific project."""
    try:
        analytics = analytics_service.get_project_analytics(db, project_id)
        return {"success": True, "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/framework")
async def get_framework_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get framework completion analytics."""
    try:
        analytics = analytics_service.get_framework_analytics(db, days)
        return {"success": True, "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/product")
async def get_product_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get product engagement metrics (framework + preview)."""
    try:
        analytics = analytics_service.get_product_metrics(db, days)
        return {"success": True, "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ai-providers")
async def get_ai_provider_analytics(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get AI provider usage analytics."""
    try:
        analytics = analytics_service.get_ai_provider_analytics(db, days)
        return {"success": True, "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/funnel/{funnel_name}")
async def get_funnel_analytics(
    funnel_name: str,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db)
):
    """Get conversion funnel analytics."""
    try:
        analytics = analytics_service.get_conversion_funnel_analytics(
            db, funnel_name, days
        )
        return {"success": True, "data": analytics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Admin Endpoints ====================

@router.post("/aggregate/daily")
async def aggregate_daily_metrics(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    """Aggregate daily metrics (admin endpoint)."""
    try:
        target_date = None
        if date:
            target_date = datetime.strptime(date, "%Y-%m-%d")
        
        metrics = analytics_service.aggregate_daily_metrics(db, target_date)
        return {
            "success": True,
            "date": str(metrics.date),
            "active_users": metrics.active_users,
            "total_sessions": metrics.total_sessions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/export")
async def export_analytics(
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
    metrics_type: str = Query("all", description="Type of metrics to export"),
    db: Session = Depends(get_db)
):
    """Export analytics data for a date range."""
    try:
        from models.database import DailyMetrics
        
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        
        metrics = db.query(DailyMetrics).filter(
            DailyMetrics.date >= start,
            DailyMetrics.date <= end
        ).order_by(DailyMetrics.date).all()
        
        return {
            "success": True,
            "start_date": start_date,
            "end_date": end_date,
            "data": [
                {
                    "date": str(m.date),
                    "active_users": m.active_users,
                    "new_users": m.new_users,
                    "total_sessions": m.total_sessions,
                    "total_chat_messages": m.total_chat_messages,
                    "total_code_generations": m.total_code_generations,
                    "framework_starts": m.framework_starts,
                    "framework_completions": m.framework_completions,
                    "bounce_rate": m.bounce_rate,
                    "avg_session_duration_minutes": m.avg_session_duration_minutes
                } for m in metrics
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
