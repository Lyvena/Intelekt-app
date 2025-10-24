from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class AIProvider(str, Enum):
    """Supported AI providers."""
    CLAUDE = "claude"
    GROK = "grok"


class TechStack(str, Enum):
    """Supported tech stacks for generated apps."""
    MOJO = "mojo"
    PYTHON = "python"
    JAVASCRIPT = "javascript"


class ChatMessage(BaseModel):
    """Chat message model."""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    project_id: Optional[str] = None
    ai_provider: AIProvider = AIProvider.CLAUDE
    tech_stack: Optional[TechStack] = None
    conversation_history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    message: str
    code_generated: Optional[str] = None
    file_path: Optional[str] = None
    project_id: Optional[str] = None
    suggestions: List[str] = Field(default_factory=list)


class Project(BaseModel):
    """Project model."""
    id: str
    name: str
    description: str
    tech_stack: TechStack
    ai_provider: AIProvider
    created_at: datetime
    updated_at: datetime
    files: List[str] = Field(default_factory=list)
    status: Literal["active", "completed", "archived"] = "active"


class ProjectCreate(BaseModel):
    """Request model for creating a project."""
    name: str
    description: str
    tech_stack: TechStack = TechStack.PYTHON
    ai_provider: AIProvider = AIProvider.CLAUDE


class CodeGenerationRequest(BaseModel):
    """Request for code generation."""
    prompt: str
    tech_stack: TechStack
    context: Optional[str] = None
    file_type: Optional[str] = None


class CodeGenerationResponse(BaseModel):
    """Response from code generation."""
    code: str
    explanation: str
    file_name: str
    dependencies: List[str] = Field(default_factory=list)
