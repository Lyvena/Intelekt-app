from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List
from sqlalchemy.orm import Session
from models.schemas import Project, ProjectCreate
from models.database import get_db, User, DBProject
from services import code_generator
from utils.auth import get_current_active_user
import shutil
import tempfile
from pathlib import Path

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=Project)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new project."""
    try:
        # Create project in code generator
        project = await code_generator.create_project(
            name=project_data.name,
            description=project_data.description,
            tech_stack=project_data.tech_stack,
            ai_provider=project_data.ai_provider
        )
        
        # Save project to database with user association
        db_project = DBProject(
            id=project.id,
            name=project.name,
            description=project.description,
            tech_stack=project.tech_stack.value,
            ai_provider=project.ai_provider.value,
            user_id=current_user.id
        )
        db.add(db_project)
        db.commit()
        
        return project
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[Project])
async def list_projects(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all projects for the current user."""
    try:
        # Get user's projects from database
        db_projects = db.query(DBProject).filter(DBProject.user_id == current_user.id).all()
        
        # Get full project details from code generator
        projects = []
        for db_project in db_projects:
            project = code_generator.get_project(db_project.id)
            if project:
                projects.append(project)
        
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project details."""
    # Verify project belongs to user
    db_project = db.query(DBProject).filter(
        DBProject.id == project_id,
        DBProject.user_id == current_user.id
    ).first()
    
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = code_generator.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/{project_id}/files")
async def get_project_files(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all files in a project."""
    # Verify ownership
    db_project = db.query(DBProject).filter(
        DBProject.id == project_id,
        DBProject.user_id == current_user.id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        files = code_generator.get_project_files(project_id)
        return {"files": files}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files/{file_path:path}")
async def get_file_content(
    project_id: str,
    file_path: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get content of a specific file."""
    # Verify ownership
    db_project = db.query(DBProject).filter(
        DBProject.id == project_id,
        DBProject.user_id == current_user.id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    content = code_generator.get_file_content(project_id, file_path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    return {"path": file_path, "content": content}


@router.get("/{project_id}/structure")
async def get_project_structure(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project directory structure."""
    # Verify ownership
    db_project = db.query(DBProject).filter(
        DBProject.id == project_id,
        DBProject.user_id == current_user.id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        structure = code_generator.get_project_structure(project_id)
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/export")
async def export_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export project as a ZIP file."""
    # Verify ownership
    db_project = db.query(DBProject).filter(
        DBProject.id == project_id,
        DBProject.user_id == current_user.id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
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
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a project."""
    # Verify ownership
    db_project = db.query(DBProject).filter(
        DBProject.id == project_id,
        DBProject.user_id == current_user.id
    ).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
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
        
        # Delete from database
        db.delete(db_project)
        db.commit()
        
        return {"message": "Project deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
