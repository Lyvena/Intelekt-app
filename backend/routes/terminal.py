"""
Terminal routes for command execution and output streaming.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import json
from services.terminal_service import terminal_service

router = APIRouter(prefix="/api/terminal", tags=["terminal"])


class ExecuteCommandRequest(BaseModel):
    """Request to execute a command."""
    command: str
    project_id: str
    session_id: Optional[str] = None
    timeout: int = 300


class RunScriptRequest(BaseModel):
    """Request to run an npm script."""
    script_name: str
    project_id: str


@router.post("/execute")
async def execute_command(request: ExecuteCommandRequest):
    """
    Execute a command and return the result.
    
    This is a synchronous endpoint that waits for the command to complete.
    For long-running commands, use the /stream endpoint instead.
    """
    result = await terminal_service.execute_command(
        command=request.command,
        project_id=request.project_id,
        session_id=request.session_id,
        timeout=request.timeout
    )
    
    return {
        "success": result.status.value == "completed",
        "id": result.id,
        "command": result.command,
        "status": result.status.value,
        "exit_code": result.exit_code,
        "output": result.output,
        "error": result.error,
        "started_at": result.started_at.isoformat() if result.started_at else None,
        "completed_at": result.completed_at.isoformat() if result.completed_at else None,
    }


@router.post("/stream")
async def stream_command(request: ExecuteCommandRequest):
    """
    Execute a command and stream output in real-time using SSE.
    
    Returns a stream of Server-Sent Events with command output.
    """
    async def generate():
        async for event in terminal_service.stream_command(
            command=request.command,
            project_id=request.project_id,
            session_id=request.session_id
        ):
            yield f"data: {json.dumps(event)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/cancel/{command_id}")
async def cancel_command(command_id: str):
    """Cancel a running command."""
    success = await terminal_service.cancel_command(command_id)
    
    if success:
        return {"success": True, "message": "Command cancelled"}
    else:
        raise HTTPException(status_code=404, detail="Command not found or already completed")


@router.get("/scripts/{project_id}")
async def get_npm_scripts(project_id: str):
    """
    Get npm scripts from a project's package.json.
    """
    scripts = terminal_service.get_npm_scripts(project_id)
    
    return {
        "success": True,
        "scripts": scripts,
        "script_count": len(scripts)
    }


@router.post("/scripts/run")
async def run_npm_script(request: RunScriptRequest):
    """
    Run an npm script from package.json.
    """
    # Validate script exists
    scripts = terminal_service.get_npm_scripts(request.project_id)
    
    if request.script_name not in scripts:
        raise HTTPException(
            status_code=404,
            detail=f"Script '{request.script_name}' not found in package.json"
        )
    
    # Execute npm run <script>
    result = await terminal_service.execute_command(
        command=f"npm run {request.script_name}",
        project_id=request.project_id
    )
    
    return {
        "success": result.status.value == "completed",
        "id": result.id,
        "script": request.script_name,
        "status": result.status.value,
        "exit_code": result.exit_code,
        "output": result.output,
        "error": result.error,
    }


@router.get("/suggestions/{project_id}")
async def get_command_suggestions(project_id: str):
    """
    Get suggested commands for a project.
    """
    commands = terminal_service.get_common_commands(project_id)
    
    return {
        "success": True,
        "commands": commands
    }


@router.post("/session/{project_id}")
async def create_session(project_id: str):
    """
    Create a new terminal session for a project.
    """
    session = terminal_service.create_session(project_id)
    
    return {
        "success": True,
        "session_id": session.id,
        "project_id": session.project_id,
        "working_directory": session.working_directory,
        "created_at": session.created_at.isoformat()
    }


@router.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """
    Get command history for a session.
    """
    history = terminal_service.get_session_history(session_id)
    
    return {
        "success": True,
        "history": history,
        "count": len(history)
    }


@router.get("/validate")
async def validate_command(command: str):
    """
    Check if a command is safe to execute.
    """
    is_safe, reason = terminal_service.is_command_safe(command)
    
    return {
        "safe": is_safe,
        "reason": reason
    }
