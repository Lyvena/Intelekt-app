from pydantic_settings import BaseSettings
from typing import Optional, List
import os


def _get_cors_origins() -> List[str]:
    """Parse CORS origins from environment or use defaults."""
    env_origins = os.getenv("CORS_ORIGINS", "")
    if env_origins:
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://watch.intelekt.live",
        "https://intelekt.live",
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
    
    # Email settings
    resend_api_key: Optional[str] = None
    resend_from: Optional[str] = None
    resend_from_name: str = "Intelekt"

    # Email settings (SMTP fallback)
    mail_username: Optional[str] = None
    mail_password: Optional[str] = None
    mail_from: Optional[str] = None
    mail_from_name: str = "Intelekt"
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    mail_use_tls: bool = True
    mail_use_ssl: bool = False
    
    # Frontend URL for email links
    frontend_url: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

# CORS origins as module-level variable (not on Settings object)
cors_origins = _get_cors_origins()
