from pydantic import BaseModel, Field, EmailStr
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


# Authentication Schemas
class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class User(UserBase):
    """User response schema."""
    id: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    user: User


class TokenData(BaseModel):
    """Token data schema."""
    user_id: Optional[str] = None
