from sqlalchemy import Column, String, DateTime, Integer, Float, Text, ForeignKey, JSON, Boolean, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base
import uuid


class AnalyticsEvent(Base):
    """Analytics event tracking model - captures all user actions."""
    __tablename__ = "analytics_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    event_category = Column(String, nullable=False, index=True)  # user, project, framework, chat, code_gen, etc.
    event_action = Column(String, nullable=False)  # specific action taken
    event_label = Column(String, nullable=True)  # additional context
    event_value = Column(Float, nullable=True)  # numeric value if applicable
    properties = Column(JSON, nullable=True)  # additional event properties
    page_url = Column(String, nullable=True)
    referrer = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    device_type = Column(String, nullable=True)  # desktop, mobile, tablet
    browser = Column(String, nullable=True)
    os = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('idx_events_user_date', 'user_id', 'created_at'),
        Index('idx_events_category_date', 'event_category', 'created_at'),
        Index('idx_events_type_date', 'event_type', 'created_at'),
    )


class UserSession(Base):
    """User session tracking for engagement analytics."""
    __tablename__ = "user_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    session_start = Column(DateTime, default=datetime.utcnow, index=True)
    session_end = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    page_views = Column(Integer, default=0)
    events_count = Column(Integer, default=0)
    entry_page = Column(String, nullable=True)
    exit_page = Column(String, nullable=True)
    device_type = Column(String, nullable=True)
    browser = Column(String, nullable=True)
    os = Column(String, nullable=True)
    country = Column(String, nullable=True)
    city = Column(String, nullable=True)
    is_bounced = Column(Boolean, default=False)  # Single page visit
    utm_source = Column(String, nullable=True)
    utm_medium = Column(String, nullable=True)
    utm_campaign = Column(String, nullable=True)

    __table_args__ = (
        Index('idx_sessions_user_date', 'user_id', 'session_start'),
    )


class ProjectAnalytics(Base):
    """Project-level analytics aggregation."""
    __tablename__ = "project_analytics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, nullable=False, unique=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Framework metrics
    framework_started_at = Column(DateTime, nullable=True)
    framework_completed_at = Column(DateTime, nullable=True)
    framework_completion_time_minutes = Column(Integer, nullable=True)
    framework_steps_completed = Column(Integer, default=0)
    framework_steps_skipped = Column(Integer, default=0)
    framework_phase_times = Column(JSON, nullable=True)  # Time spent per phase
    
    # Chat/AI metrics
    total_chat_messages = Column(Integer, default=0)
    total_ai_responses = Column(Integer, default=0)
    avg_response_time_ms = Column(Float, nullable=True)
    total_tokens_used = Column(Integer, default=0)
    claude_messages = Column(Integer, default=0)
    grok_messages = Column(Integer, default=0)
    
    # Code generation metrics
    total_code_generations = Column(Integer, default=0)
    total_files_generated = Column(Integer, default=0)
    total_lines_generated = Column(Integer, default=0)
    code_gen_success_rate = Column(Float, nullable=True)
    languages_used = Column(JSON, nullable=True)  # {"python": 10, "javascript": 5}
    
    # Export/deployment metrics
    total_exports = Column(Integer, default=0)
    total_deployments = Column(Integer, default=0)
    github_pushes = Column(Integer, default=0)
    
    # Engagement metrics
    total_sessions = Column(Integer, default=0)
    total_time_spent_minutes = Column(Integer, default=0)
    last_activity_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyMetrics(Base):
    """Daily aggregated metrics for dashboards."""
    __tablename__ = "daily_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    date = Column(DateTime, nullable=False, index=True)
    metric_type = Column(String, nullable=False, index=True)  # users, projects, chat, code_gen, etc.
    
    # User metrics
    total_users = Column(Integer, default=0)
    new_users = Column(Integer, default=0)
    active_users = Column(Integer, default=0)
    returning_users = Column(Integer, default=0)
    
    # Project metrics
    total_projects = Column(Integer, default=0)
    new_projects = Column(Integer, default=0)
    active_projects = Column(Integer, default=0)
    completed_projects = Column(Integer, default=0)
    
    # Framework metrics
    framework_starts = Column(Integer, default=0)
    framework_completions = Column(Integer, default=0)
    avg_framework_completion_time = Column(Float, nullable=True)
    
    # Chat/AI metrics
    total_chat_messages = Column(Integer, default=0)
    total_ai_responses = Column(Integer, default=0)
    avg_response_time_ms = Column(Float, nullable=True)
    total_tokens = Column(Integer, default=0)
    
    # Code generation metrics
    total_code_generations = Column(Integer, default=0)
    total_files_generated = Column(Integer, default=0)
    total_lines_generated = Column(Integer, default=0)
    
    # Engagement metrics
    total_sessions = Column(Integer, default=0)
    avg_session_duration_minutes = Column(Float, nullable=True)
    bounce_rate = Column(Float, nullable=True)
    
    # Revenue metrics (for future)
    total_revenue = Column(Float, default=0)
    new_subscriptions = Column(Integer, default=0)
    churned_users = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_daily_metrics_date_type', 'date', 'metric_type'),
    )


