"""
Preview Routes - API endpoints for live code preview and execution.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Optional
import os
from pathlib import Path

from services.preview_service import get_preview_service
from utils.auth import get_current_user
from models.database import User

router = APIRouter(prefix="/api/preview", tags=["preview"])


class PythonPreviewRequest(BaseModel):
    """Request to preview Python project."""
    project_id: str
    files: Dict[str, str]
    entry_point: str = "main.py"


class JavaScriptPreviewRequest(BaseModel):
    """Request to preview JavaScript project."""
    project_id: str
    files: Dict[str, str]
    entry_point: str = "index.js"


class HTMLPreviewRequest(BaseModel):
    """Request to preview HTML project."""
    project_id: str
    html: str
    css: Optional[str] = None
    js: Optional[str] = None


@router.post("/python")
async def preview_python(
    request: PythonPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Preview a Python project.
    
    - **project_id**: Project identifier
    - **files**: Dictionary of filename -> content
    - **entry_point**: Main file to execute (default: main.py)
    """
    preview_service = get_preview_service()
    
    success, output, preview_id = await preview_service.preview_python_project(
        request.project_id,
        request.files,
        request.entry_point
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=output)
    
    return {
        "success": True,
        "preview_id": preview_id,
        "output": output,
        "type": "python"
    }


@router.post("/javascript")
async def preview_javascript(
    request: JavaScriptPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Preview a JavaScript/Node.js project.
    
    - **project_id**: Project identifier
    - **files**: Dictionary of filename -> content
    - **entry_point**: Main file to execute (default: index.js)
    """
    preview_service = get_preview_service()
    
    success, output, preview_id = await preview_service.preview_javascript_project(
        request.project_id,
        request.files,
        request.entry_point
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=output)
    
    return {
        "success": True,
        "preview_id": preview_id,
        "output": output,
        "type": "javascript"
    }


@router.post("/html")
async def preview_html(
    request: HTMLPreviewRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Preview an HTML/CSS/JS project.
    
    - **project_id**: Project identifier
    - **html**: HTML content
    - **css**: Optional CSS content
    - **js**: Optional JavaScript content
    """
    preview_service = get_preview_service()
    
    success, html_output, preview_id = await preview_service.preview_html_project(
        request.project_id,
        request.html,
        request.css,
        request.js
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=html_output)
    
    return {
        "success": True,
        "preview_id": preview_id,
        "type": "html"
    }


@router.get("/{preview_id}")
async def get_preview(
    preview_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get preview by ID.
    
    Returns preview content or output based on type.
    """
    preview_service = get_preview_service()
    preview = preview_service.get_preview(preview_id)
    
    if not preview:
        raise HTTPException(status_code=404, detail="Preview not found or expired")
    
    preview_type = preview.get("type")
    
    if preview_type == "html":
        # Return HTML content directly
        return HTMLResponse(content=preview.get("content", ""))
    else:
        # Return output for Python/JavaScript
        return {
            "preview_id": preview_id,
            "type": preview_type,
            "output": preview.get("output", ""),
            "project_id": preview.get("project_id")
        }


@router.delete("/{preview_id}")
async def delete_preview(
    preview_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a preview and clean up resources.
    """
    preview_service = get_preview_service()
    preview = preview_service.get_preview(preview_id)
    
    if not preview:
        raise HTTPException(status_code=404, detail="Preview not found")
    
    preview_service.cleanup_preview(preview_id)
    
    return {
        "success": True,
        "message": f"Preview {preview_id} deleted"
    }


@router.post("/cleanup")
async def cleanup_old_previews(
    current_user: User = Depends(get_current_user)
):
    """
    Clean up old previews (admin only).
    """
    preview_service = get_preview_service()
    preview_service.cleanup_old_previews()
    
    return {
        "success": True,
        "message": "Old previews cleaned up"
    }
