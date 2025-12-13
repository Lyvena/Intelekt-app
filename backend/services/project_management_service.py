"""
Project Management Service

Comprehensive service for task tracking, sprint management,
backlog management, and project analytics.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from uuid import uuid4
from models.project_management import (
    Task, TaskCreate, TaskUpdate, TaskStatus, TaskPriority, TaskType,
    TaskComment, TaskChecklist, TaskLabel,
    Sprint, SprintCreate, SprintStatus,
    Milestone, MilestoneCreate, MilestoneStatus,
    BacklogItem, Epic,
    Activity, ProjectAnalytics
)


class ProjectManagementService:
    """Service for managing project tasks, sprints, and backlog."""
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Task]] = {}  # project_id -> {task_id -> Task}
        self.sprints: Dict[str, Dict[str, Sprint]] = {}  # project_id -> {sprint_id -> Sprint}
        self.milestones: Dict[str, Dict[str, Milestone]] = {}
        self.backlog_items: Dict[str, Dict[str, BacklogItem]] = {}
        self.epics: Dict[str, Dict[str, Epic]] = {}
        self.labels: Dict[str, Dict[str, TaskLabel]] = {}
        self.activities: Dict[str, List[Activity]] = {}  # project_id -> [Activity]
        self.comments: Dict[str, List[TaskComment]] = {}  # task_id -> [TaskComment]
    
    # ============== TASK MANAGEMENT ==============
    
    def create_task(
        self,
        project_id: str,
        task_data: TaskCreate,
        reporter_id: str,
        reporter_name: str
    ) -> Task:
        """Create a new task."""
        task_id = f"TASK-{uuid4().hex[:8].upper()}"
        
        now = datetime.now()
        
        task = Task(
            id=task_id,
            project_id=project_id,
            title=task_data.title,
            description=task_data.description,
            type=task_data.type,
            status=TaskStatus.BACKLOG,
            priority=task_data.priority,
            assignee_id=task_data.assignee_id,
            reporter_id=reporter_id,
            reporter_name=reporter_name,
            sprint_id=task_data.sprint_id,
            milestone_id=task_data.milestone_id,
            parent_task_id=task_data.parent_task_id,
            story_points=task_data.story_points,
            estimated_hours=task_data.estimated_hours,
            due_date=task_data.due_date,
            created_at=now,
            updated_at=now,
            order=self._get_next_order(project_id)
        )
        
        if project_id not in self.tasks:
            self.tasks[project_id] = {}
        
        self.tasks[project_id][task_id] = task
        
        # Log activity
        self._log_activity(
            project_id=project_id,
            user_id=reporter_id,
            user_name=reporter_name,
            action="created",
            entity_type="task",
            entity_id=task_id,
            entity_title=task.title
        )
        
        return task
    
    def update_task(
        self,
        project_id: str,
        task_id: str,
        updates: TaskUpdate,
        user_id: str,
        user_name: str
    ) -> Optional[Task]:
        """Update an existing task."""
        if project_id not in self.tasks or task_id not in self.tasks[project_id]:
            return None
        
        task = self.tasks[project_id][task_id]
        changes = {}
        
        for field, value in updates.model_dump(exclude_unset=True).items():
            if value is not None:
                old_value = getattr(task, field)
                if old_value != value:
                    changes[field] = {"old": old_value, "new": value}
                    setattr(task, field, value)
        
        task.updated_at = datetime.now()
        
        # Check if task was completed
        if updates.status == TaskStatus.DONE and task.completed_at is None:
            task.completed_at = datetime.now()
        
        # Log activity
        if changes:
            self._log_activity(
                project_id=project_id,
                user_id=user_id,
                user_name=user_name,
                action="updated",
                entity_type="task",
                entity_id=task_id,
                entity_title=task.title,
                details={"changes": changes}
            )
        
        return task
    
    def get_task(self, project_id: str, task_id: str) -> Optional[Task]:
        """Get a single task."""
        if project_id not in self.tasks:
            return None
        return self.tasks[project_id].get(task_id)
    
    def get_tasks(
        self,
        project_id: str,
        status: Optional[TaskStatus] = None,
        assignee_id: Optional[str] = None,
        sprint_id: Optional[str] = None,
        milestone_id: Optional[str] = None,
        priority: Optional[TaskPriority] = None,
        task_type: Optional[TaskType] = None,
        include_archived: bool = False
    ) -> List[Task]:
        """Get tasks with optional filters."""
        if project_id not in self.tasks:
            return []
        
        tasks = list(self.tasks[project_id].values())
        
        # Apply filters
        if not include_archived:
            tasks = [t for t in tasks if not t.archived]
        if status:
            tasks = [t for t in tasks if t.status == status]
        if assignee_id:
            tasks = [t for t in tasks if t.assignee_id == assignee_id]
        if sprint_id:
            tasks = [t for t in tasks if t.sprint_id == sprint_id]
        if milestone_id:
            tasks = [t for t in tasks if t.milestone_id == milestone_id]
        if priority:
            tasks = [t for t in tasks if t.priority == priority]
        if task_type:
            tasks = [t for t in tasks if t.type == task_type]
        
        return sorted(tasks, key=lambda t: t.order)
    
    def get_kanban_board(self, project_id: str, sprint_id: Optional[str] = None) -> Dict[str, List[Task]]:
        """Get tasks organized by status for kanban board."""
        tasks = self.get_tasks(project_id, sprint_id=sprint_id)
        
        board = {status.value: [] for status in TaskStatus}
        
        for task in tasks:
            board[task.status.value].append(task)
        
        # Sort each column by order
        for status in board:
            board[status] = sorted(board[status], key=lambda t: t.order)
        
        return board
    
    def move_task(
        self,
        project_id: str,
        task_id: str,
        new_status: TaskStatus,
        new_order: int,
        user_id: str,
        user_name: str
    ) -> Optional[Task]:
        """Move task to new status/position (for drag & drop)."""
        task = self.get_task(project_id, task_id)
        if not task:
            return None
        
        old_status = task.status
        task.status = new_status
        task.order = new_order
        task.updated_at = datetime.now()
        
        if new_status == TaskStatus.DONE and task.completed_at is None:
            task.completed_at = datetime.now()
        
        # Reorder other tasks
        tasks_in_column = [t for t in self.tasks[project_id].values() 
                          if t.status == new_status and t.id != task_id]
        tasks_in_column = sorted(tasks_in_column, key=lambda t: t.order)
        
        for i, t in enumerate(tasks_in_column):
            if i >= new_order:
                t.order = i + 1
        
        self._log_activity(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action="moved",
            entity_type="task",
            entity_id=task_id,
            entity_title=task.title,
            details={"from_status": old_status.value, "to_status": new_status.value}
        )
        
        return task
    
    def delete_task(self, project_id: str, task_id: str, user_id: str, user_name: str) -> bool:
        """Delete (archive) a task."""
        task = self.get_task(project_id, task_id)
        if not task:
            return False
        
        task.archived = True
        task.updated_at = datetime.now()
        
        self._log_activity(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action="deleted",
            entity_type="task",
            entity_id=task_id,
            entity_title=task.title
        )
        
        return True
    
    # ============== TASK COMMENTS ==============
    
    def add_comment(
        self,
        task_id: str,
        user_id: str,
        user_name: str,
        content: str,
        mentions: List[str] = None
    ) -> TaskComment:
        """Add a comment to a task."""
        comment_id = f"CMT-{uuid4().hex[:8]}"
        
        comment = TaskComment(
            id=comment_id,
            task_id=task_id,
            user_id=user_id,
            user_name=user_name,
            content=content,
            mentions=mentions or [],
            created_at=datetime.now()
        )
        
        if task_id not in self.comments:
            self.comments[task_id] = []
        
        self.comments[task_id].append(comment)
        
        return comment
    
    def get_comments(self, task_id: str) -> List[TaskComment]:
        """Get all comments for a task."""
        return self.comments.get(task_id, [])
    
    # ============== TASK CHECKLIST ==============
    
    def add_checklist_item(
        self,
        project_id: str,
        task_id: str,
        text: str
    ) -> Optional[TaskChecklist]:
        """Add a checklist item to a task."""
        task = self.get_task(project_id, task_id)
        if not task:
            return None
        
        item = TaskChecklist(
            id=f"CHK-{uuid4().hex[:6]}",
            text=text,
            completed=False
        )
        
        task.checklist.append(item)
        task.updated_at = datetime.now()
        
        return item
    
    def toggle_checklist_item(
        self,
        project_id: str,
        task_id: str,
        item_id: str,
        user_id: str
    ) -> Optional[TaskChecklist]:
        """Toggle a checklist item."""
        task = self.get_task(project_id, task_id)
        if not task:
            return None
        
        for item in task.checklist:
            if item.id == item_id:
                item.completed = not item.completed
                if item.completed:
                    item.completed_by = user_id
                    item.completed_at = datetime.now()
                else:
                    item.completed_by = None
                    item.completed_at = None
                task.updated_at = datetime.now()
                return item
        
        return None
    
    # ============== SPRINT MANAGEMENT ==============
    
    def create_sprint(
        self,
        project_id: str,
        sprint_data: SprintCreate,
        user_id: str,
        user_name: str
    ) -> Sprint:
        """Create a new sprint."""
        sprint_id = f"SPRINT-{uuid4().hex[:6].upper()}"
        now = datetime.now()
        
        sprint = Sprint(
            id=sprint_id,
            project_id=project_id,
            name=sprint_data.name,
            goal=sprint_data.goal,
            status=SprintStatus.PLANNING,
            start_date=sprint_data.start_date,
            end_date=sprint_data.end_date,
            capacity_points=sprint_data.capacity_points,
            created_at=now,
            updated_at=now
        )
        
        if project_id not in self.sprints:
            self.sprints[project_id] = {}
        
        self.sprints[project_id][sprint_id] = sprint
        
        self._log_activity(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action="created",
            entity_type="sprint",
            entity_id=sprint_id,
            entity_title=sprint.name
        )
        
        return sprint
    
    def start_sprint(
        self,
        project_id: str,
        sprint_id: str,
        user_id: str,
        user_name: str
    ) -> Optional[Sprint]:
        """Start a sprint."""
        if project_id not in self.sprints or sprint_id not in self.sprints[project_id]:
            return None
        
        sprint = self.sprints[project_id][sprint_id]
        sprint.status = SprintStatus.ACTIVE
        sprint.updated_at = datetime.now()
        
        # Calculate committed points
        sprint_tasks = self.get_tasks(project_id, sprint_id=sprint_id)
        sprint.committed_points = sum(t.story_points or 0 for t in sprint_tasks)
        sprint.tasks_total = len(sprint_tasks)
        
        self._log_activity(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action="started",
            entity_type="sprint",
            entity_id=sprint_id,
            entity_title=sprint.name
        )
        
        return sprint
    
    def complete_sprint(
        self,
        project_id: str,
        sprint_id: str,
        user_id: str,
        user_name: str,
        move_incomplete_to: Optional[str] = None
    ) -> Optional[Sprint]:
        """Complete a sprint."""
        if project_id not in self.sprints or sprint_id not in self.sprints[project_id]:
            return None
        
        sprint = self.sprints[project_id][sprint_id]
        sprint.status = SprintStatus.COMPLETED
        sprint.completed_at = datetime.now()
        sprint.updated_at = datetime.now()
        
        # Calculate completed points
        sprint_tasks = self.get_tasks(project_id, sprint_id=sprint_id)
        completed_tasks = [t for t in sprint_tasks if t.status == TaskStatus.DONE]
        sprint.completed_points = sum(t.story_points or 0 for t in completed_tasks)
        sprint.tasks_completed = len(completed_tasks)
        
        # Move incomplete tasks
        if move_incomplete_to:
            for task in sprint_tasks:
                if task.status != TaskStatus.DONE:
                    task.sprint_id = move_incomplete_to
                    task.updated_at = datetime.now()
        
        self._log_activity(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action="completed",
            entity_type="sprint",
            entity_id=sprint_id,
            entity_title=sprint.name,
            details={
                "completed_points": sprint.completed_points,
                "committed_points": sprint.committed_points
            }
        )
        
        return sprint
    
    def get_sprint(self, project_id: str, sprint_id: str) -> Optional[Sprint]:
        """Get a single sprint."""
        if project_id not in self.sprints:
            return None
        return self.sprints[project_id].get(sprint_id)
    
    def get_sprints(
        self,
        project_id: str,
        status: Optional[SprintStatus] = None
    ) -> List[Sprint]:
        """Get all sprints for a project."""
        if project_id not in self.sprints:
            return []
        
        sprints = list(self.sprints[project_id].values())
        
        if status:
            sprints = [s for s in sprints if s.status == status]
        
        return sorted(sprints, key=lambda s: s.start_date, reverse=True)
    
    def get_active_sprint(self, project_id: str) -> Optional[Sprint]:
        """Get the currently active sprint."""
        sprints = self.get_sprints(project_id, status=SprintStatus.ACTIVE)
        return sprints[0] if sprints else None
    
    # ============== MILESTONE MANAGEMENT ==============
    
    def create_milestone(
        self,
        project_id: str,
        milestone_data: MilestoneCreate,
        user_id: str,
        user_name: str
    ) -> Milestone:
        """Create a new milestone."""
        milestone_id = f"MS-{uuid4().hex[:6].upper()}"
        now = datetime.now()
        
        milestone = Milestone(
            id=milestone_id,
            project_id=project_id,
            name=milestone_data.name,
            description=milestone_data.description,
            target_date=milestone_data.target_date,
            version=milestone_data.version,
            created_at=now,
            updated_at=now
        )
        
        if project_id not in self.milestones:
            self.milestones[project_id] = {}
        
        self.milestones[project_id][milestone_id] = milestone
        
        self._log_activity(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action="created",
            entity_type="milestone",
            entity_id=milestone_id,
            entity_title=milestone.name
        )
        
        return milestone
    
    def update_milestone_progress(self, project_id: str, milestone_id: str) -> Optional[Milestone]:
        """Update milestone progress based on linked tasks."""
        if project_id not in self.milestones or milestone_id not in self.milestones[project_id]:
            return None
        
        milestone = self.milestones[project_id][milestone_id]
        tasks = self.get_tasks(project_id, milestone_id=milestone_id)
        
        milestone.total_tasks = len(tasks)
        milestone.completed_tasks = len([t for t in tasks if t.status == TaskStatus.DONE])
        
        if milestone.total_tasks > 0:
            milestone.progress_percentage = int(
                (milestone.completed_tasks / milestone.total_tasks) * 100
            )
        else:
            milestone.progress_percentage = 0
        
        # Update status
        if milestone.progress_percentage == 100:
            milestone.status = MilestoneStatus.COMPLETED
            milestone.completed_date = datetime.now()
        elif milestone.progress_percentage > 0:
            milestone.status = MilestoneStatus.IN_PROGRESS
        elif milestone.target_date < datetime.now():
            milestone.status = MilestoneStatus.DELAYED
        
        milestone.updated_at = datetime.now()
        
        return milestone
    
    def get_milestones(self, project_id: str) -> List[Milestone]:
        """Get all milestones for a project."""
        if project_id not in self.milestones:
            return []
        return sorted(
            list(self.milestones[project_id].values()),
            key=lambda m: m.target_date
        )
    
    # ============== ANALYTICS ==============
    
    def get_project_analytics(self, project_id: str) -> ProjectAnalytics:
        """Generate project analytics."""
        tasks = self.get_tasks(project_id, include_archived=False)
        sprints = self.get_sprints(project_id)
        
        # Task metrics
        tasks_by_status = {}
        tasks_by_priority = {}
        tasks_by_type = {}
        tasks_per_member = {}
        
        for task in tasks:
            # By status
            status = task.status.value
            tasks_by_status[status] = tasks_by_status.get(status, 0) + 1
            
            # By priority
            priority = task.priority.value
            tasks_by_priority[priority] = tasks_by_priority.get(priority, 0) + 1
            
            # By type
            task_type = task.type.value
            tasks_by_type[task_type] = tasks_by_type.get(task_type, 0) + 1
            
            # Per member
            if task.assignee_id:
                assignee = task.assignee_name or task.assignee_id
                tasks_per_member[assignee] = tasks_per_member.get(assignee, 0) + 1
        
        # Velocity
        completed_sprints = [s for s in sprints if s.status == SprintStatus.COMPLETED]
        velocities = [s.completed_points for s in completed_sprints[-5:]]  # Last 5 sprints
        
        velocity_average = sum(velocities) / len(velocities) if velocities else None
        velocity_last = velocities[-1] if velocities else None
        
        # Active sprint progress
        active_sprint = self.get_active_sprint(project_id)
        sprint_progress = None
        if active_sprint:
            sprint_tasks = self.get_tasks(project_id, sprint_id=active_sprint.id)
            completed = len([t for t in sprint_tasks if t.status == TaskStatus.DONE])
            sprint_progress = (completed / len(sprint_tasks) * 100) if sprint_tasks else 0
        
        # Cycle time (average time from in_progress to done)
        completed_tasks = [t for t in tasks if t.completed_at and t.start_date]
        cycle_times = []
        for t in completed_tasks:
            if t.start_date and t.completed_at:
                days = (t.completed_at - t.start_date).days
                cycle_times.append(days)
        
        avg_cycle_time = sum(cycle_times) / len(cycle_times) if cycle_times else None
        
        return ProjectAnalytics(
            project_id=project_id,
            total_tasks=len(tasks),
            tasks_by_status=tasks_by_status,
            tasks_by_priority=tasks_by_priority,
            tasks_by_type=tasks_by_type,
            velocity_last_sprint=velocity_last,
            velocity_average=velocity_average,
            active_sprint_progress=sprint_progress,
            sprints_completed=len(completed_sprints),
            tasks_per_member=tasks_per_member,
            avg_cycle_time_days=avg_cycle_time,
            generated_at=datetime.now()
        )
    
    def get_burndown_data(self, project_id: str, sprint_id: str) -> Dict[str, List]:
        """Generate burndown chart data for a sprint."""
        sprint = self.get_sprint(project_id, sprint_id)
        if not sprint:
            return {"dates": [], "ideal": [], "actual": []}
        
        tasks = self.get_tasks(project_id, sprint_id=sprint_id)
        total_points = sum(t.story_points or 0 for t in tasks)
        
        # Calculate sprint duration in days
        duration = (sprint.end_date - sprint.start_date).days
        if duration <= 0:
            duration = 14  # Default 2 weeks
        
        # Ideal burndown (linear)
        ideal = [total_points - (total_points / duration * i) for i in range(duration + 1)]
        
        # Actual burndown (based on task completion dates)
        dates = []
        actual = []
        current_date = sprint.start_date
        
        for i in range(duration + 1):
            date = sprint.start_date + timedelta(days=i)
            dates.append(date.strftime("%Y-%m-%d"))
            
            if date <= datetime.now():
                remaining = sum(
                    t.story_points or 0 for t in tasks
                    if not t.completed_at or t.completed_at > date
                )
                actual.append(remaining)
        
        return {
            "dates": dates,
            "ideal": ideal,
            "actual": actual
        }
    
    # ============== HELPERS ==============
    
    def _get_next_order(self, project_id: str) -> int:
        """Get next order number for tasks."""
        if project_id not in self.tasks or not self.tasks[project_id]:
            return 0
        return max(t.order for t in self.tasks[project_id].values()) + 1
    
    def _log_activity(
        self,
        project_id: str,
        user_id: str,
        user_name: str,
        action: str,
        entity_type: str,
        entity_id: str,
        entity_title: Optional[str] = None,
        details: Optional[Dict] = None
    ):
        """Log an activity."""
        activity = Activity(
            id=f"ACT-{uuid4().hex[:8]}",
            project_id=project_id,
            user_id=user_id,
            user_name=user_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_title=entity_title,
            details=details or {},
            created_at=datetime.now()
        )
        
        if project_id not in self.activities:
            self.activities[project_id] = []
        
        self.activities[project_id].insert(0, activity)
        
        # Keep only last 1000 activities
        self.activities[project_id] = self.activities[project_id][:1000]
    
    def get_activities(
        self,
        project_id: str,
        limit: int = 50,
        entity_type: Optional[str] = None
    ) -> List[Activity]:
        """Get recent activities."""
        activities = self.activities.get(project_id, [])
        
        if entity_type:
            activities = [a for a in activities if a.entity_type == entity_type]
        
        return activities[:limit]


# Singleton instance
project_management_service = ProjectManagementService()
