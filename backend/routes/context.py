"""
Context routes for managing project context and AI memory.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional
from services.context_service import context_service

router = APIRouter(prefix="/api/context", tags=["context"])


class UpdateTechStackRequest(BaseModel):
    """Request to update tech stack."""
    tech_stack: Dict[str, str]


class AddDecisionRequest(BaseModel):
    """Request to add a technical decision."""
    decision_type: str
    description: str
    rationale: Optional[str] = ""


class AddPatternRequest(BaseModel):
    """Request to add a code pattern."""
    pattern: str


class UpdateSummaryRequest(BaseModel):
    """Request to update conversation summary."""
    summary: str


@router.get("/{project_id}")
async def get_project_context(project_id: str):
    """
    Get the full context for a project.
    
    Returns tech stack, file structure, decisions, and patterns.
    """
    context = context_service.get_project_context(project_id)
    
    return {
        "project_id": project_id,
        "tech_stack": context.tech_stack,
        "file_structure": context.file_structure,
        "decisions": context.decisions,
        "patterns": context.patterns,
        "conversation_summary": context.conversation_summary,
        "last_updated": context.last_updated.isoformat()
    }


@router.get("/{project_id}/prompt")
async def get_context_prompt(project_id: str, include_files: bool = True):
    """
    Get the context prompt for AI consumption.
    
    This is the formatted context string that gets included
    in AI prompts to enable context-aware suggestions.
    """
    prompt = context_service.build_context_prompt(project_id, include_files)
    return {"prompt": prompt}


@router.get("/{project_id}/suggestions")
async def get_suggestions(project_id: str, message: Optional[str] = None):
    """
    Get context-aware suggestions for the project.
    
    Returns a list of suggested next steps based on project state.
    """
    suggestions = context_service.get_suggestions(project_id, message or "")
    return {"suggestions": suggestions}


@router.post("/{project_id}/tech-stack")
async def update_tech_stack(project_id: str, request: UpdateTechStackRequest):
    """Update the tech stack for a project."""
    context_service.update_tech_stack(project_id, request.tech_stack)
    return {"success": True, "message": "Tech stack updated"}


@router.post("/{project_id}/files")
async def update_file_structure(project_id: str, files: List[str]):
    """Update the file structure for a project."""
    context_service.update_file_structure(project_id, files)
    return {"success": True, "message": "File structure updated"}


@router.post("/{project_id}/decision")
async def add_decision(project_id: str, request: AddDecisionRequest):
    """
    Add a technical decision to the project context.
    
    Decisions are stored and used to maintain consistency
    in future AI suggestions.
    """
    context_service.add_decision(
        project_id,
        request.decision_type,
        request.description,
        request.rationale
    )
    return {"success": True, "message": "Decision recorded"}


@router.post("/{project_id}/pattern")
async def add_pattern(project_id: str, request: AddPatternRequest):
    """Add a code pattern to the project context."""
    context_service.add_pattern(project_id, request.pattern)
    return {"success": True, "message": "Pattern added"}


@router.post("/{project_id}/summary")
async def update_summary(project_id: str, request: UpdateSummaryRequest):
    """Update the conversation summary for a project."""
    context_service.update_conversation_summary(project_id, request.summary)
    return {"success": True, "message": "Summary updated"}


@router.delete("/{project_id}")
async def clear_context(project_id: str):
    """Clear all context for a project."""
    context_service.clear_context(project_id)
    return {"success": True, "message": "Context cleared"}
