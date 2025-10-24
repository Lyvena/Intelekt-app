from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List
from models.schemas import Project, ProjectCreate
from services import code_generator
import shutil
import tempfile
from pathlib import Path

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=Project)
async def create_project(project_data: ProjectCreate):
    """Create a new project."""
    try:
        project = await code_generator.create_project(
            name=project_data.name,
            description=project_data.description,
            tech_stack=project_data.tech_stack,
            ai_provider=project_data.ai_provider
        )
        return project
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[Project])
async def list_projects():
    """List all projects."""
    try:
        projects = code_generator.list_projects()
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get project details."""
    project = code_generator.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/files")
async def get_project_files(project_id: str):
    """Get all files in a project."""
    try:
        files = code_generator.get_project_files(project_id)
        return {"files": files}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files/{file_path:path}")
async def get_file_content(project_id: str, file_path: str):
    """Get content of a specific file."""
    content = code_generator.get_file_content(project_id, file_path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": file_path, "content": content}


@router.get("/{project_id}/structure")
async def get_project_structure(project_id: str):
    """Get project directory structure."""
    try:
        structure = code_generator.get_project_structure(project_id)
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/export")
async def export_project(project_id: str):
    """Export project as a ZIP file."""
    project = code_generator.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Create temporary directory for ZIP
        with tempfile.TemporaryDirectory() as temp_dir:
            zip_path = Path(temp_dir) / f"{project.name}.zip"
            project_path = code_generator.projects_path / project_id
            
            # Create ZIP archive
            shutil.make_archive(
                str(zip_path.with_suffix("")),
                "zip",
                project_path
            )
            
            # Return ZIP file
            return FileResponse(
                path=zip_path,
                filename=f"{project.name}.zip",
                media_type="application/zip"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
async def delete_project(project_id: str):
    """Delete a project."""
    project = code_generator.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Delete from ChromaDB
        from services import chroma_service
        chroma_service.delete_project(project_id)
        
        # Delete project directory
        project_path = code_generator.projects_path / project_id
        if project_path.exists():
            shutil.rmtree(project_path)
        
        # Remove from in-memory cache
        if project_id in code_generator.projects_db:
            del code_generator.projects_db[project_id]
        
        return {"message": "Project deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
