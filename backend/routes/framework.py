"""
MIT 24-Step Framework API Routes

These endpoints handle the framework analysis process,
guiding users through idea development before code generation.
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from typing import Optional
from models.schemas import (
    ChatMessage, AIProvider, FrameworkStepUpdate, 
    FrameworkProgress, ProjectPhase
)
from services.framework_service import framework_service, MIT_24_STEPS, FrameworkPhase
from services import ai_service
from datetime import datetime
import json

router = APIRouter(prefix="/api/framework", tags=["framework"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/initialize/{project_id}")
async def initialize_framework(project_id: str, idea: dict):
    """
    Initialize the MIT 24-Step framework for a new project.
    
    Args:
        project_id: The project ID
        idea: Dict containing 'description' of the startup idea
    """
    try:
        idea_description = idea.get("description", "")
        if not idea_description:
            raise HTTPException(status_code=400, detail="Idea description is required")
        
        session = framework_service.initialize_framework(project_id, idea_description)
        
        # Mark step 1 as in progress
        session["steps"]["1"]["status"] = "in_progress"
        
        return {
            "success": True,
            "project_id": project_id,
            "current_step": 1,
            "current_phase": FrameworkPhase.CUSTOMER.value,
            "step_details": session["steps"]["1"],
            "message": "Framework initialized. Let's start by understanding your market!"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{project_id}")
async def get_framework_session(project_id: str):
    """Get the current framework session for a project."""
    session = framework_service.get_session(project_id)
    if not session:
        raise HTTPException(status_code=404, detail="No framework session found")
    
    return {
        "session": session,
        "progress": framework_service.get_framework_progress(project_id)
    }


@router.get("/step/{project_id}")
async def get_current_step(project_id: str):
    """Get the current step details for a project."""
    step = framework_service.get_current_step(project_id)
    if not step:
        raise HTTPException(status_code=404, detail="No current step found")
    
    return {
        "step": step,
        "progress": framework_service.get_framework_progress(project_id)
    }


@router.get("/step/{project_id}/{step_number}")
async def get_step_details(project_id: str, step_number: int):
    """Get details for a specific step."""
    session = framework_service.get_session(project_id)
    if not session:
        raise HTTPException(status_code=404, detail="No framework session found")
    
    step_key = str(step_number)
    if step_key not in session["steps"]:
        raise HTTPException(status_code=404, detail="Invalid step number")
    
    return {"step": session["steps"][step_key]}


@router.post("/step/{project_id}/complete")
async def complete_step(project_id: str, update: FrameworkStepUpdate):
    """
    Mark a step as complete and advance to the next step.
    """
    try:
        # Update the current step
        framework_service.update_step(
            project_id=project_id,
            step_number=update.step_number,
            user_responses=update.user_responses,
            ai_analysis=update.ai_analysis
        )
        
        # Advance to next step
        next_step = framework_service.advance_to_next_step(project_id)
        progress = framework_service.get_framework_progress(project_id)
        
        if next_step:
            return {
                "success": True,
                "completed_step": update.step_number,
                "next_step": next_step,
                "progress": progress
            }
        else:
            # All steps completed
            summary = framework_service.generate_framework_summary(project_id)
            return {
                "success": True,
                "completed_step": update.step_number,
                "framework_completed": True,
                "summary": summary,
                "progress": progress,
                "message": "Congratulations! Framework analysis complete. Ready for development!"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step/{project_id}/skip/{step_number}")
async def skip_step(project_id: str, step_number: int):
    """Skip a step (for advanced users)."""
    try:
        next_step = framework_service.skip_step(project_id, step_number)
        progress = framework_service.get_framework_progress(project_id)
        
        return {
            "success": True,
            "skipped_step": step_number,
            "next_step": next_step,
            "progress": progress
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{project_id}")
async def get_progress(project_id: str):
    """Get framework progress for a project."""
    progress = framework_service.get_framework_progress(project_id)
    if "error" in progress:
        raise HTTPException(status_code=404, detail=progress["error"])
    return progress


@router.get("/can-develop/{project_id}")
async def can_start_development(project_id: str):
    """Check if the project is ready to start development."""
    result = framework_service.can_start_development(project_id)
    return result


@router.get("/summary/{project_id}")
async def get_framework_summary(project_id: str):
    """Get the framework summary for a project."""
    summary = framework_service.generate_framework_summary(project_id)
    if "error" in summary:
        raise HTTPException(status_code=404, detail=summary["error"])
    return summary


@router.get("/export/{project_id}")
async def export_framework_document(project_id: str):
    """Export the framework analysis as a markdown document."""
    doc = framework_service.export_framework_document(project_id)
    return {"document": doc}


@router.get("/steps")
async def get_all_steps():
    """Get all 24 steps of the MIT framework."""
    return {"steps": MIT_24_STEPS}


@router.post("/chat/{project_id}")
@limiter.limit("30/minute")
async def framework_chat(request: Request, project_id: str, chat_data: dict):
    """
    Handle chat during framework analysis.
    
    This endpoint provides AI guidance through each step of the framework.
    """
    try:
        message = chat_data.get("message", "")
        ai_provider = AIProvider(chat_data.get("ai_provider", "claude"))
        conversation_history = chat_data.get("conversation_history", [])
        
        # Get current framework state
        session = framework_service.get_session(project_id)
        if not session:
            # Initialize if not exists
            idea = chat_data.get("idea", message)
            session = framework_service.initialize_framework(project_id, idea)
        
        # Get framework-specific prompt
        system_prompt = framework_service.get_framework_prompt_for_step(project_id)
        
        # Build messages
        messages = [
            ChatMessage(role=m["role"], content=m["content"], timestamp=datetime.now())
            for m in conversation_history
        ]
        messages.append(ChatMessage(role="user", content=message, timestamp=datetime.now()))
        
        # Generate response
        response = await ai_service.generate_response(
            messages=messages,
            provider=ai_provider,
            system_prompt=system_prompt,
            max_tokens=4096
        )
        
        progress = framework_service.get_framework_progress(project_id)
        current_step = framework_service.get_current_step(project_id)
        
        return {
            "message": response,
            "framework_step": current_step["number"] if current_step else None,
            "framework_phase": current_step["phase"].value if current_step else None,
            "step_name": current_step["name"] if current_step else None,
            "progress": progress,
            "suggestions": _generate_framework_suggestions(current_step)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/{project_id}/stream")
@limiter.limit("30/minute")
async def framework_chat_stream(request: Request, project_id: str, chat_data: dict):
    """
    Stream chat responses during framework analysis.
    """
    async def generate():
        try:
            message = chat_data.get("message", "")
            ai_provider = AIProvider(chat_data.get("ai_provider", "claude"))
            conversation_history = chat_data.get("conversation_history", [])
            
            # Get or initialize framework session
            session = framework_service.get_session(project_id)
            if not session:
                idea = chat_data.get("idea", message)
                session = framework_service.initialize_framework(project_id, idea)
                yield f"data: {json.dumps({'type': 'framework_init', 'step': 1, 'phase': 'customer'})}\n\n"
            
            # Get framework-specific prompt
            system_prompt = framework_service.get_framework_prompt_for_step(project_id)
            
            # Build messages
            messages = [
                ChatMessage(role=m["role"], content=m["content"], timestamp=datetime.now())
                for m in conversation_history
            ]
            messages.append(ChatMessage(role="user", content=message, timestamp=datetime.now()))
            
            # Stream response
            full_response = ""
            async for chunk in ai_service.stream_response(
                messages=messages,
                provider=ai_provider,
                system_prompt=system_prompt,
                max_tokens=4096
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Get progress
            progress = framework_service.get_framework_progress(project_id)
            current_step = framework_service.get_current_step(project_id)
            
            # Send framework state
            yield f"data: {json.dumps({'type': 'framework_state', 'step': current_step['number'] if current_step else None, 'phase': current_step['phase'].value if current_step else None, 'step_name': current_step['name'] if current_step else None, 'progress': progress})}\n\n"
            
            # Check for step completion signals in the response
            completion_signals = [
                "ready to move to the next step",
                "let's proceed to step",
                "move on to step",
                "completed this step",
                "next step"
            ]
            
            should_suggest_advance = any(signal in full_response.lower() for signal in completion_signals)
            
            if should_suggest_advance:
                yield f"data: {json.dumps({'type': 'suggest_advance', 'current_step': current_step['number'] if current_step else None})}\n\n"
            
            # Send suggestions
            suggestions = _generate_framework_suggestions(current_step)
            yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"
            
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


def _generate_framework_suggestions(current_step: Optional[dict]) -> list:
    """Generate suggestions based on current framework step."""
    if not current_step:
        return ["Start framework analysis", "Skip to development"]
    
    suggestions = []
    
    # Add step-specific suggestions
    if current_step["number"] == 1:
        suggestions = [
            "Help me identify market segments",
            "What industries face this problem?",
            "Show me example customer segments"
        ]
    elif current_step["number"] == 2:
        suggestions = [
            "Help me select a beachhead market",
            "What criteria should I use?",
            "Analyze my market options"
        ]
    elif current_step["number"] == 5:
        suggestions = [
            "Help me create a persona",
            "What details should I include?",
            "Show me a persona example"
        ]
    elif current_step["number"] == 7:
        suggestions = [
            "Help define my MVP features",
            "What's essential vs nice-to-have?",
            "Create a product specification"
        ]
    elif current_step["number"] == 8:
        suggestions = [
            "Calculate my value proposition",
            "Compare to alternatives",
            "Quantify the benefits"
        ]
    elif current_step["number"] == 15:
        suggestions = [
            "Help design my business model",
            "What pricing models work best?",
            "Analyze revenue streams"
        ]
    elif current_step["number"] == 21:
        suggestions = [
            "Design my MVP",
            "What's the minimum to test?",
            "Define success metrics"
        ]
    else:
        suggestions = [
            f"Help me with {current_step['name']}",
            "Show me examples",
            "What questions should I answer?"
        ]
    
    # Add navigation suggestions
    suggestions.append("Complete this step")
    if current_step["number"] > 1:
        suggestions.append("Go back to previous step")
    
    return suggestions[:4]
