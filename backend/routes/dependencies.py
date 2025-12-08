"""
Dependency management routes.

Provides endpoints for:
- Detecting dependencies from code
- Generating package.json and requirements.txt
- Suggesting dependencies based on project type
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from services.dependency_service import dependency_service
from services import code_generator

router = APIRouter(prefix="/api/dependencies", tags=["dependencies"])


class AnalyzeRequest(BaseModel):
    """Request to analyze dependencies from files."""
    files: Dict[str, str]


class GenerateRequest(BaseModel):
    """Request to generate dependency files."""
    project_name: str
    files: Dict[str, str]


class SuggestRequest(BaseModel):
    """Request to get dependency suggestions."""
    project_type: str
    features: List[str] = []


@router.post("/analyze")
async def analyze_dependencies(request: AnalyzeRequest):
    """
    Analyze code files and detect dependencies.
    
    Returns detected Python and JavaScript dependencies,
    project type, and recommendations.
    """
    try:
        analysis = dependency_service.analyze_project(request.files)
        return {
            "success": True,
            **analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
async def generate_dependency_files(request: GenerateRequest):
    """
    Generate dependency files (package.json, requirements.txt).
    
    Returns the generated file contents.
    """
    try:
        generated = dependency_service.generate_dependency_files(
            request.project_name,
            request.files
        )
        return {
            "success": True,
            "files": generated,
            "file_count": len(generated)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest")
async def suggest_dependencies(request: SuggestRequest):
    """
    Get dependency suggestions based on project type and features.
    """
    try:
        suggestions = dependency_service.suggest_dependencies(
            request.project_type,
            request.features
        )
        return {
            "success": True,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/{project_id}/analyze")
async def analyze_project_dependencies(project_id: str):
    """
    Analyze dependencies for an existing project.
    """
    try:
        # Get project files
        project_files = code_generator.get_project_files(project_id)
        files = {f["path"]: f["content"] for f in project_files}
        
        if not files:
            return {
                "success": True,
                "project_type": "empty",
                "python_dependencies": [],
                "javascript_dependencies": [],
                "has_package_json": False,
                "has_requirements_txt": False,
                "recommendations": {}
            }
        
        analysis = dependency_service.analyze_project(files)
        return {
            "success": True,
            **analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/project/{project_id}/generate")
async def generate_project_dependencies(project_id: str):
    """
    Generate and save dependency files for a project.
    """
    try:
        # Get project files
        project_files = code_generator.get_project_files(project_id)
        files = {f["path"]: f["content"] for f in project_files}
        
        if not files:
            raise HTTPException(status_code=404, detail="Project has no files")
        
        # Generate dependency files
        generated = dependency_service.generate_dependency_files(
            project_id,
            files
        )
        
        # Save generated files to project
        saved_files = []
        for filename, content in generated.items():
            # Only save if file doesn't already exist
            if filename not in files:
                code_generator.save_file(project_id, filename, content)
                saved_files.append(filename)
        
        return {
            "success": True,
            "generated_files": list(generated.keys()),
            "saved_files": saved_files,
            "files_content": generated
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mappings/python")
async def get_python_mappings():
    """Get Python import to package name mappings."""
    from services.dependency_service import PYTHON_PACKAGE_MAPPINGS
    return {
        "mappings": {k: v for k, v in PYTHON_PACKAGE_MAPPINGS.items() if v}
    }


@router.get("/mappings/javascript")
async def get_js_mappings():
    """Get JavaScript import to package name mappings."""
    from services.dependency_service import JS_PACKAGE_MAPPINGS
    return {
        "mappings": JS_PACKAGE_MAPPINGS
    }
