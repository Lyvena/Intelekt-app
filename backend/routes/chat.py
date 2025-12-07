from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from pydantic import BaseModel
from typing import List, Dict, Optional
from models.schemas import ChatRequest, ChatResponse, ChatMessage, AIProvider
from services import ai_service, chroma_service, code_generator
from datetime import datetime
import json

router = APIRouter(prefix="/api/chat", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=ChatResponse)
@limiter.limit("30/minute")
async def chat(request: Request, chat_request: ChatRequest):
    """
    Handle chat messages and generate responses.
    
    This endpoint processes user messages, maintains conversation context,
    and generates code when requested.
    Rate limited to 30 requests per minute.
    """
    try:
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
                print(f"Code generation failed: {e}")
        
        # Generate suggestions
        suggestions = _generate_suggestions(chat_request.message, chat_request.tech_stack)
        
        return ChatResponse(
            message=response_text,
            code_generated=code_generated,
            file_path=file_path,
            project_id=chat_request.project_id,
            suggestions=suggestions
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
@limiter.limit("30/minute")
async def chat_stream(request: Request, chat_request: ChatRequest):
    """
    Stream chat responses in real-time using Server-Sent Events.
    
    This endpoint provides real-time streaming of AI responses for better UX.
    Rate limited to 30 requests per minute.
    """
    async def generate():
        try:
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
            
            full_response = ""
            
            # Stream the response
            async for chunk in ai_service.stream_response(
                messages=messages,
                provider=chat_request.ai_provider,
                system_prompt=None,
                max_tokens=4096
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
            
            # Save complete response to context
            if chat_request.project_id:
                chroma_service.add_conversation_context(
                    project_id=chat_request.project_id,
                    message=full_response,
                    role="assistant"
                )
            
            # Get existing project files for context
            existing_files = {}
            if chat_request.project_id:
                try:
                    project_files = code_generator.get_project_files(chat_request.project_id)
                    existing_files = {f["path"]: f["content"] for f in project_files}
                except Exception:
                    pass
            
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
                    print(f"Refinement failed: {e}")
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
                    print(f"Code generation failed: {e}")
            
            # Send suggestions
            suggestions = _generate_suggestions(chat_request.message, chat_request.tech_stack)
            yield f"data: {json.dumps({'type': 'suggestions', 'suggestions': suggestions})}\n\n"
            
            # Signal completion
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
