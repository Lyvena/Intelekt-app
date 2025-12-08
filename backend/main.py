from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routes import chat_router, projects_router
from routes.auth import router as auth_router
from routes.preview import router as preview_router
from routes.collaboration import router as collab_router
from routes.deploy import router as deploy_router
from routes.context import router as context_router
from config import settings
from models.database import Base, engine
import os

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Create FastAPI app
app = FastAPI(
    title="Intelekt API",
    description="AI-powered web application builder API",
    version="1.0.0"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(projects_router)
app.include_router(preview_router)
app.include_router(collab_router)
app.include_router(deploy_router)
app.include_router(context_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Intelekt API",
        "version": "1.0.0",
        "description": "AI-powered web application builder",
        "endpoints": {
            "auth": "/api/auth",
            "chat": "/api/chat",
            "projects": "/api/projects",
            "docs": "/docs",
            "collaboration": "/ws/collab"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "anthropic_configured": settings.anthropic_api_key is not None,
        "xai_configured": settings.xai_api_key is not None
    }


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    # Create database tables
    Base.metadata.create_all(bind=engine)
    
    # Create necessary directories
    os.makedirs(settings.chromadb_path, exist_ok=True)
    os.makedirs(settings.projects_path, exist_ok=True)
    
    print("🚀 Intelekt API started successfully!")
    print(f"💾 Database initialized")
    print(f"📊 ChromaDB path: {settings.chromadb_path}")
    print(f"📁 Projects path: {settings.projects_path}")
    print(f"🤖 Claude configured: {settings.anthropic_api_key is not None}")
    print(f"🤖 Grok configured: {settings.xai_api_key is not None}")
    print(f"🔐 Authentication: Enabled")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
