"""
Comprehensive Analytics Service for Intelekt App.
Provides tracking, aggregation, and reporting capabilities for all user activities.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
import uuid
import json

from models.database import (
    AnalyticsEvent, UserSession, ProjectAnalytics, DailyMetrics,
    UserMetrics, FeatureUsage, ConversionFunnel, AIUsageMetrics
)


class AnalyticsService:
    """Service for tracking and analyzing user behavior and system metrics."""

    # Event categories
    CATEGORY_USER = "user"
    CATEGORY_PROJECT = "project"
    CATEGORY_FRAMEWORK = "framework"
    CATEGORY_CHAT = "chat"
    CATEGORY_CODE_GEN = "code_generation"
    CATEGORY_EXPORT = "export"
    CATEGORY_DEPLOYMENT = "deployment"
    CATEGORY_GITHUB = "github"
    CATEGORY_SYSTEM = "system"

    # Event types
    EVENT_PAGE_VIEW = "page_view"
    EVENT_CLICK = "click"
    EVENT_FORM_SUBMIT = "form_submit"
    EVENT_API_CALL = "api_call"
    EVENT_ERROR = "error"
    EVENT_SUCCESS = "success"

    def __init__(self):
        self.batch_events: List[Dict] = []
        self.batch_size = 100

    # ==================== Event Tracking ====================

    def track_event(
        self,
        db: Session,
        event_type: str,
        event_category: str,
        event_action: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        event_label: Optional[str] = None,
        event_value: Optional[float] = None,
        properties: Optional[Dict] = None,
        page_url: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> AnalyticsEvent:
        """Track a single analytics event."""
        event = AnalyticsEvent(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            event_type=event_type,
            event_category=event_category,
            event_action=event_action,
            event_label=event_label,
            event_value=event_value,
            properties=properties or {},
            page_url=page_url,
            user_agent=user_agent,
            ip_address=ip_address,
            created_at=datetime.utcnow()
        )
        db.add(event)
        db.commit()
        return event

    def track_page_view(
        self,
        db: Session,
        page_url: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        referrer: Optional[str] = None
    ) -> AnalyticsEvent:
        """Track a page view event."""
        return self.track_event(
            db=db,
            event_type=self.EVENT_PAGE_VIEW,
            event_category=self.CATEGORY_USER,
            event_action="view_page",
            user_id=user_id,
            session_id=session_id,
            event_label=page_url,
            page_url=page_url,
            properties={"referrer": referrer} if referrer else None
        )

    def track_user_action(
        self,
        db: Session,
        action: str,
        user_id: str,
        properties: Optional[Dict] = None
    ) -> AnalyticsEvent:
        """Track a user action (login, signup, etc.)."""
        return self.track_event(
            db=db,
            event_type=self.EVENT_API_CALL,
            event_category=self.CATEGORY_USER,
            event_action=action,
            user_id=user_id,
            properties=properties
        )

    def track_project_event(
        self,
        db: Session,
        action: str,
        project_id: str,
        user_id: Optional[str] = None,
        properties: Optional[Dict] = None
    ) -> AnalyticsEvent:
        """Track project-related events."""
        props = properties or {}
        props["project_id"] = project_id
        return self.track_event(
            db=db,
            event_type=self.EVENT_API_CALL,
            event_category=self.CATEGORY_PROJECT,
            event_action=action,
            user_id=user_id,
            properties=props
        )

    def track_framework_event(
        self,
        db: Session,
        action: str,
        project_id: str,
        step_number: Optional[int] = None,
        phase: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> AnalyticsEvent:
        """Track framework-related events."""
        return self.track_event(
            db=db,
            event_type=self.EVENT_API_CALL,
            event_category=self.CATEGORY_FRAMEWORK,
            event_action=action,
            user_id=user_id,
            properties={
                "project_id": project_id,
                "step_number": step_number,
                "phase": phase
            }
        )

    def track_chat_event(
        self,
        db: Session,
        action: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        ai_provider: Optional[str] = None,
        response_time_ms: Optional[int] = None,
        tokens_used: Optional[int] = None
    ) -> AnalyticsEvent:
        """Track chat/AI interaction events."""
        return self.track_event(
            db=db,
            event_type=self.EVENT_API_CALL,
            event_category=self.CATEGORY_CHAT,
            event_action=action,
            user_id=user_id,
            event_value=response_time_ms,
            properties={
                "project_id": project_id,
                "ai_provider": ai_provider,
                "tokens_used": tokens_used,
                "response_time_ms": response_time_ms
            }
        )

    def track_code_generation(
        self,
        db: Session,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        tech_stack: Optional[str] = None,
        files_count: int = 0,
        lines_count: int = 0,
        success: bool = True
    ) -> AnalyticsEvent:
        """Track code generation events."""
        return self.track_event(
            db=db,
            event_type=self.EVENT_SUCCESS if success else self.EVENT_ERROR,
            event_category=self.CATEGORY_CODE_GEN,
            event_action="generate_code",
            user_id=user_id,
            properties={
                "project_id": project_id,
                "tech_stack": tech_stack,
                "files_count": files_count,
                "lines_count": lines_count,
                "success": success
            }
        )

    def track_ai_usage(
        self,
        db: Session,
        provider: str,
        request_type: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        response_time_ms: Optional[int] = None,
        success: bool = True,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        model: Optional[str] = None,
        error_type: Optional[str] = None
    ) -> AIUsageMetrics:
        """Track detailed AI provider usage."""
        # Estimate cost (rough estimates)
        cost_per_1k_input = 0.003 if provider == "claude" else 0.001
        cost_per_1k_output = 0.015 if provider == "claude" else 0.002
        cost = (input_tokens / 1000 * cost_per_1k_input) + (output_tokens / 1000 * cost_per_1k_output)

        usage = AIUsageMetrics(
            id=str(uuid.uuid4()),
            user_id=user_id,
            project_id=project_id,
            provider=provider,
            model=model,
            request_type=request_type,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            response_time_ms=response_time_ms,
            success=success,
            error_type=error_type,
            cost_usd=cost,
            created_at=datetime.utcnow()
        )
        db.add(usage)
        db.commit()
        return usage

    # ==================== Session Management ====================

    def start_session(
        self,
        db: Session,
        user_id: Optional[str] = None,
        entry_page: Optional[str] = None,
        device_type: Optional[str] = None,
        browser: Optional[str] = None,
        os: Optional[str] = None,
        country: Optional[str] = None,
        utm_source: Optional[str] = None,
        utm_medium: Optional[str] = None,
        utm_campaign: Optional[str] = None
    ) -> UserSession:
        """Start a new user session."""
        session = UserSession(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_start=datetime.utcnow(),
            entry_page=entry_page,
            device_type=device_type,
            browser=browser,
            os=os,
            country=country,
            utm_source=utm_source,
            utm_medium=utm_medium,
            utm_campaign=utm_campaign,
            page_views=1 if entry_page else 0
        )
        db.add(session)
        db.commit()
        return session

    def end_session(
        self,
        db: Session,
        session_id: str,
        exit_page: Optional[str] = None
    ) -> Optional[UserSession]:
        """End a user session and calculate duration."""
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if session:
            session.session_end = datetime.utcnow()
            session.exit_page = exit_page
            session.duration_seconds = int(
                (session.session_end - session.session_start).total_seconds()
            )
            session.is_bounced = session.page_views <= 1
            db.commit()
        return session

    def update_session(
        self,
        db: Session,
        session_id: str,
        page_view: bool = False,
        event: bool = False
    ) -> Optional[UserSession]:
        """Update session metrics."""
        session = db.query(UserSession).filter(UserSession.id == session_id).first()
        if session:
            if page_view:
                session.page_views += 1
            if event:
                session.events_count += 1
            db.commit()
        return session

    # ==================== Project Analytics ====================

    def get_or_create_project_analytics(
        self,
        db: Session,
        project_id: str,
        user_id: str
    ) -> ProjectAnalytics:
        """Get or create project analytics record."""
        analytics = db.query(ProjectAnalytics).filter(
            ProjectAnalytics.project_id == project_id
        ).first()
        
        if not analytics:
            analytics = ProjectAnalytics(
                id=str(uuid.uuid4()),
                project_id=project_id,
                user_id=user_id
            )
            db.add(analytics)
            db.commit()
        
        return analytics

    def update_project_framework_metrics(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        steps_completed: int = 0,
        steps_skipped: int = 0,
        phase_times: Optional[Dict] = None,
        completed: bool = False
    ):
        """Update framework metrics for a project."""
        analytics = self.get_or_create_project_analytics(db, project_id, user_id)
        
        if not analytics.framework_started_at:
            analytics.framework_started_at = datetime.utcnow()
        
        analytics.framework_steps_completed = steps_completed
        analytics.framework_steps_skipped = steps_skipped
        
        if phase_times:
            analytics.framework_phase_times = phase_times
        
        if completed and not analytics.framework_completed_at:
            analytics.framework_completed_at = datetime.utcnow()
            if analytics.framework_started_at:
                delta = analytics.framework_completed_at - analytics.framework_started_at
                analytics.framework_completion_time_minutes = int(delta.total_seconds() / 60)
        
        analytics.last_activity_at = datetime.utcnow()
        db.commit()

    def update_project_chat_metrics(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        messages: int = 1,
        ai_responses: int = 0,
        response_time_ms: Optional[int] = None,
        tokens: int = 0,
        provider: str = "claude"
    ):
        """Update chat metrics for a project."""
        analytics = self.get_or_create_project_analytics(db, project_id, user_id)
        
        analytics.total_chat_messages += messages
        analytics.total_ai_responses += ai_responses
        analytics.total_tokens_used += tokens
        
        if provider == "claude":
            analytics.claude_messages += messages
        else:
            analytics.grok_messages += messages
        
        if response_time_ms:
            if analytics.avg_response_time_ms:
                # Running average
                analytics.avg_response_time_ms = (
                    analytics.avg_response_time_ms * 0.9 + response_time_ms * 0.1
                )
            else:
                analytics.avg_response_time_ms = response_time_ms
        
        analytics.last_activity_at = datetime.utcnow()
        db.commit()

    def update_project_code_metrics(
        self,
        db: Session,
        project_id: str,
        user_id: str,
        generations: int = 1,
        files: int = 0,
        lines: int = 0,
        success: bool = True,
        language: Optional[str] = None
    ):
        """Update code generation metrics for a project."""
        analytics = self.get_or_create_project_analytics(db, project_id, user_id)
        
        analytics.total_code_generations += generations
        analytics.total_files_generated += files
        analytics.total_lines_generated += lines
        
        # Update success rate
        total = analytics.total_code_generations
        if analytics.code_gen_success_rate is None:
            analytics.code_gen_success_rate = 1.0 if success else 0.0
        else:
            current_successes = int(analytics.code_gen_success_rate * (total - 1))
            new_successes = current_successes + (1 if success else 0)
            analytics.code_gen_success_rate = new_successes / total
        
        # Update languages used
        if language:
            languages = analytics.languages_used or {}
            languages[language] = languages.get(language, 0) + 1
            analytics.languages_used = languages
        
        analytics.last_activity_at = datetime.utcnow()
        db.commit()

    # ==================== User Metrics ====================

    def get_or_create_user_metrics(
        self,
        db: Session,
        user_id: str
    ) -> UserMetrics:
        """Get or create user metrics record."""
        metrics = db.query(UserMetrics).filter(
            UserMetrics.user_id == user_id
        ).first()
        
        if not metrics:
            metrics = UserMetrics(
                id=str(uuid.uuid4()),
                user_id=user_id,
                first_seen_at=datetime.utcnow()
            )
            db.add(metrics)
            db.commit()
        
        return metrics

    def update_user_activity(
        self,
        db: Session,
        user_id: str,
        session_duration_minutes: int = 0
    ):
        """Update user activity metrics."""
        metrics = self.get_or_create_user_metrics(db, user_id)
        metrics.last_seen_at = datetime.utcnow()
        metrics.total_sessions += 1
        metrics.total_time_spent_minutes += session_duration_minutes
        
        # Update engagement score (simple algorithm)
        days_active = max(1, (datetime.utcnow() - metrics.first_seen_at).days)
        metrics.engagement_score = min(100, (
            (metrics.total_sessions / days_active * 10) +
            (metrics.total_projects * 5) +
            (metrics.frameworks_completed * 10) +
            (metrics.total_code_generations * 2)
        ))
        
        db.commit()

    def update_user_project_metrics(
        self,
        db: Session,
        user_id: str,
        new_project: bool = False,
        completed_project: bool = False
    ):
        """Update user's project metrics."""
        metrics = self.get_or_create_user_metrics(db, user_id)
        
        if new_project:
            metrics.total_projects += 1
            metrics.active_projects += 1
        
        if completed_project:
            metrics.completed_projects += 1
            if metrics.active_projects > 0:
                metrics.active_projects -= 1
        
        db.commit()

    # ==================== Feature Usage Tracking ====================

    def track_feature_usage(
        self,
        db: Session,
        feature_name: str,
        feature_category: str,
        user_id: Optional[str] = None
    ):
        """Track feature usage."""
        existing = db.query(FeatureUsage).filter(
            and_(
                FeatureUsage.user_id == user_id,
                FeatureUsage.feature_name == feature_name
            )
        ).first()
        
        if existing:
            existing.usage_count += 1
            existing.last_used_at = datetime.utcnow()
        else:
            usage = FeatureUsage(
                id=str(uuid.uuid4()),
                user_id=user_id,
                feature_name=feature_name,
                feature_category=feature_category
            )
            db.add(usage)
        
        db.commit()

    # ==================== Conversion Funnel ====================

    def track_funnel_step(
        self,
        db: Session,
        funnel_name: str,
        step_name: str,
        step_order: int,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        completed: bool = True,
        time_to_complete_seconds: Optional[int] = None
    ):
        """Track a conversion funnel step."""
        funnel = ConversionFunnel(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=session_id,
            funnel_name=funnel_name,
            step_name=step_name,
            step_order=step_order,
            completed=completed,
            time_to_complete_seconds=time_to_complete_seconds,
            dropped_off=not completed
        )
        db.add(funnel)
        db.commit()

    # ==================== Daily Metrics Aggregation ====================

    def aggregate_daily_metrics(self, db: Session, date: datetime = None):
        """Aggregate metrics for a given day."""
        if not date:
            date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        start = date
        end = date + timedelta(days=1)
        
        # Count events by category
        events = db.query(AnalyticsEvent).filter(
            and_(
                AnalyticsEvent.created_at >= start,
                AnalyticsEvent.created_at < end
            )
        ).all()
        
        # Count sessions
        sessions = db.query(UserSession).filter(
            and_(
                UserSession.session_start >= start,
                UserSession.session_start < end
            )
        ).all()
        
        # Count unique users
        unique_users = set(e.user_id for e in events if e.user_id)
        
        # Calculate metrics
        framework_events = [e for e in events if e.event_category == self.CATEGORY_FRAMEWORK]
        code_events = [e for e in events if e.event_category == self.CATEGORY_CODE_GEN]
        chat_events = [e for e in events if e.event_category == self.CATEGORY_CHAT]
        preview_events = [e for e in events if e.event_category == "preview"]
        bounced = len([s for s in sessions if s.is_bounced])
        bounce_rate = bounced / len(sessions) if sessions else 0
        
        # Calculate avg session duration
        durations = [s.duration_seconds for s in sessions if s.duration_seconds]
        avg_duration = sum(durations) / len(durations) / 60 if durations else 0
        
        # Check if metrics already exist for this date
        existing = db.query(DailyMetrics).filter(
            and_(
                DailyMetrics.date == date,
                DailyMetrics.metric_type == "all"
            )
        ).first()
        
        if existing:
            metrics = existing
        else:
            metrics = DailyMetrics(
                id=str(uuid.uuid4()),
                date=date,
                metric_type="all"
            )
            db.add(metrics)
        
        metrics.active_users = len(unique_users)
        metrics.total_sessions = len(sessions)
        metrics.total_chat_messages = len(chat_events)
        metrics.total_code_generations = len(code_events)
        metrics.framework_starts = len([e for e in framework_events if e.event_action == "start"])
        metrics.framework_completions = len([e for e in framework_events if e.event_action == "complete"])
        metrics.bounce_rate = bounce_rate
        metrics.avg_session_duration_minutes = avg_duration
        
        db.commit()
        return metrics

    # ==================== Analytics Queries ====================

    def get_dashboard_metrics(
        self,
        db: Session,
        user_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive dashboard metrics."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Build query filters
        event_filters = [AnalyticsEvent.created_at >= start_date]
        session_filters = [UserSession.session_start >= start_date]
        
        if user_id:
            event_filters.append(AnalyticsEvent.user_id == user_id)
            session_filters.append(UserSession.user_id == user_id)
        
        # Count events by category
        events_by_category = db.query(
            AnalyticsEvent.event_category,
            func.count(AnalyticsEvent.id).label("count")
        ).filter(*event_filters).group_by(AnalyticsEvent.event_category).all()
        
        # Sessions stats
        sessions = db.query(UserSession).filter(*session_filters).all()
        total_sessions = len(sessions)
        avg_session_duration = 0
        if sessions:
            durations = [s.duration_seconds for s in sessions if s.duration_seconds]
            avg_session_duration = sum(durations) / len(durations) / 60 if durations else 0
        
        # Daily active users trend
        daily_users = db.query(
            func.date(AnalyticsEvent.created_at).label("date"),
            func.count(func.distinct(AnalyticsEvent.user_id)).label("users")
        ).filter(*event_filters).group_by(
            func.date(AnalyticsEvent.created_at)
        ).order_by("date").all()
        
        # AI usage stats
        ai_filters = [AIUsageMetrics.created_at >= start_date]
        if user_id:
            ai_filters.append(AIUsageMetrics.user_id == user_id)
        
        ai_stats = db.query(
            AIUsageMetrics.provider,
            func.count(AIUsageMetrics.id).label("requests"),
            func.sum(AIUsageMetrics.total_tokens).label("tokens"),
            func.avg(AIUsageMetrics.response_time_ms).label("avg_response_time"),
            func.sum(AIUsageMetrics.cost_usd).label("total_cost")
        ).filter(*ai_filters).group_by(AIUsageMetrics.provider).all()
        
        # Feature usage
        feature_filters = [FeatureUsage.last_used_at >= start_date]
        if user_id:
            feature_filters.append(FeatureUsage.user_id == user_id)
        
        top_features = db.query(
            FeatureUsage.feature_name,
            func.sum(FeatureUsage.usage_count).label("total_usage")
        ).filter(*feature_filters).group_by(
            FeatureUsage.feature_name
        ).order_by(desc("total_usage")).limit(10).all()
        
        return {
            "period_days": days,
            "total_sessions": total_sessions,
            "avg_session_duration_minutes": round(avg_session_duration, 2),
            "events_by_category": {e.event_category: e.count for e in events_by_category},
            "daily_active_users": [{"date": str(d.date), "users": d.users} for d in daily_users],
            "ai_usage": {
                s.provider: {
                    "requests": s.requests,
                    "tokens": s.tokens or 0,
                    "avg_response_time_ms": round(s.avg_response_time or 0, 2),
                    "total_cost_usd": round(s.total_cost or 0, 4)
                } for s in ai_stats
            },
            "top_features": [{"name": f.feature_name, "usage": f.total_usage} for f in top_features]
        }

    def get_user_analytics(
        self,
        db: Session,
        user_id: str
    ) -> Dict[str, Any]:
        """Get analytics for a specific user."""
        metrics = self.get_or_create_user_metrics(db, user_id)
        
        # Get recent activity
        recent_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.user_id == user_id
        ).order_by(desc(AnalyticsEvent.created_at)).limit(20).all()
        
        # Get project analytics
        projects = db.query(ProjectAnalytics).filter(
            ProjectAnalytics.user_id == user_id
        ).all()
        
        return {
            "user_id": user_id,
            "metrics": {
                "first_seen": str(metrics.first_seen_at) if metrics.first_seen_at else None,
                "last_seen": str(metrics.last_seen_at) if metrics.last_seen_at else None,
                "total_sessions": metrics.total_sessions,
                "total_time_spent_minutes": metrics.total_time_spent_minutes,
                "engagement_score": round(metrics.engagement_score, 2),
                "total_projects": metrics.total_projects,
                "active_projects": metrics.active_projects,
                "completed_projects": metrics.completed_projects,
                "frameworks_started": metrics.frameworks_started,
                "frameworks_completed": metrics.frameworks_completed,
                "total_chat_messages": metrics.total_chat_messages,
                "total_code_generations": metrics.total_code_generations,
                "total_files_generated": metrics.total_files_generated,
                "preferred_tech_stack": metrics.preferred_tech_stack,
                "favorite_ai_provider": metrics.favorite_ai_provider
            },
            "recent_activity": [
                {
                    "type": e.event_type,
                    "category": e.event_category,
                    "action": e.event_action,
                    "timestamp": str(e.created_at)
                } for e in recent_events
            ],
            "projects": [
                {
                    "project_id": p.project_id,
                    "framework_completed": p.framework_completed_at is not None,
                    "chat_messages": p.total_chat_messages,
                    "code_generations": p.total_code_generations,
                    "files_generated": p.total_files_generated,
                    "last_activity": str(p.last_activity_at) if p.last_activity_at else None
                } for p in projects
            ]
        }

    def get_project_analytics(
        self,
        db: Session,
        project_id: str
    ) -> Dict[str, Any]:
        """Get analytics for a specific project."""
        analytics = db.query(ProjectAnalytics).filter(
            ProjectAnalytics.project_id == project_id
        ).first()
        
        if not analytics:
            return {"project_id": project_id, "message": "No analytics found"}
        
        # Get events for this project
        events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.properties.contains({"project_id": project_id})
        ).order_by(desc(AnalyticsEvent.created_at)).limit(50).all()
        
        return {
            "project_id": project_id,
            "framework": {
                "started_at": str(analytics.framework_started_at) if analytics.framework_started_at else None,
                "completed_at": str(analytics.framework_completed_at) if analytics.framework_completed_at else None,
                "completion_time_minutes": analytics.framework_completion_time_minutes,
                "steps_completed": analytics.framework_steps_completed,
                "steps_skipped": analytics.framework_steps_skipped,
                "phase_times": analytics.framework_phase_times
            },
            "chat": {
                "total_messages": analytics.total_chat_messages,
                "ai_responses": analytics.total_ai_responses,
                "avg_response_time_ms": analytics.avg_response_time_ms,
                "tokens_used": analytics.total_tokens_used,
                "claude_messages": analytics.claude_messages,
                "grok_messages": analytics.grok_messages
            },
            "code_generation": {
                "total_generations": analytics.total_code_generations,
                "files_generated": analytics.total_files_generated,
                "lines_generated": analytics.total_lines_generated,
                "success_rate": analytics.code_gen_success_rate,
                "languages_used": analytics.languages_used
            },
            "engagement": {
                "total_sessions": analytics.total_sessions,
                "time_spent_minutes": analytics.total_time_spent_minutes,
                "last_activity": str(analytics.last_activity_at) if analytics.last_activity_at else None,
                "exports": analytics.total_exports,
                "deployments": analytics.total_deployments,
                "github_pushes": analytics.github_pushes
            },
            "recent_events": [
                {
                    "type": e.event_type,
                    "category": e.event_category,
                    "action": e.event_action,
                    "timestamp": str(e.created_at)
                } for e in events[:20]
            ]
        }

    def get_framework_analytics(
        self,
        db: Session,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get framework completion analytics."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all project analytics
        projects = db.query(ProjectAnalytics).filter(
            ProjectAnalytics.created_at >= start_date
        ).all()
        
        completed = [p for p in projects if p.framework_completed_at]
        
        # Calculate metrics
        completion_times = [p.framework_completion_time_minutes for p in completed if p.framework_completion_time_minutes]
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        # Phase-wise breakdown
        phase_times = {}
        for p in completed:
            if p.framework_phase_times:
                for phase, time in p.framework_phase_times.items():
                    if phase not in phase_times:
                        phase_times[phase] = []
                    phase_times[phase].append(time)
        
        avg_phase_times = {
            phase: sum(times) / len(times) for phase, times in phase_times.items()
        }
        
        return {
            "period_days": days,
            "total_started": len(projects),
            "total_completed": len(completed),
            "completion_rate": len(completed) / len(projects) * 100 if projects else 0,
            "avg_completion_time_minutes": round(avg_completion_time, 2),
            "avg_phase_times": avg_phase_times,
            "steps_completion_distribution": {
                str(i): len([p for p in projects if p.framework_steps_completed == i])
                for i in range(25)
            }
        }

    def get_ai_provider_analytics(
        self,
        db: Session,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get AI provider usage analytics."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        usage = db.query(AIUsageMetrics).filter(
            AIUsageMetrics.created_at >= start_date
        ).all()
        
        providers = {}
        for u in usage:
            if u.provider not in providers:
                providers[u.provider] = {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "failed_requests": 0,
                    "total_input_tokens": 0,
                    "total_output_tokens": 0,
                    "total_cost_usd": 0,
                    "response_times": []
                }
            
            p = providers[u.provider]
            p["total_requests"] += 1
            if u.success:
                p["successful_requests"] += 1
            else:
                p["failed_requests"] += 1
            p["total_input_tokens"] += u.input_tokens or 0
            p["total_output_tokens"] += u.output_tokens or 0
            p["total_cost_usd"] += u.cost_usd or 0
            if u.response_time_ms:
                p["response_times"].append(u.response_time_ms)
        
        # Calculate averages
        for provider, data in providers.items():
            times = data.pop("response_times")
            data["avg_response_time_ms"] = sum(times) / len(times) if times else 0
            data["success_rate"] = data["successful_requests"] / data["total_requests"] * 100 if data["total_requests"] else 0
            data["total_cost_usd"] = round(data["total_cost_usd"], 4)
        
        # Daily trend
        daily_trend = db.query(
            func.date(AIUsageMetrics.created_at).label("date"),
            AIUsageMetrics.provider,
            func.count(AIUsageMetrics.id).label("requests"),
            func.sum(AIUsageMetrics.total_tokens).label("tokens")
        ).filter(
            AIUsageMetrics.created_at >= start_date
        ).group_by(
            func.date(AIUsageMetrics.created_at),
            AIUsageMetrics.provider
        ).order_by("date").all()
        
        return {
            "period_days": days,
            "providers": providers,
            "daily_trend": [
                {
                    "date": str(d.date),
                    "provider": d.provider,
                    "requests": d.requests,
                    "tokens": d.tokens or 0
                } for d in daily_trend
            ]
        }

    def get_conversion_funnel_analytics(
        self,
        db: Session,
        funnel_name: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get conversion funnel analytics."""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        steps = db.query(ConversionFunnel).filter(
            and_(
                ConversionFunnel.funnel_name == funnel_name,
                ConversionFunnel.created_at >= start_date
            )
        ).all()
        
        # Group by step
        step_data = {}
        for s in steps:
            if s.step_name not in step_data:
                step_data[s.step_name] = {
                    "order": s.step_order,
                    "started": 0,
                    "completed": 0,
                    "dropped": 0,
                    "times": []
                }
            step_data[s.step_name]["started"] += 1
            if s.completed:
                step_data[s.step_name]["completed"] += 1
            if s.dropped_off:
                step_data[s.step_name]["dropped"] += 1
            if s.time_to_complete_seconds:
                step_data[s.step_name]["times"].append(s.time_to_complete_seconds)
        
        # Calculate conversion rates
        funnel_steps = sorted(step_data.items(), key=lambda x: x[1]["order"])
        prev_completed = None
        
        for step_name, data in funnel_steps:
            times = data.pop("times")
            data["avg_time_seconds"] = sum(times) / len(times) if times else 0
            data["completion_rate"] = data["completed"] / data["started"] * 100 if data["started"] else 0
            
            if prev_completed is not None:
                data["conversion_from_previous"] = data["started"] / prev_completed * 100 if prev_completed else 0
            else:
                data["conversion_from_previous"] = 100
            
            prev_completed = data["completed"]
        
        return {
            "funnel_name": funnel_name,
            "period_days": days,
            "steps": dict(funnel_steps),
            "overall_conversion": (
                funnel_steps[-1][1]["completed"] / funnel_steps[0][1]["started"] * 100
                if funnel_steps and funnel_steps[0][1]["started"] > 0 else 0
            )
        }

    def get_realtime_metrics(self, db: Session) -> Dict[str, Any]:
        """Get real-time metrics (last 5 minutes)."""
        cutoff = datetime.utcnow() - timedelta(minutes=5)
        
        # Active sessions
        active_sessions = db.query(UserSession).filter(
            and_(
                UserSession.session_start >= cutoff,
                UserSession.session_end.is_(None)
            )
        ).count()
        
        # Recent events
        recent_events = db.query(AnalyticsEvent).filter(
            AnalyticsEvent.created_at >= cutoff
        ).count()
        
        # Active users
        active_users = db.query(func.count(func.distinct(AnalyticsEvent.user_id))).filter(
            AnalyticsEvent.created_at >= cutoff
        ).scalar()
        
        return {
            "active_sessions": active_sessions,
            "recent_events": recent_events,
            "active_users": active_users or 0,
            "timestamp": datetime.utcnow().isoformat()
        }


# Create singleton instance
analytics_service = AnalyticsService()
