"""
Project Management Models

Comprehensive models for product management, project tracking,
collaboration, and communication features.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============== ENUMS ==============

class TaskStatus(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    TESTING = "testing"
    DONE = "done"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskType(str, Enum):
    FEATURE = "feature"
    BUG = "bug"
    IMPROVEMENT = "improvement"
    TECH_DEBT = "tech_debt"
    RESEARCH = "research"
    DOCUMENTATION = "documentation"
    DESIGN = "design"


class SprintStatus(str, Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MilestoneStatus(str, Enum):
    UPCOMING = "upcoming"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"


class TeamRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    DEVELOPER = "developer"
    DESIGNER = "designer"
    PRODUCT_MANAGER = "product_manager"
    VIEWER = "viewer"


class NotificationType(str, Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_UPDATED = "task_updated"
    TASK_COMPLETED = "task_completed"
    COMMENT_ADDED = "comment_added"
    MENTION = "mention"
    SPRINT_STARTED = "sprint_started"
    SPRINT_ENDED = "sprint_ended"
    MILESTONE_REACHED = "milestone_reached"
    MESSAGE = "message"
    SYSTEM = "system"


class MessageType(str, Enum):
    TEXT = "text"
    FILE = "file"
    CODE = "code"
    SYSTEM = "system"


# ============== TASK MODELS ==============

class TaskLabel(BaseModel):
    """Label/tag for categorizing tasks."""
    id: str
    name: str
    color: str = "#6366f1"  # Default indigo


class TaskComment(BaseModel):
    """Comment on a task."""
    id: str
    task_id: str
    user_id: str
    user_name: str
    content: str
    mentions: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_edited: bool = False


class TaskAttachment(BaseModel):
    """File attachment for a task."""
    id: str
    task_id: str
    filename: str
    file_type: str
    file_size: int
    url: str
    uploaded_by: str
    uploaded_at: datetime


class TaskChecklist(BaseModel):
    """Checklist item within a task."""
    id: str
    text: str
    completed: bool = False
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None


class Task(BaseModel):
    """Main task/issue model."""
    id: str
    project_id: str
    title: str
    description: str = ""
    type: TaskType = TaskType.FEATURE
    status: TaskStatus = TaskStatus.BACKLOG
    priority: TaskPriority = TaskPriority.MEDIUM
    
    # Assignment
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    reporter_id: str
    reporter_name: str
    
    # Organization
    sprint_id: Optional[str] = None
    milestone_id: Optional[str] = None
    parent_task_id: Optional[str] = None  # For subtasks
    labels: List[TaskLabel] = Field(default_factory=list)
    
    # Estimation
    story_points: Optional[int] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    
    # Dates
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    # Additional
    checklist: List[TaskChecklist] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)  # Task IDs
    blocked_by: List[str] = Field(default_factory=list)
    
    # Metadata
    order: int = 0  # For kanban ordering
    archived: bool = False


class TaskCreate(BaseModel):
    """Request model for creating a task."""
    title: str
    description: str = ""
    type: TaskType = TaskType.FEATURE
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_id: Optional[str] = None
    sprint_id: Optional[str] = None
    milestone_id: Optional[str] = None
    parent_task_id: Optional[str] = None
    labels: List[str] = Field(default_factory=list)
    story_points: Optional[int] = None
    estimated_hours: Optional[float] = None
    due_date: Optional[datetime] = None


class TaskUpdate(BaseModel):
    """Request model for updating a task."""
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[TaskType] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assignee_id: Optional[str] = None
    sprint_id: Optional[str] = None
    milestone_id: Optional[str] = None
    labels: Optional[List[str]] = None
    story_points: Optional[int] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    order: Optional[int] = None


# ============== SPRINT MODELS ==============

class Sprint(BaseModel):
    """Sprint/iteration model."""
    id: str
    project_id: str
    name: str
    goal: str = ""
    status: SprintStatus = SprintStatus.PLANNING
    
    start_date: datetime
    end_date: datetime
    
    # Capacity planning
    capacity_points: Optional[int] = None
    committed_points: int = 0
    completed_points: int = 0
    
    # Statistics
    tasks_total: int = 0
    tasks_completed: int = 0
    
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None


class SprintCreate(BaseModel):
    """Request model for creating a sprint."""
    name: str
    goal: str = ""
    start_date: datetime
    end_date: datetime
    capacity_points: Optional[int] = None


# ============== MILESTONE MODELS ==============

class Milestone(BaseModel):
    """Product milestone/release model."""
    id: str
    project_id: str
    name: str
    description: str = ""
    status: MilestoneStatus = MilestoneStatus.UPCOMING
    
    target_date: datetime
    completed_date: Optional[datetime] = None
    
    # Progress
    total_tasks: int = 0
    completed_tasks: int = 0
    progress_percentage: int = 0
    
    # Release info
    version: Optional[str] = None
    release_notes: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime


class MilestoneCreate(BaseModel):
    """Request model for creating a milestone."""
    name: str
    description: str = ""
    target_date: datetime
    version: Optional[str] = None


# ============== BACKLOG MODELS ==============

class BacklogItem(BaseModel):
    """Product backlog item (user story)."""
    id: str
    project_id: str
    title: str
    description: str = ""
    
    # User story format
    as_a: Optional[str] = None  # "As a [user type]"
    i_want: Optional[str] = None  # "I want [goal]"
    so_that: Optional[str] = None  # "So that [benefit]"
    
    # Acceptance criteria
    acceptance_criteria: List[str] = Field(default_factory=list)
    
    # Prioritization
    priority: TaskPriority = TaskPriority.MEDIUM
    business_value: Optional[int] = None  # 1-100
    effort_estimate: Optional[int] = None  # Story points
    
    # Status
    is_refined: bool = False
    is_ready: bool = False  # Ready for sprint
    
    # Linking
    epic_id: Optional[str] = None
    related_tasks: List[str] = Field(default_factory=list)
    
    order: int = 0
    created_at: datetime
    updated_at: datetime


class Epic(BaseModel):
    """Epic - large body of work containing multiple backlog items."""
    id: str
    project_id: str
    name: str
    description: str = ""
    color: str = "#6366f1"
    
    # Progress
    total_items: int = 0
    completed_items: int = 0
    progress_percentage: int = 0
    
    target_date: Optional[datetime] = None
    status: str = "active"  # active, completed, cancelled
    
    created_at: datetime
    updated_at: datetime


# ============== TEAM MODELS ==============

class TeamMember(BaseModel):
    """Team member in a project."""
    id: str
    user_id: str
    project_id: str
    
    username: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    
    role: TeamRole = TeamRole.DEVELOPER
    
    # Permissions
    can_edit_tasks: bool = True
    can_manage_sprints: bool = False
    can_manage_team: bool = False
    can_delete_project: bool = False
    
    joined_at: datetime
    last_active: Optional[datetime] = None
    is_active: bool = True


class TeamInvite(BaseModel):
    """Invitation to join a project team."""
    id: str
    project_id: str
    email: str
    role: TeamRole = TeamRole.DEVELOPER
    invited_by: str
    invited_at: datetime
    expires_at: datetime
    accepted: bool = False
    accepted_at: Optional[datetime] = None


# ============== ACTIVITY MODELS ==============

class Activity(BaseModel):
    """Activity log entry."""
    id: str
    project_id: str
    user_id: str
    user_name: str
    
    action: str  # created, updated, deleted, commented, assigned, etc.
    entity_type: str  # task, sprint, milestone, comment, etc.
    entity_id: str
    entity_title: Optional[str] = None
    
    details: Dict[str, Any] = Field(default_factory=dict)
    
    created_at: datetime


# ============== NOTIFICATION MODELS ==============

class Notification(BaseModel):
    """User notification."""
    id: str
    user_id: str
    project_id: str
    
    type: NotificationType
    title: str
    message: str
    
    # Link to related entity
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    
    # Sender
    from_user_id: Optional[str] = None
    from_user_name: Optional[str] = None
    
    read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime


# ============== MESSAGING MODELS ==============

class Channel(BaseModel):
    """Communication channel (chat room)."""
    id: str
    project_id: str
    name: str
    description: str = ""
    
    # Type
    is_direct: bool = False  # Direct message between 2 users
    is_private: bool = False
    
    # Members (for private channels)
    member_ids: List[str] = Field(default_factory=list)
    
    # Settings
    muted_by: List[str] = Field(default_factory=list)
    
    last_message_at: Optional[datetime] = None
    created_at: datetime
    created_by: str


class Message(BaseModel):
    """Chat message."""
    id: str
    channel_id: str
    project_id: str
    
    user_id: str
    user_name: str
    user_avatar: Optional[str] = None
    
    type: MessageType = MessageType.TEXT
    content: str
    
    # For code messages
    code_language: Optional[str] = None
    
    # Attachments
    attachments: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Mentions
    mentions: List[str] = Field(default_factory=list)
    
    # Reactions
    reactions: Dict[str, List[str]] = Field(default_factory=dict)  # emoji -> user_ids
    
    # Threading
    thread_id: Optional[str] = None  # Parent message ID for threads
    reply_count: int = 0
    
    edited: bool = False
    edited_at: Optional[datetime] = None
    deleted: bool = False
    
    created_at: datetime


class MessageCreate(BaseModel):
    """Request model for creating a message."""
    content: str
    type: MessageType = MessageType.TEXT
    code_language: Optional[str] = None
    thread_id: Optional[str] = None
    mentions: List[str] = Field(default_factory=list)


# ============== ROADMAP MODELS ==============

class RoadmapItem(BaseModel):
    """Item on the product roadmap."""
    id: str
    project_id: str
    
    title: str
    description: str = ""
    
    # Timeline
    quarter: Optional[str] = None  # e.g., "Q1 2025"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Categorization
    category: str = "feature"  # feature, improvement, infrastructure
    status: str = "planned"  # planned, in_progress, completed, cancelled
    
    # Linking
    milestone_id: Optional[str] = None
    epic_ids: List[str] = Field(default_factory=list)
    
    # Display
    color: str = "#6366f1"
    row: int = 0  # For swimlane positioning
    
    created_at: datetime
    updated_at: datetime


# ============== ANALYTICS MODELS ==============

class ProjectAnalytics(BaseModel):
    """Project analytics and metrics."""
    project_id: str
    
    # Task metrics
    total_tasks: int = 0
    tasks_by_status: Dict[str, int] = Field(default_factory=dict)
    tasks_by_priority: Dict[str, int] = Field(default_factory=dict)
    tasks_by_type: Dict[str, int] = Field(default_factory=dict)
    
    # Velocity
    velocity_last_sprint: Optional[int] = None
    velocity_average: Optional[float] = None
    
    # Sprint metrics
    active_sprint_progress: Optional[float] = None
    sprints_completed: int = 0
    
    # Team metrics
    tasks_per_member: Dict[str, int] = Field(default_factory=dict)
    
    # Time metrics
    avg_cycle_time_days: Optional[float] = None
    avg_lead_time_days: Optional[float] = None
    
    # Burndown data
    burndown_ideal: List[int] = Field(default_factory=list)
    burndown_actual: List[int] = Field(default_factory=list)
    
    generated_at: datetime
