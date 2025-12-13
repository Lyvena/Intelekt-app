"""
Integration API Routes

Endpoints for cross-feature integration and synchronization.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any
from services.integration_service import integration_service
from services.github_service import github_service

router = APIRouter(prefix="/api/integration", tags=["integration"])


# ============== FRAMEWORK → PROJECT MANAGEMENT ==============

@router.post("/{project_id}/framework-to-tasks")
async def create_tasks_from_framework(
    project_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Create project tasks from completed framework steps."""
    try:
        tasks = await integration_service.create_tasks_from_framework(
            project_id=project_id,
            user_id=user_id,
            user_name=user_name
        )
        return {"success": True, "tasks_created": len(tasks), "tasks": tasks}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== GITHUB LINKING ==============

@router.post("/{project_id}/link-github")
async def link_project_to_github(
    project_id: str,
    owner: str = Body(...),
    repo: str = Body(...)
):
    """Link an Intelekt project to a GitHub repository."""
    integration_service.link_project_to_github(project_id, owner, repo)
    return {"success": True, "linked": f"{owner}/{repo}"}


@router.get("/{project_id}/github-link")
async def get_github_link(project_id: str):
    """Get GitHub repo linked to a project."""
    link = integration_service.get_github_link(project_id)
    if not link:
        return {"linked": False}
    return {"linked": True, **link}


# ============== GITHUB ↔ TASKS SYNC ==============

@router.post("/{project_id}/sync-github-issues")
async def sync_github_issues_to_tasks(
    project_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    """Sync GitHub issues to project tasks."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    result = await integration_service.sync_github_issues_to_tasks(
        project_id=project_id,
        user_id=user_id,
        user_name=user_name,
        token=token
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"success": True, **result}


@router.post("/{project_id}/tasks/{task_id}/create-github-issue")
async def create_github_issue_from_task(
    project_id: str,
    task_id: str,
    user_id: str = Query(...)
):
    """Create a GitHub issue from a task."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    result = await integration_service.create_github_issue_from_task(
        project_id=project_id,
        task_id=task_id,
        user_id=user_id,
        token=token
    )
    
    if not result:
        raise HTTPException(status_code=400, detail="Failed to create issue")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"success": True, "issue": result}


@router.post("/{project_id}/tasks/{task_id}/sync-to-github")
async def sync_task_status_to_github(
    project_id: str,
    task_id: str,
    user_id: str = Query(...)
):
    """Sync task status to linked GitHub issue."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected")
    
    success = await integration_service.sync_task_status_to_github(
        project_id=project_id,
        task_id=task_id,
        token=token
    )
    
    return {"success": success}


# ============== UNIFIED DASHBOARD ==============

@router.get("/{project_id}/dashboard")
async def get_project_dashboard(
    project_id: str,
    user_id: str = Query(...)
):
    """Get unified dashboard data for a project."""
    token = github_service.get_token(user_id)
    
    dashboard = await integration_service.get_project_dashboard(
        project_id=project_id,
        user_id=user_id,
        github_token=token
    )
    
    return dashboard


# ============== NOTIFICATIONS ==============

@router.post("/{project_id}/notify/task-assigned")
async def notify_task_assigned(
    project_id: str,
    task_id: str = Body(...),
    assignee_id: str = Body(...),
    assigner_id: str = Body(...),
    assigner_name: str = Body(...)
):
    """Notify user when assigned to a task."""
    integration_service.notify_task_assigned(
        project_id=project_id,
        task_id=task_id,
        assignee_id=assignee_id,
        assigner_id=assigner_id,
        assigner_name=assigner_name
    )
    return {"success": True}


@router.post("/{project_id}/notify/task-completed")
async def notify_task_completed(
    project_id: str,
    task_id: str = Body(...),
    completer_id: str = Body(...),
    completer_name: str = Body(...)
):
    """Notify relevant users when a task is completed."""
    integration_service.notify_task_completed(
        project_id=project_id,
        task_id=task_id,
        completer_id=completer_id,
        completer_name=completer_name
    )
    return {"success": True}


@router.post("/{project_id}/notify/sprint-started")
async def notify_sprint_started(
    project_id: str,
    sprint_id: str = Body(...),
    starter_id: str = Body(...),
    starter_name: str = Body(...)
):
    """Notify team when a sprint starts."""
    integration_service.notify_sprint_started(
        project_id=project_id,
        sprint_id=sprint_id,
        starter_id=starter_id,
        starter_name=starter_name
    )
    return {"success": True}


# ============== WEBHOOKS ==============

@router.post("/{project_id}/webhooks/github")
async def handle_github_webhook(
    project_id: str,
    event_type: str = Query(..., alias="X-GitHub-Event"),
    payload: Dict[str, Any] = Body(...)
):
    """Handle incoming GitHub webhooks."""
    await integration_service.handle_github_webhook(
        project_id=project_id,
        event_type=event_type,
        payload=payload
    )
    return {"success": True}
