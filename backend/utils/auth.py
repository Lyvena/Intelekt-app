from datetime import datetime, timedelta
from typing import Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from models.database import get_db, User
from config import settings
import os

# Clerk configuration
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
CLERK_JWT_ISSUER = os.getenv("CLERK_JWT_ISSUER", "")  # e.g., https://your-app.clerk.accounts.dev

# Security scheme
security = HTTPBearer()

# Cache for JWKS client
_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> Optional[PyJWKClient]:
    """Get or create JWKS client for Clerk."""
    global _jwks_client
    if _jwks_client is None and CLERK_JWT_ISSUER:
        jwks_url = f"{CLERK_JWT_ISSUER}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url)
    return _jwks_client


async def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk JWT token and return the payload."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    jwks_client = get_jwks_client()
    if not jwks_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication not configured properly"
        )
    
    try:
        # Get the signing key from Clerk's JWKS
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and verify the token
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=CLERK_JWT_ISSUER,
            options={"verify_aud": False}  # Clerk doesn't always include audience
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        print(f"Token validation error: {e}")
        raise credentials_exception


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from Clerk token."""
    token = credentials.credentials
    
    # Verify Clerk token
    payload = await verify_clerk_token(token)
    
    # Get Clerk user ID from token
    clerk_user_id = payload.get("sub")
    if not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Find or create user in our database
    user = db.query(User).filter(User.id == clerk_user_id).first()
    
    if not user:
        # Create user from Clerk data
        user = User(
            id=clerk_user_id,
            email=payload.get("email", ""),
            username=payload.get("username", payload.get("email", clerk_user_id)),
            full_name=payload.get("name", ""),
            hashed_password="",  # No password needed with Clerk
            is_active=True,
            is_superuser=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# Legacy functions for backwards compatibility (can be removed later)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash (legacy)."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password (legacy)."""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token (legacy - not used with Clerk)."""
    pass

# Keep for reference
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes
