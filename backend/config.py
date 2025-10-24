from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    anthropic_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
    
    # Database - Use Divio's volume paths if available
    chromadb_path: str = os.getenv("CHROMADB_PATH", "/data/chromadb" if os.path.exists("/data") else "./data/chromadb")
    
    # Projects - Use Divio's volume paths if available
    projects_path: str = os.getenv("PROJECTS_PATH", "/data/generated_projects" if os.path.exists("/data") else "./generated_projects")
    
    # Server - Divio uses PORT environment variable
    host: str = "0.0.0.0"
    port: int = int(os.getenv("PORT", 8000))
    
    # CORS - Allow multiple hosting platforms
    cors_origins: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.onrender.com",
        "https://*.divio-media.net",
        "https://*.divio-media.com",
        "https://*.divio.app",
        "https://*.railway.app",
        "https://*.vercel.app",
        "https://*.netlify.app",
        "https://app.theintelekt.xyz",
        "https://theintelekt.xyz",
    ]
    
    # Database URL (for future PostgreSQL integration)
    database_url: Optional[str] = os.getenv("DATABASE_URL")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
