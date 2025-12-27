from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from routes import chat_router, projects_router
from routes.auth import router as auth_router
from routes.preview import router as preview_router
from routes.collaboration import router as collab_router
from routes.deploy import router as deploy_router
from routes.context import router as context_router
from routes.dependencies import router as deps_router
from routes.terminal import router as terminal_router
from routes.export import router as export_router
from routes.git import router as git_router
from routes.framework import router as framework_router
from routes.project_management import router as pm_router
from routes.team import router as team_router
from routes.github import router as github_router
from routes.integration import router as integration_router
from routes.analytics import router as analytics_router
from routes.usage import router as usage_router
from config import settings, cors_origins
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


class HeadToGetMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method == "HEAD":
            # Treat HEAD like GET for routing, but return an empty body per spec
            request.scope["method"] = "GET"
            res = await call_next(request)
            headers = dict(res.headers)
            headers.pop("content-length", None)
            headers.pop("transfer-encoding", None)
            return Response(status_code=res.status_code, headers=headers)
        return await call_next(request)

# Ensure HEAD probes are handled even if upstream sends HEAD instead of GET
app.add_middleware(HeadToGetMiddleware)


# Early HTTP middleware to ensure HEAD is normalized before other middleware
@app.middleware("http")
async def head_to_get_http_middleware(request: Request, call_next):
    if request.method == "HEAD":
        request.scope["method"] = "GET"
        res = await call_next(request)
        headers = dict(res.headers)
        headers.pop("content-length", None)
        headers.pop("transfer-encoding", None)
        return Response(status_code=res.status_code, headers=headers)
    return await call_next(request)

# Configure CORS
# If `CORS_ORIGINS` is set to "*" we enable a regex allow-all so
# browsers can still send credentials if needed during local testing.
if len(cors_origins) == 1 and cors_origins[0] == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
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
app.include_router(deps_router)
app.include_router(terminal_router)
app.include_router(export_router)
app.include_router(git_router)
app.include_router(framework_router)
app.include_router(pm_router)
app.include_router(team_router)
app.include_router(github_router)
app.include_router(integration_router)
app.include_router(analytics_router)
app.include_router(usage_router)


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
            "framework": "/api/framework",
            "project_management": "/api/pm",
            "team": "/api/team",
            "github": "/api/github",
            "integration": "/api/integration",
            "analytics": "/api/analytics",
            "docs": "/docs",
            "collaboration": "/ws/collab"
        }
    }


@app.head("/")
async def root_head():
    """Explicit HEAD handler to satisfy probes that send HEAD requests."""
    return Response(status_code=200)


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
