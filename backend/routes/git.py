"""
Git routes for version control operations.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.git_service import git_service

router = APIRouter(prefix="/api/git", tags=["git"])


class CommitRequest(BaseModel):
    """Request to create a commit."""
    message: str
    add_all: bool = True


class BranchRequest(BaseModel):
    """Request for branch operations."""
    branch_name: str


class AddFilesRequest(BaseModel):
    """Request to stage files."""
    files: Optional[List[str]] = None


class DiscardRequest(BaseModel):
    """Request to discard changes."""
    files: Optional[List[str]] = None


@router.post("/{project_id}/init")
async def init_repository(project_id: str):
    """Initialize a git repository for the project."""
    success, message = git_service.init_repo(project_id)
    
    if success:
        return {"success": True, "message": message}
    raise HTTPException(status_code=400, detail=message)


@router.get("/{project_id}/status")
async def get_status(project_id: str):
    """Get the current git status."""
    if not git_service.is_git_repo(project_id):
        return {
            "success": True,
            "is_repo": False,
            "message": "Not a git repository"
        }
    
    status = git_service.get_status(project_id)
    current_branch = git_service.get_current_branch(project_id)
    
    return {
        "success": True,
        "is_repo": True,
        "branch": current_branch,
        **status
    }


@router.post("/{project_id}/add")
async def stage_files(project_id: str, request: AddFilesRequest):
    """Stage files for commit."""
    success, message = git_service.add_files(project_id, request.files)
    
    if success:
        return {"success": True, "message": message}
    raise HTTPException(status_code=400, detail=message)


@router.post("/{project_id}/commit")
async def create_commit(project_id: str, request: CommitRequest):
    """Create a new commit."""
    success, message, commit_hash = git_service.commit(
        project_id,
        request.message,
        request.add_all
    )
    
    if success:
        return {
            "success": True,
            "message": message,
            "commit_hash": commit_hash
        }
    raise HTTPException(status_code=400, detail=message)


@router.get("/{project_id}/log")
async def get_commit_log(project_id: str, limit: int = 50):
    """Get commit history."""
    commits = git_service.get_log(project_id, limit)
    
    return {
        "success": True,
        "commits": [
            {
                "hash": c.hash,
                "short_hash": c.short_hash,
                "message": c.message,
                "author": c.author,
                "date": c.date
            }
            for c in commits
        ],
        "count": len(commits)
    }


@router.get("/{project_id}/branches")
async def get_branches(project_id: str):
    """Get all branches."""
    branches = git_service.get_branches(project_id)
    current = git_service.get_current_branch(project_id)
    
    return {
        "success": True,
        "current_branch": current,
        "branches": [
            {
                "name": b.name,
                "is_current": b.is_current
            }
            for b in branches
        ],
        "count": len(branches)
    }


@router.post("/{project_id}/branches")
async def create_branch(project_id: str, request: BranchRequest):
    """Create a new branch."""
    success, message = git_service.create_branch(project_id, request.branch_name)
    
    if success:
        return {"success": True, "message": message}
    raise HTTPException(status_code=400, detail=message)


@router.post("/{project_id}/checkout")
async def checkout_branch(project_id: str, request: BranchRequest):
    """Switch to a branch."""
    success, message = git_service.checkout_branch(project_id, request.branch_name)
    
    if success:
        return {"success": True, "message": message}
    raise HTTPException(status_code=400, detail=message)


@router.get("/{project_id}/diff")
async def get_diff(
    project_id: str, 
    staged: bool = False,
    commit: Optional[str] = None
):
    """Get diff of changes."""
    diffs = git_service.get_diff(project_id, staged, commit)
    
    return {
        "success": True,
        "diffs": [
            {
                "path": d.path,
                "status": d.status,
                "additions": d.additions,
                "deletions": d.deletions,
                "diff_content": d.diff_content
            }
            for d in diffs
        ],
        "count": len(diffs)
    }


@router.get("/{project_id}/file/{commit}")
async def get_file_at_commit(project_id: str, commit: str, path: str):
    """Get file content at a specific commit."""
    content = git_service.get_file_at_commit(project_id, commit, path)
    
    if content is not None:
        return {
            "success": True,
            "content": content,
            "commit": commit,
            "path": path
        }
    raise HTTPException(status_code=404, detail="File not found at commit")


@router.post("/{project_id}/discard")
async def discard_changes(project_id: str, request: DiscardRequest):
    """Discard uncommitted changes."""
    success, message = git_service.discard_changes(project_id, request.files)
    
    if success:
        return {"success": True, "message": message}
    raise HTTPException(status_code=400, detail=message)


@router.get("/{project_id}/is-repo")
async def check_is_repo(project_id: str):
    """Check if project is a git repository."""
    is_repo = git_service.is_git_repo(project_id)
    return {
        "success": True,
        "is_repo": is_repo
    }
