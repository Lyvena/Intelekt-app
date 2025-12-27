from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from models.schemas import ChatRequest, ChatResponse, ChatMessage, AIProvider
from models.database import get_db
from models.database.user import User
from services import ai_service, chroma_service, code_generator, usage_service
from services.context_service import context_service
from services.codebase_indexer import codebase_indexer
from utils.auth import get_current_user
from datetime import datetime
import json
import logging

router = APIRouter(prefix="/api/chat", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("intelekt.chat")


@router.post("", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(
    request: Request, 
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Handle chat messages and generate responses.
    
    This endpoint processes user messages, maintains conversation context,
    and generates code when requested.
    Rate limited to 30 requests per minute.
    """
    try:
        logger.info("chat request start", extra={
            "user_id": getattr(current_user, "id", None),
            "project_id": chat_request.project_id,
            "provider": getattr(chat_request.ai_provider, "value", None)
        })
        # Check usage limits before processing
        usage_service.enforce_generation_limit(db, current_user)
        
        # Check AI provider access
        usage_service.enforce_ai_provider_access(current_user, chat_request.ai_provider.value)
        # Add user message to conversation history
        messages = chat_request.conversation_history + [
            ChatMessage(
                role="user",
                content=chat_request.message,
                timestamp=datetime.now()
            )
        ]
        
        # If project exists, add to context
        if chat_request.project_id:
            chroma_service.add_conversation_context(
                project_id=chat_request.project_id,
                message=chat_request.message,
                role="user"
            )
        
        # Generate AI response
        response_text = await ai_service.generate_response(
            messages=messages,
            provider=chat_request.ai_provider,
            system_prompt=None,
            max_tokens=4096
        )
        
        # Save assistant response to context
        if chat_request.project_id:
            chroma_service.add_conversation_context(
                project_id=chat_request.project_id,
                message=response_text,
                role="assistant"
            )
        
        # Check if code generation is requested
        code_generated = None
        file_path = None
        
        # Simple heuristic: if message contains code-related keywords and project exists
        code_keywords = ["create", "generate", "build", "make", "write", "add", "implement"]
        if chat_request.project_id and any(keyword in chat_request.message.lower() for keyword in code_keywords):
            try:
                # Generate file based on request
                result = await code_generator.generate_file(
                    project_id=chat_request.project_id,
                    prompt=chat_request.message,
                    context="\n".join([m.content for m in messages[-5:]])  # Last 5 messages
                )
                code_generated = result["code"]
                file_path = result["file_path"]
            except Exception as e:
                # If code generation fails, continue with text response
                logger.exception("Code generation failed in chat()")
        
        # Generate suggestions
        suggestions = _generate_suggestions(chat_request.message, chat_request.tech_stack)
        
        # Increment usage count after successful generation
        usage_stats = usage_service.increment_usage(db, current_user)
        
        return ChatResponse(
            message=response_text,
            code_generated=code_generated,
            file_path=file_path,
            project_id=chat_request.project_id,
            suggestions=suggestions
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in chat()")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
@limiter.limit("30/minute")
async def chat_stream(
    request: Request, 
    chat_request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Stream chat responses in real-time using Server-Sent Events.
    
    This endpoint provides real-time streaming of AI responses for better UX.
    Rate limited to 30 requests per minute.
    """
    # Check usage limits before processing (outside generator to return proper HTTP errors)
    logger.info("chat_stream request start", extra={
        "user_id": getattr(current_user, "id", None),
        "project_id": chat_request.project_id,
        "provider": getattr(chat_request.ai_provider, "value", None)
    })

    try:
        usage_service.enforce_generation_limit(db, current_user)
    except HTTPException as he:
        logger.warning("generation limit enforcement failed", exc_info=he)
        raise

    try:
        usage_service.enforce_ai_provider_access(current_user, chat_request.ai_provider.value)
    except HTTPException as he:
        logger.warning("ai provider access enforcement failed", exc_info=he)
        raise
    
    async def generate():
        try:
            logger.info("stream generator started", extra={
                "user_id": getattr(current_user, "id", None),
                "project_id": chat_request.project_id,
                "provider": getattr(chat_request.ai_provider, "value", None)
            })
            # Increment usage at start of stream
            usage_service.increment_usage(db, current_user)
            
            # Add user message to conversation history
            messages = chat_request.conversation_history + [
                ChatMessage(
                    role="user",
                    content=chat_request.message,
                    timestamp=datetime.now()
                )
            ]
            
            # If project exists, add to context and get project context
            project_context = None
            existing_files = {}
            
            if chat_request.project_id:
                chroma_service.add_conversation_context(
                    project_id=chat_request.project_id,
                    message=chat_request.message,
                    role="user"
                )
                
                # Get existing files for context
                try:
                    project_files = code_generator.get_project_files(chat_request.project_id)
                    existing_files = {f["path"]: f["content"] for f in project_files}
                    
                    # Update context with current file structure
                    context_service.update_file_structure(
                        chat_request.project_id,
                        list(existing_files.keys())
                    )
                except Exception:
                    logger.exception("Failed to get project files for context")
                
                # Build COMPREHENSIVE AI context using codebase indexer
                # This gives the AI full understanding of the entire project
                if existing_files:
                    project_context = codebase_indexer.build_ai_context(
                        project_id=chat_request.project_id,
                        files=existing_files,
                        user_query=chat_request.message,
                        max_file_lines=150,  # More context per file
                        max_files=15  # Include more relevant files
                    )
                else:
                    # Fallback to basic context for new projects
                    project_context = context_service.build_context_prompt(
                        chat_request.project_id,
                        include_files=True
                    )
            
            full_response = ""
            
            # Stream the response with context awareness
            async for chunk in ai_service.stream_with_context(
                messages=messages,
                provider=chat_request.ai_provider,
                project_context=project_context,
                existing_files=existing_files if len(existing_files) < 10 else None,
                max_tokens=4096
            ):
                try:
                    logger.debug("stream chunk received", extra={
                        "user_id": getattr(current_user, "id", None),
                        "project_id": chat_request.project_id,
                        "chunk_preview": (chunk[:200] + '...') if len(chunk) > 200 else chunk
                    })
                except Exception:
                    logger.debug("stream chunk received (no extras)")

                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Save complete response to context
            if chat_request.project_id:
                chroma_service.add_conversation_context(
                    project_id=chat_request.project_id,
                    message=full_response,
                    role="assistant"
                )
                
                # Analyze response for technical decisions
                decisions = context_service.analyze_message_for_decisions(
                    chat_request.message,
                    full_response
                )
                for decision in decisions:
                    if decision.get("detected"):
                        context_service.add_decision(
                            chat_request.project_id,
                            decision["type"],
                            f"AI suggested: {decision['type']} related change",
                            "Based on conversation"
                        )
            
            # Check if this is a refinement request
            has_existing_files = len(existing_files) > 0
            is_refinement = ai_service.is_refinement_request(chat_request.message, has_existing_files)
            
            # Check for code generation
            code_keywords = ["create", "generate", "build", "make", "write", "add", "implement"]
            project_keywords = ["app", "application", "website", "project", "page", "todo", "dashboard", "landing", "portfolio", "game", "calculator", "form"]
            
            message_lower = chat_request.message.lower()
            should_generate = chat_request.project_id and any(keyword in message_lower for keyword in code_keywords)
            is_project_request = any(keyword in message_lower for keyword in project_keywords)
            
            if is_refinement and has_existing_files:
                # Handle refinement request
                try:
                    yield f"data: {json.dumps({'type': 'status', 'message': 'Refining code...'})}\n\n"
                    
                    # Get conversation context
                    conversation_context = "\n".join([
                        f"{m.role}: {m.content}" 
                        for m in messages[-5:]
                    ])
                    
                    result = await ai_service.refine_code(
                        instruction=chat_request.message,
                        existing_files=existing_files,
                        provider=chat_request.ai_provider,
                        conversation_context=conversation_context
                    )
                    
                    if result.get("no_changes"):
                        yield f"data: {json.dumps({'type': 'refinement_info', 'no_changes': True, 'explanation': result.get('explanation', 'No changes needed.')})}\n\n"
                    else:
                        # Send summary
                        if result.get("summary"):
                            yield f"data: {json.dumps({'type': 'refinement_info', 'summary': result['summary']})}\n\n"
                        
                        # Send modified files
                        for file_info in result.get("modified_files", []):
                            # Save the file
                            code_generator.save_file(
                                chat_request.project_id,
                                file_info["path"],
                                file_info["content"]
                            )
                            
                            yield f"data: {json.dumps({'type': 'refined_code', 'code': file_info['content'], 'file_path': file_info['path'], 'is_new': file_info.get('is_new', False)})}\n\n"
                
                except Exception as e:
                    logger.exception("Refinement failed")
                    yield f"data: {json.dumps({'type': 'error', 'error': f'Refinement failed: {str(e)}'})}\n\n"
            
            elif should_generate:
                try:
                    if is_project_request:
                        # Multi-file project generation
                        result = await code_generator.generate_project(
                            project_id=chat_request.project_id,
                            prompt=chat_request.message,
                            context="\n".join([m.content for m in messages[-5:]])
                        )
                        
                        # Send each file separately
                        for file_info in result.get("files", []):
                            yield f"data: {json.dumps({'type': 'code', 'code': file_info['content'], 'file_path': file_info['path']})}\n\n"
                        
                        # Send project summary
                        if result.get("explanation"):
                            yield f"data: {json.dumps({'type': 'project_info', 'file_count': result['file_count'], 'dependencies': result['dependencies'], 'explanation': result['explanation']})}\n\n"
                    else:
                        # Single file generation
                        result = await code_generator.generate_file(
                            project_id=chat_request.project_id,
                            prompt=chat_request.message,
                            context="\n".join([m.content for m in messages[-5:]])
                        )
                        yield f"data: {json.dumps({'type': 'code', 'code': result['code'], 'file_path': result['file_path']})}\n\n"
                except Exception as e:
                    logger.exception("Code generation failed")
            
            # Send suggestions
            suggestions = _generate_suggestions(chat_request.message, chat_request.tech_stack)
            logger.debug("sending suggestions", extra={"project_id": chat_request.project_id, "suggestions": suggestions})
            yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"
            
            # Signal completion
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            logger.exception("Unhandled exception in stream generator")
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


def _generate_suggestions(message: str, tech_stack) -> list[str]:
    """Generate contextual suggestions based on the message."""
    suggestions = []
    
    message_lower = message.lower()
    
    # General suggestions
    if "start" in message_lower or "begin" in message_lower or "new" in message_lower:
        suggestions.extend([
            "Create a new project",
            "Set up project structure",
            "Add authentication system"
        ])
    
    if "database" in message_lower or "data" in message_lower:
        suggestions.extend([
            "Set up ChromaDB integration",
            "Create data models",
            "Add CRUD operations"
        ])
    
    if "api" in message_lower or "endpoint" in message_lower:
        suggestions.extend([
            "Create REST API endpoints",
            "Add API documentation",
            "Implement error handling"
        ])
    
    if "frontend" in message_lower or "ui" in message_lower:
        suggestions.extend([
            "Create React components",
            "Add styling with TailwindCSS",
            "Implement responsive design"
        ])
    
    # Tech stack specific suggestions
    if tech_stack:
        if tech_stack.value == "python":
            suggestions.extend([
                "Add FastAPI routes",
                "Create Pydantic models",
                "Set up virtual environment"
            ])
        elif tech_stack.value == "javascript":
            suggestions.extend([
                "Create React components",
                "Add Express routes",
                "Set up package.json"
            ])
    
    return suggestions[:3]  # Return top 3 suggestions


# Request model for fix errors
class FixErrorsRequest(BaseModel):
    errors: List[str]
    files: Dict[str, str]
    ai_provider: AIProvider = AIProvider.CLAUDE
    project_id: Optional[str] = None


class ExplainCodeRequest(BaseModel):
    code: str
    language: str
    ai_provider: AIProvider = AIProvider.CLAUDE
    project_id: Optional[str] = None


@router.post("/explain")
@limiter.limit("20/minute")
async def explain_code(request: Request, explain_request: ExplainCodeRequest):
    """
    Get AI explanation for a code snippet.
    
    This endpoint takes code and returns a detailed explanation
    of what the code does, how it works, and any suggestions.
    """
    try:
        system_prompt = """You are a helpful code explainer. Analyze the provided code and give a clear, 
concise explanation that includes:
1. What the code does (high-level overview)
2. How it works (step-by-step breakdown of key parts)
3. Any important patterns, techniques, or concepts used
4. Potential improvements or things to watch out for

Keep the explanation beginner-friendly but technically accurate. Use simple language."""

        messages = [
            ChatMessage(
                role="user",
                content=f"Please explain this {explain_request.language} code:\n\n```{explain_request.language}\n{explain_request.code}\n```",
                timestamp=datetime.now()
            )
        ]
        
        explanation = await ai_service.generate_response(
            messages=messages,
            provider=explain_request.ai_provider,
            system_prompt=system_prompt,
            max_tokens=2000
        )
        
        return {
            "success": True,
            "explanation": explanation,
            "language": explain_request.language
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AutoDebugRequest(BaseModel):
    errors: List[Dict[str, Any]]
    files: Dict[str, str]
    ai_provider: AIProvider = AIProvider.CLAUDE
    project_id: Optional[str] = None


@router.post("/auto-debug")
@limiter.limit("15/minute")
async def auto_debug(request: Request, debug_request: AutoDebugRequest):
    """
    AI-powered auto-debugging endpoint.
    
    Analyzes errors and generates intelligent fixes with explanations.
    """
    try:
        # Format errors for AI
        error_descriptions = []
        for error in debug_request.errors:
            error_descriptions.append(
                f"- {error.get('file', 'unknown')}:{error.get('line', 0)} - "
                f"[{error.get('severity', 'error')}] {error.get('message', '')}"
            )
        
        # Build context from files
        file_context = "\n\n".join([
            f"// File: {path}\n{content[:2000]}"  # Limit content size
            for path, content in list(debug_request.files.items())[:5]  # Limit files
        ])
        
        system_prompt = """You are an expert code debugger and fixer. Analyze the errors and provide fixes.

For each error, provide:
1. Root cause analysis
2. The exact fix needed
3. Prevention tips

Return a JSON response with this structure:
{
  "analysis": "Brief overview of issues found",
  "fixes": [
    {
      "error_id": "matching error id or index",
      "file": "file path",
      "line": line_number,
      "old_code": "exact code to replace",
      "new_code": "corrected code",
      "explanation": "why this fix works"
    }
  ],
  "suggestions": ["general improvement suggestions"]
}

Be precise with old_code - it must match exactly what's in the file."""

        messages = [
            ChatMessage(
                role="user",
                content=f"""Debug these errors:

{chr(10).join(error_descriptions)}

Files context:
{file_context}

Provide fixes in JSON format.""",
                timestamp=datetime.now()
            )
        ]
        
        response = await ai_service.generate_response(
            messages=messages,
            provider=debug_request.ai_provider,
            system_prompt=system_prompt,
            max_tokens=3000
        )
        
        # Try to parse JSON from response
        import json
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                result = json.loads(json_match.group())
                return {
                    "success": True,
                    "analysis": result.get("analysis", ""),
                    "fixes": result.get("fixes", []),
                    "suggestions": result.get("suggestions", []),
                    "raw_response": response
                }
            except json.JSONDecodeError:
                pass
        
        # Fallback if JSON parsing fails
        return {
            "success": True,
            "analysis": response,
            "fixes": [],
            "suggestions": [],
            "raw_response": response
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fix-errors")
@limiter.limit("10/minute")
async def fix_errors(request: Request, fix_request: FixErrorsRequest):
    """
    Analyze runtime errors and generate fixes.
    
    This endpoint takes error messages and current files,
    then uses AI to analyze and fix the issues.
    """
    try:
        result = await ai_service.fix_errors(
            errors=fix_request.errors,
            existing_files=fix_request.files,
            provider=fix_request.ai_provider
        )
        
        # If we have a project_id, save the fixed files
        if fix_request.project_id and result.get("fixed_files"):
            for file_info in result["fixed_files"]:
                try:
                    code_generator.save_file(
                        fix_request.project_id,
                        file_info["path"],
                        file_info["content"]
                    )
                except Exception as e:
                    print(f"Failed to save fixed file: {e}")
        
        return {
            "success": not result.get("cannot_fix", False),
            "analysis": result.get("analysis", ""),
            "summary": result.get("summary", ""),
            "fixed_files": result.get("fixed_files", []),
            "cannot_fix": result.get("cannot_fix", False),
            "explanation": result.get("explanation", "")
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
