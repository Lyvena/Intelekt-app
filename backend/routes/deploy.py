"""
Deployment routes for one-click deploy to Railway.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from services.deployment_service import deployment_service
from services.code_generator import code_generator

router = APIRouter(prefix="/api/deploy", tags=["deploy"])
limiter = Limiter(key_func=get_remote_address)


class DeployRequest(BaseModel):
    """Request model for deployment."""
    project_id: Optional[str] = None
    project_name: str
    files: Dict[str, str]
    railway_token: Optional[str] = None


class DeployFromProjectRequest(BaseModel):
    """Request model for deploying an existing project."""
    project_id: str
    railway_token: Optional[str] = None


@router.get("/status")
async def deployment_status():
    """Check if deployment service is configured."""
    return {
        "railway_configured": deployment_service.is_configured(),
        "supported_platforms": ["railway"],
        "instructions": "Set RAILWAY_API_TOKEN environment variable or provide token in request"
    }


@router.post("/railway")
@limiter.limit("5/minute")
async def deploy_to_railway(request: Request, deploy_request: DeployRequest):
    """
    Deploy files to Railway.
    
    This endpoint creates a new Railway project and deploys the provided files.
    """
    try:
        result = await deployment_service.deploy_project(
            project_name=deploy_request.project_name,
            files=deploy_request.files,
            user_token=deploy_request.railway_token
        )
        
        return result
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")


@router.post("/railway/project/{project_id}")
@limiter.limit("5/minute")
async def deploy_project_to_railway(
    request: Request,
    project_id: str,
    deploy_request: DeployFromProjectRequest
):
    """
    Deploy an existing Intelekt project to Railway.
    """
    try:
        # Get project files
        project = code_generator.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get all files
        files_list = code_generator.get_project_files(project_id)
        files = {f["path"]: f["content"] for f in files_list}
        
        if not files:
            raise HTTPException(status_code=400, detail="Project has no files to deploy")
        
        # Deploy
        result = await deployment_service.deploy_project(
            project_name=project.name,
            files=files,
            user_token=deploy_request.railway_token
        )
        
        return result
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {str(e)}")


@router.get("/railway/status/{deployment_id}")
async def get_railway_deployment_status(
    deployment_id: str,
    railway_token: Optional[str] = None
):
    """Get the status of a Railway deployment."""
    try:
        result = await deployment_service.get_deployment_status(
            deployment_id=deployment_id,
            token=railway_token
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prepare")
async def prepare_deployment(request: Request, deploy_request: DeployRequest):
    """
    Prepare files for deployment without actually deploying.
    
    Returns the files with added deployment configurations.
    """
    prepared_files = deployment_service._prepare_deployment_files(deploy_request.files)
    
    # Generate instructions
    instructions = deployment_service.generate_deploy_instructions(deploy_request.files)
    
    return {
        "files": prepared_files,
        "instructions": instructions,
        "file_count": len(prepared_files),
        "added_files": [f for f in prepared_files.keys() if f not in deploy_request.files]
    }