class UserMetrics(Base):
    """Per-user aggregated metrics."""
    __tablename__ = "user_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    
    # Account metrics
    first_seen_at = Column(DateTime, nullable=True)
    last_seen_at = Column(DateTime, nullable=True)
    total_sessions = Column(Integer, default=0)
    total_time_spent_minutes = Column(Integer, default=0)
    
    # Project metrics
    total_projects = Column(Integer, default=0)
    active_projects = Column(Integer, default=0)
    completed_projects = Column(Integer, default=0)
    
    # Framework metrics
    frameworks_started = Column(Integer, default=0)
    frameworks_completed = Column(Integer, default=0)
    avg_framework_completion_time = Column(Float, nullable=True)
    
    # Chat metrics
    total_chat_messages = Column(Integer, default=0)
    total_ai_responses = Column(Integer, default=0)
    favorite_ai_provider = Column(String, nullable=True)
    
    # Code generation metrics
    total_code_generations = Column(Integer, default=0)
    total_files_generated = Column(Integer, default=0)
    total_lines_generated = Column(Integer, default=0)
    preferred_tech_stack = Column(String, nullable=True)
    
    # Export metrics
    total_exports = Column(Integer, default=0)
    total_deployments = Column(Integer, default=0)
    
    # Engagement score (0-100)
    engagement_score = Column(Float, default=0)
    
    # Subscription info
    subscription_tier = Column(String, default="free")
    lifetime_value = Column(Float, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class FeatureUsage(Base):
    """Track feature adoption and usage patterns."""
    __tablename__ = "feature_usage"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    feature_name = Column(String, nullable=False, index=True)
    feature_category = Column(String, nullable=False)
    usage_count = Column(Integer, default=1)
    first_used_at = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_feature_usage_user_feature', 'user_id', 'feature_name'),
    )


class ConversionFunnel(Base):
    """Track conversion funnel steps."""
    __tablename__ = "conversion_funnel"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    session_id = Column(String, nullable=True)
    funnel_name = Column(String, nullable=False, index=True)  # signup, framework, subscription
    step_name = Column(String, nullable=False)
    step_order = Column(Integer, nullable=False)
    completed = Column(Boolean, default=False)
    time_to_complete_seconds = Column(Integer, nullable=True)
    dropped_off = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index('idx_funnel_user_funnel', 'user_id', 'funnel_name'),
    )


class AIUsageMetrics(Base):
    """Detailed AI provider usage metrics."""
    __tablename__ = "ai_usage_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    project_id = Column(String, nullable=True, index=True)
    provider = Column(String, nullable=False)  # claude, grok
    model = Column(String, nullable=True)
    request_type = Column(String, nullable=False)  # chat, code_gen, framework
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    response_time_ms = Column(Integer, nullable=True)
    success = Column(Boolean, default=True)
    error_type = Column(String, nullable=True)
    cost_usd = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index('idx_ai_usage_user_date', 'user_id', 'created_at'),
        Index('idx_ai_usage_provider_date', 'provider', 'created_at'),
    )
