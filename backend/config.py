from pydantic_settings import BaseSettings
from typing import Optional, List
import os


# Parse CORS origins before Settings class
def get_cors_origins() -> List[str]:
    """Parse CORS origins from environment or use defaults."""
    env_origins = os.getenv("CORS_ORIGINS", "")
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://app.theintelekt.xyz",
        "https://app1.theintelekt.xyz",
        "https://theintelekt.xyz",
    ]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    anthropic_api_key: Optional[str] = None
    xai_api_key: Optional[str] = None
    
    # Security
    secret_key: str = "your-secret-key-change-in-production-please-use-a-long-random-string"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30 * 24 * 60  # 30 days
    
    # Database - Use volume paths if available
    chromadb_path: str = "/data/chromadb" if os.path.exists("/data") else "./data/chromadb"
    
    # Projects - Use volume paths if available  
    projects_path: str = "/data/generated_projects" if os.path.exists("/data") else "./generated_projects"
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Database URL (PostgreSQL for production)
    database_url: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# Add cors_origins as a separate attribute (not a pydantic field)
settings.cors_origins = get_cors_origins()
