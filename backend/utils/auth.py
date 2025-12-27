from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from itsdangerous import URLSafeTimedSerializer
from models.database import get_db, User
from config import settings
import logging

logger = logging.getLogger("intelekt.auth")

# Password hashing - prefer Argon2, fall back to bcrypt
# Argon2 avoids bcrypt's 72-byte password limit and is more secure by default.
pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = settings.secret_key
ALGORITHM = settings.algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

# Security scheme
security = HTTPBearer()

# Token serializer for password reset and email verification
token_serializer = URLSafeTimedSerializer(SECRET_KEY)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict:
    """Verify a JWT token and return the payload."""
    try:
        logger.debug("Verifying token", extra={"token_preview": token[:10] + '...' if token else None})
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        # Attempt to log unverified header/payload for debugging (do not log the full token)
        try:
            unverified_header = jwt.get_unverified_header(token)
            unverified_payload = jwt.decode(token, options={"verify_signature": False})
            logger.warning("Invalid token provided", extra={
                "alg": unverified_header.get("alg"),
                "token_sub": unverified_payload.get("sub"),
                "token_exp": unverified_payload.get("exp")
            })
        except Exception:
            logger.warning("Invalid token provided (could not decode unverified header/payload)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def create_verification_token(email: str) -> str:
    """Create email verification token."""
    return token_serializer.dumps(email, salt="email-verification")


def verify_verification_token(token: str, max_age: int = 86400) -> Optional[str]:
    """Verify email verification token. Default max age is 24 hours."""
    try:
        email = token_serializer.loads(token, salt="email-verification", max_age=max_age)
        return email
    except Exception:
        return None


def create_reset_token(email: str) -> str:
    """Create password reset token."""
    return token_serializer.dumps(email, salt="password-reset")


def verify_reset_token(token: str, max_age: int = 3600) -> Optional[str]:
    """Verify password reset token. Default max age is 1 hour."""
    try:
        email = token_serializer.loads(token, salt="password-reset", max_age=max_age)
        return email
    except Exception:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token."""
    token = credentials.credentials
    logger.debug("get_current_user called", extra={"has_token": bool(token)})

    # Verify token
    payload = verify_token(token)
    
    # Get user ID from token
    user_id = payload.get("sub")
    if not user_id:
        logger.warning("Token payload missing 'sub' claim", extra={"payload": payload})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Find user in database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        logger.warning("User id from token not found in DB", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
