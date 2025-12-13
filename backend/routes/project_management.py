"""
Project Management API Routes

Endpoints for task tracking, sprint management, milestones,
backlog management, and project analytics.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from models.project_management import (
    TaskCreate, TaskUpdate, TaskStatus, TaskPriority, TaskType,
    SprintCreate, SprintStatus,
    MilestoneCreate
)
from services.project_management_service import project_management_service

router = APIRouter(prefix="/api/pm", tags=["project-management"])


# ============== TASKS ==============

@router.post("/{project_id}/tasks")
async def create_task(
    project_id: str,
    task_data: TaskCreate,
    reporter_id: str = Query(...),
    reporter_name: str = Query(...)
):
    """Create a new task."""
    task = project_management_service.create_task(
        project_id=project_id,
        task_data=task_data,
        reporter_id=reporter_id,
        reporter_name=reporter_name
    )
    return {"success": True, "task": task}


@router.get("/{project_id}/tasks")
async def get_tasks(
    project_id: str,
    status: Optional[TaskStatus] = None,
    assignee_id: Optional[str] = None,
    sprint_id: Optional[str] = None,
    milestone_id: Optional[str] = None,
    priority: Optional[TaskPriority] = None,
    task_type: Optional[TaskType] = None,
    include_archived: bool = False
):
    """Get tasks with optional filters."""
    tasks = project_management_service.get_tasks(
        project_id=project_id,
        status=status,
        assignee_id=assignee_id,
        sprint_id=sprint_id,
        milestone_id=milestone_id,
        priority=priority,
        task_type=task_type,
        include_archived=include_archived
    )
    return {"tasks": tasks, "count": len(tasks)}


@router.get("/{project_id}/tasks/{task_id}")
async def get_task(project_id: str, task_id: str):
    """Get a single task."""
    task = project_management_service.get_task(project_id, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task": task}


@router.patch("/{project_id}/tasks/{task_id}")
async def update_task(
    project_id: str,
    task_id: str,
    updates: TaskUpdate,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Update a task."""
    task = project_management_service.update_task(
        project_id=project_id,
        task_id=task_id,
        updates=updates,
        user_id=user_id,
        user_name=user_name
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "task": task}


@router.post("/{project_id}/tasks/{task_id}/move")
async def move_task(
    project_id: str,
    task_id: str,
    new_status: TaskStatus,
    new_order: int,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Move a task to a new status/position."""
    task = project_management_service.move_task(
        project_id=project_id,
        task_id=task_id,
        new_status=new_status,
        new_order=new_order,
        user_id=user_id,
        user_name=user_name
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "task": task}


@router.delete("/{project_id}/tasks/{task_id}")
async def delete_task(
    project_id: str,
    task_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Delete (archive) a task."""
    success = project_management_service.delete_task(
        project_id=project_id,
        task_id=task_id,
        user_id=user_id,
        user_name=user_name
    )
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


# ============== KANBAN BOARD ==============

@router.get("/{project_id}/board")
async def get_kanban_board(
    project_id: str,
    sprint_id: Optional[str] = None
):
    """Get tasks organized for kanban board."""
    board = project_management_service.get_kanban_board(project_id, sprint_id)
    return {"board": board}


# ============== TASK COMMENTS ==============

@router.post("/{project_id}/tasks/{task_id}/comments")
async def add_comment(
    project_id: str,
    task_id: str,
    content: str,
    user_id: str = Query(...),
    user_name: str = Query(...),
    mentions: List[str] = Query(default=[])
):
    """Add a comment to a task."""
    comment = project_management_service.add_comment(
        task_id=task_id,
        user_id=user_id,
        user_name=user_name,
        content=content,
        mentions=mentions
    )
    return {"success": True, "comment": comment}


@router.get("/{project_id}/tasks/{task_id}/comments")
async def get_comments(project_id: str, task_id: str):
    """Get comments for a task."""
    comments = project_management_service.get_comments(task_id)
    return {"comments": comments, "count": len(comments)}


# ============== TASK CHECKLIST ==============

@router.post("/{project_id}/tasks/{task_id}/checklist")
async def add_checklist_item(
    project_id: str,
    task_id: str,
    text: str
):
    """Add a checklist item to a task."""
    item = project_management_service.add_checklist_item(project_id, task_id, text)
    if not item:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True, "item": item}


@router.post("/{project_id}/tasks/{task_id}/checklist/{item_id}/toggle")
async def toggle_checklist_item(
    project_id: str,
    task_id: str,
    item_id: str,
    user_id: str = Query(...)
):
    """Toggle a checklist item."""
    item = project_management_service.toggle_checklist_item(
        project_id, task_id, item_id, user_id
    )
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"success": True, "item": item}


# ============== SPRINTS ==============

@router.post("/{project_id}/sprints")
async def create_sprint(
    project_id: str,
    sprint_data: SprintCreate,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Create a new sprint."""
    sprint = project_management_service.create_sprint(
        project_id=project_id,
        sprint_data=sprint_data,
        user_id=user_id,
        user_name=user_name
    )
    return {"success": True, "sprint": sprint}


@router.get("/{project_id}/sprints")
async def get_sprints(
    project_id: str,
    status: Optional[SprintStatus] = None
):
    """Get all sprints for a project."""
    sprints = project_management_service.get_sprints(project_id, status)
    return {"sprints": sprints, "count": len(sprints)}


@router.get("/{project_id}/sprints/active")
async def get_active_sprint(project_id: str):
    """Get the currently active sprint."""
    sprint = project_management_service.get_active_sprint(project_id)
    if not sprint:
        return {"sprint": None, "message": "No active sprint"}
    return {"sprint": sprint}


@router.get("/{project_id}/sprints/{sprint_id}")
async def get_sprint(project_id: str, sprint_id: str):
    """Get a single sprint."""
    sprint = project_management_service.get_sprint(project_id, sprint_id)
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"sprint": sprint}


@router.post("/{project_id}/sprints/{sprint_id}/start")
async def start_sprint(
    project_id: str,
    sprint_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Start a sprint."""
    sprint = project_management_service.start_sprint(
        project_id=project_id,
        sprint_id=sprint_id,
        user_id=user_id,
        user_name=user_name
    )
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"success": True, "sprint": sprint}


@router.post("/{project_id}/sprints/{sprint_id}/complete")
async def complete_sprint(
    project_id: str,
    sprint_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...),
    move_incomplete_to: Optional[str] = None
):
    """Complete a sprint."""
    sprint = project_management_service.complete_sprint(
        project_id=project_id,
        sprint_id=sprint_id,
        user_id=user_id,
        user_name=user_name,
        move_incomplete_to=move_incomplete_to
    )
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"success": True, "sprint": sprint}


# ============== MILESTONES ==============

@router.post("/{project_id}/milestones")
async def create_milestone(
    project_id: str,
    milestone_data: MilestoneCreate,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Create a new milestone."""
    milestone = project_management_service.create_milestone(
        project_id=project_id,
        milestone_data=milestone_data,
        user_id=user_id,
        user_name=user_name
    )
    return {"success": True, "milestone": milestone}


@router.get("/{project_id}/milestones")
async def get_milestones(project_id: str):
    """Get all milestones for a project."""
    milestones = project_management_service.get_milestones(project_id)
    return {"milestones": milestones, "count": len(milestones)}


@router.post("/{project_id}/milestones/{milestone_id}/refresh")
async def refresh_milestone_progress(project_id: str, milestone_id: str):
    """Refresh milestone progress from linked tasks."""
    milestone = project_management_service.update_milestone_progress(
        project_id, milestone_id
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    return {"success": True, "milestone": milestone}


# ============== ANALYTICS ==============

@router.get("/{project_id}/analytics")
async def get_project_analytics(project_id: str):
    """Get project analytics and metrics."""
    analytics = project_management_service.get_project_analytics(project_id)
    return {"analytics": analytics}


@router.get("/{project_id}/sprints/{sprint_id}/burndown")
async def get_burndown_data(project_id: str, sprint_id: str):
    """Get burndown chart data for a sprint."""
    data = project_management_service.get_burndown_data(project_id, sprint_id)
    return {"burndown": data}


# ============== ACTIVITY FEED ==============

@router.get("/{project_id}/activities")
async def get_activities(
    project_id: str,
    limit: int = 50,
    entity_type: Optional[str] = None
):
    """Get recent project activities."""
    activities = project_management_service.get_activities(
        project_id=project_id,
        limit=limit,
        entity_type=entity_type
    )
    return {"activities": activities, "count": len(activities)}
