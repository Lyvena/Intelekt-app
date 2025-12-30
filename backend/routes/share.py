from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets

from models.database import get_db, ShareLink, ShareType
from services import code_generator, framework_service

router = APIRouter(prefix="/api/share", tags=["share"])


class ShareFrameworkRequest(BaseModel):
    project_id: str
    title: Optional[str] = None
    expires_in_days: Optional[int] = 7


class ShareSnippetRequest(BaseModel):
    project_id: str
    path: str
    content: Optional[str] = None
    title: Optional[str] = None
    expires_in_days: Optional[int] = 7


def _generate_token() -> str:
    return secrets.token_urlsafe(24)


@router.post("/framework")
def create_framework_share(request: ShareFrameworkRequest, db: Session = Depends(get_db)):
    try:
        progress = framework_service.get_progress(request.project_id)
        if not progress:
            raise HTTPException(status_code=404, detail="Framework progress not found")

        expires_at = None
        if request.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)

        token = _generate_token()
        share = ShareLink(
            token=token,
            type=ShareType.FRAMEWORK,
            title=request.title or f"Framework Progress ({request.project_id})",
            payload=progress,
            expires_at=expires_at,
        )
        db.add(share)
        db.commit()
        return {"success": True, "token": token, "url": f"/share/{token}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/snippet")
def create_snippet_share(request: ShareSnippetRequest, db: Session = Depends(get_db)):
    try:
        content = request.content
        if content is None:
            file_content = code_generator.get_file_content(request.project_id, request.path)
            if file_content is None:
                raise HTTPException(status_code=404, detail="File not found")
            content = file_content

        expires_at = None
        if request.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)

        token = _generate_token()
        share = ShareLink(
            token=token,
            type=ShareType.SNIPPET,
            title=request.title or request.path,
            payload={"path": request.path, "content": content},
            expires_at=expires_at,
        )
        db.add(share)
        db.commit()
        return {"success": True, "token": token, "url": f"/share/{token}"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{token}")
def resolve_share(token: str, db: Session = Depends(get_db)):
    share: ShareLink = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not share:
        raise HTTPException(status_code=404, detail="Link not found")
    if share.expires_at and datetime.utcnow() > share.expires_at:
        raise HTTPException(status_code=410, detail="Link expired")
    return {
        "success": True,
        "type": share.type.value,
        "title": share.title,
        "payload": share.payload,
        "expires_at": share.expires_at.isoformat() if share.expires_at else None,
    }
