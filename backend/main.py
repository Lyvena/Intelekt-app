from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import chat_router, projects_router
from config import settings
import os

# Create FastAPI app
app = FastAPI(
    title="Intelekt API",
    description="AI-powered web application builder API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat_router)
app.include_router(projects_router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Intelekt API",
        "version": "1.0.0",
        "description": "AI-powered web application builder",
        "endpoints": {
            "chat": "/api/chat",
            "projects": "/api/projects",
            "docs": "/docs"
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
    # Create necessary directories
    os.makedirs(settings.chromadb_path, exist_ok=True)
    os.makedirs(settings.projects_path, exist_ok=True)
    
    print("🚀 Intelekt API started successfully!")
    print(f"📊 ChromaDB path: {settings.chromadb_path}")
    print(f"📁 Projects path: {settings.projects_path}")
    print(f"🤖 Claude configured: {settings.anthropic_api_key is not None}")
    print(f"🤖 Grok configured: {settings.xai_api_key is not None}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
