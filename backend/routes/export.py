"""
Export routes for downloading and exporting projects.
"""

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Dict, Optional
from services.export_service import export_service
from services import code_generator

router = APIRouter(prefix="/api/export", tags=["export"])


class ExportToGitHubRequest(BaseModel):
    """Request to export project to GitHub."""
    project_id: str
    repo_name: str
    github_token: str
    description: Optional[str] = ""
    private: bool = False


class DownloadRequest(BaseModel):
    """Request to download project as ZIP."""
    files: Dict[str, str]
    project_name: str
    include_readme: bool = True


@router.post("/download")
async def download_zip(request: DownloadRequest):
    """
    Generate and download project as ZIP file.
    
    Accepts files directly in the request body.
    """
    try:
        zip_bytes = export_service.create_zip(
            files=request.files,
            project_name=request.project_name,
            include_readme=request.include_readme
        )
        
        filename = f"{request.project_name}.zip"
        
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{project_id}")
async def download_project(project_id: str, include_readme: bool = True):
    """
    Download an existing project as ZIP file.
    """
    try:
        # Get project files from storage
        project_files = code_generator.get_project_files(project_id)
        
        if not project_files:
            raise HTTPException(status_code=404, detail="Project not found or has no files")
        
        files = {f["path"]: f["content"] for f in project_files}
        
        zip_bytes = export_service.create_zip(
            files=files,
            project_name=project_id,
            include_readme=include_readme
        )
        
        filename = f"{project_id}.zip"
        
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github")
async def export_to_github(request: ExportToGitHubRequest):
    """
    Export project to a new GitHub repository.
    
    Requires a GitHub personal access token with 'repo' scope.
    """
    try:
        # Get project files
        project_files = code_generator.get_project_files(request.project_id)
        
        if not project_files:
            raise HTTPException(status_code=404, detail="Project not found or has no files")
        
        files = {f["path"]: f["content"] for f in project_files}
        
        success, message, repo_url = await export_service.export_to_github(
            files=files,
            repo_name=request.repo_name,
            github_token=request.github_token,
            description=request.description or "",
            private=request.private
        )
        
        if success:
            return {
                "success": True,
                "message": message,
                "repo_url": repo_url
            }
        else:
            raise HTTPException(status_code=400, detail=message)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/github/files")
async def export_files_to_github(
    files: Dict[str, str],
    repo_name: str,
    github_token: str,
    description: str = "",
    private: bool = False
):
    """
    Export provided files directly to GitHub.
    """
    try:
        success, message, repo_url = await export_service.export_to_github(
            files=files,
            repo_name=repo_name,
            github_token=github_token,
            description=description,
            private=private
        )
        
        if success:
            return {
                "success": True,
                "message": message,
                "repo_url": repo_url
            }
        else:
            raise HTTPException(status_code=400, detail=message)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/{project_id}")
async def get_project_stats(project_id: str):
    """
    Get statistics about a project (file count, lines, size, etc.)
    """
    try:
        project_files = code_generator.get_project_files(project_id)
        
        if not project_files:
            raise HTTPException(status_code=404, detail="Project not found")
        
        files = {f["path"]: f["content"] for f in project_files}
        stats = export_service.get_project_stats(files)
        
        return {
            "success": True,
            "project_id": project_id,
            **stats
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stats")
async def get_files_stats(files: Dict[str, str]):
    """
    Get statistics about provided files.
    """
    try:
        stats = export_service.get_project_stats(files)
        return {
            "success": True,
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
