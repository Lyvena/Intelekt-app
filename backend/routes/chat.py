from fastapi import APIRouter, HTTPException
from models.schemas import ChatRequest, ChatResponse, ChatMessage
from services import ai_service, chroma_service, code_generator
from datetime import datetime

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Handle chat messages and generate responses.
    
    This endpoint processes user messages, maintains conversation context,
    and generates code when requested.
    """
    try:
        # Add user message to conversation history
        messages = request.conversation_history + [
            ChatMessage(
                role="user",
                content=request.message,
                timestamp=datetime.now()
            )
        ]
        
        # If project exists, add to context
        if request.project_id:
            chroma_service.add_conversation_context(
                project_id=request.project_id,
                message=request.message,
                role="user"
            )
        
        # Generate AI response
        response_text = await ai_service.generate_response(
            messages=messages,
            provider=request.ai_provider,
            system_prompt=None,
            max_tokens=4096
        )
        
        # Save assistant response to context
        if request.project_id:
            chroma_service.add_conversation_context(
                project_id=request.project_id,
                message=response_text,
                role="assistant"
            )
        
        # Check if code generation is requested
        code_generated = None
        file_path = None
        
        # Simple heuristic: if message contains code-related keywords and project exists
        code_keywords = ["create", "generate", "build", "make", "write", "add", "implement"]
        if request.project_id and any(keyword in request.message.lower() for keyword in code_keywords):
            try:
                # Generate file based on request
                result = await code_generator.generate_file(
                    project_id=request.project_id,
                    prompt=request.message,
                    context="\n".join([m.content for m in messages[-5:]])  # Last 5 messages
                )
                code_generated = result["code"]
                file_path = result["file_path"]
            except Exception as e:
                # If code generation fails, continue with text response
                print(f"Code generation failed: {e}")
        
        # Generate suggestions
        suggestions = _generate_suggestions(request.message, request.tech_stack)
        
        return ChatResponse(
            message=response_text,
            code_generated=code_generated,
            file_path=file_path,
            project_id=request.project_id,
            suggestions=suggestions
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
