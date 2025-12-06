from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.schemas import ChatRequest, ChatResponse, ChatMessage
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
            
            # Check for code generation
            code_generated = None
            file_path = None
            
            code_keywords = ["create", "generate", "build", "make", "write", "add", "implement"]
            if chat_request.project_id and any(keyword in chat_request.message.lower() for keyword in code_keywords):
                try:
                    result = await code_generator.generate_file(
                        project_id=chat_request.project_id,
                        prompt=chat_request.message,
                        context="\n".join([m.content for m in messages[-5:]])
                    )
                    code_generated = result["code"]
                    file_path = result["file_path"]
                    
                    yield f"data: {json.dumps({'type': 'code', 'code': code_generated, 'file_path': file_path})}\n\n"
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
