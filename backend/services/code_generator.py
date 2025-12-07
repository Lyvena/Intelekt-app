import os
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from pathlib import Path
from models.schemas import TechStack, AIProvider, Project
from services.ai_service import ai_service
from services.chroma_service import chroma_service
from config import settings


class CodeGeneratorService:
    """Service for generating and managing code projects."""
    
    def __init__(self):
        """Initialize code generator service."""
        self.projects_path = Path(settings.projects_path)
        self.projects_path.mkdir(parents=True, exist_ok=True)
        self.projects_db: Dict[str, Project] = {}
    
    async def create_project(
        self,
        name: str,
        description: str,
        tech_stack: TechStack,
        ai_provider: AIProvider
    ) -> Project:
        """Create a new project."""
        project_id = str(uuid.uuid4())
        project_path = self.projects_path / project_id
        project_path.mkdir(parents=True, exist_ok=True)
        
        project = Project(
            id=project_id,
            name=name,
            description=description,
            tech_stack=tech_stack,
            ai_provider=ai_provider,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            files=[],
            status="active"
        )
        
        self.projects_db[project_id] = project
        
        # Save project metadata
        self._save_project_metadata(project)
        
        # Add to ChromaDB
        chroma_service.add_project_metadata(
            project_id,
            project.model_dump(mode='json')
        )
        
        return project
    
    def get_project(self, project_id: str) -> Optional[Project]:
        """Get project by ID."""
        if project_id in self.projects_db:
            return self.projects_db[project_id]
        
        # Try to load from disk
        return self._load_project_metadata(project_id)
    
    def list_projects(self) -> List[Project]:
        """List all projects."""
        projects = []
        
        # Load all projects from disk
        for project_dir in self.projects_path.iterdir():
            if project_dir.is_dir():
                project = self._load_project_metadata(project_dir.name)
                if project:
                    projects.append(project)
        
        return sorted(projects, key=lambda p: p.updated_at, reverse=True)
    
    async def generate_file(
        self,
        project_id: str,
        prompt: str,
        file_path: Optional[str] = None,
        context: Optional[str] = None
    ) -> Dict[str, str]:
        """Generate a file for the project."""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        # Search for relevant code snippets
        snippets = chroma_service.search_code_snippets(
            prompt,
            tech_stack=project.tech_stack.value,
            n_results=3
        )
        
        # Build context from snippets
        snippet_context = ""
        if snippets:
            snippet_context = "\n\nRelevant code examples:\n"
            for snippet in snippets:
                snippet_context += f"\n{snippet['code']}\n"
        
        full_context = f"{context or ''}{snippet_context}"
        
        # Generate code using AI
        code_result = await ai_service.generate_code(
            prompt=prompt,
            tech_stack=project.tech_stack.value,
            provider=project.ai_provider,
            context=full_context
        )
        
        # Determine file path
        if not file_path:
            file_path = code_result.get("filename", "generated_file.txt")
        
        # Save file
        project_path = self.projects_path / project_id
        full_file_path = project_path / file_path
        full_file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_file_path, "w") as f:
            f.write(code_result["code"])
        
        # Update project
        if file_path not in project.files:
            project.files.append(file_path)
        project.updated_at = datetime.now()
        self._save_project_metadata(project)
        
        # Add code to ChromaDB
        chroma_service.add_code_snippet(
            code=code_result["code"],
            tech_stack=project.tech_stack.value,
            description=prompt,
            metadata={
                "project_id": project_id,
                "file_path": file_path
            }
        )
        
        return {
            "file_path": file_path,
            "code": code_result["code"],
            "explanation": code_result.get("explanation", ""),
            "dependencies": code_result.get("dependencies", [])
        }
    
    def get_project_files(self, project_id: str) -> List[Dict[str, str]]:
        """Get all files in a project."""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        project_path = self.projects_path / project_id
        files = []
        
        for file_path in project.files:
            full_path = project_path / file_path
            if full_path.exists():
                with open(full_path, "r") as f:
                    content = f.read()
                files.append({
                    "path": file_path,
                    "content": content
                })
        
        return files
    
    def get_file_content(self, project_id: str, file_path: str) -> Optional[str]:
        """Get content of a specific file."""
        project_path = self.projects_path / project_id / file_path
        
        if project_path.exists():
            with open(project_path, "r") as f:
                return f.read()
        
        return None
    
    def save_file(self, project_id: str, file_path: str, content: str) -> Dict:
        """
        Save a file to a project.
        
        Args:
            project_id: The project ID
            file_path: Relative path for the file
            content: File content to save
            
        Returns:
            Dict with file_path and success status
        """
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        project_path = self.projects_path / project_id
        full_path = project_path / file_path
        
        # Create parent directories if needed
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write file
        with open(full_path, "w") as f:
            f.write(content)
        
        # Update project files list
        if file_path not in project.files:
            project.files.append(file_path)
        
        project.updated_at = datetime.now()
        self._save_project_metadata(project)
        
        return {
            "file_path": file_path,
            "success": True
        }
    
    def _save_project_metadata(self, project: Project):
        """Save project metadata to disk."""
        project_path = self.projects_path / project.id
        metadata_path = project_path / "project.json"
        
        with open(metadata_path, "w") as f:
            json.dump(project.model_dump(mode='json'), f, indent=2, default=str)
        
        self.projects_db[project.id] = project
    
    def _load_project_metadata(self, project_id: str) -> Optional[Project]:
        """Load project metadata from disk."""
        metadata_path = self.projects_path / project_id / "project.json"
        
        if metadata_path.exists():
            with open(metadata_path, "r") as f:
                data = json.load(f)
                project = Project(**data)
                self.projects_db[project_id] = project
                return project
        
        return None
    
    async def generate_project(
        self,
        project_id: str,
        prompt: str,
        context: Optional[str] = None
    ) -> Dict:
        """Generate multiple files for a project at once."""
        project = self.get_project(project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")
        
        # Search for relevant code snippets
        snippets = chroma_service.search_code_snippets(
            prompt,
            tech_stack=project.tech_stack.value,
            n_results=3
        )
        
        # Build context from snippets
        snippet_context = ""
        if snippets:
            snippet_context = "\n\nRelevant code examples:\n"
            for snippet in snippets:
                snippet_context += f"\n{snippet['code']}\n"
        
        full_context = f"{context or ''}{snippet_context}"
        
        # Generate multiple files using AI
        result = await ai_service.generate_project_files(
            prompt=prompt,
            tech_stack=project.tech_stack.value,
            provider=project.ai_provider,
            context=full_context
        )
        
        project_path = self.projects_path / project_id
        saved_files = []
        
        # Save each generated file
        for file_info in result.get("files", []):
            file_path = file_info["path"]
            content = file_info["content"]
            
            full_file_path = project_path / file_path
            full_file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(full_file_path, "w") as f:
                f.write(content)
            
            # Update project files list
            if file_path not in project.files:
                project.files.append(file_path)
            
            # Add code to ChromaDB
            chroma_service.add_code_snippet(
                code=content,
                tech_stack=project.tech_stack.value,
                description=f"{prompt} - {file_path}",
                metadata={
                    "project_id": project_id,
                    "file_path": file_path
                }
            )
            
            saved_files.append({
                "path": file_path,
                "content": content
            })
        
        # Update project metadata
        project.updated_at = datetime.now()
        self._save_project_metadata(project)
        
        return {
            "files": saved_files,
            "dependencies": result.get("dependencies", []),
            "explanation": result.get("explanation", ""),
            "file_count": len(saved_files)
        }

    def get_project_structure(self, project_id: str) -> Dict:
        """Get project directory structure."""
        project_path = self.projects_path / project_id
        
        def build_tree(path: Path, prefix: str = "") -> List[str]:
            items = []
            entries = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name))
            
            for i, entry in enumerate(entries):
                is_last = i == len(entries) - 1
                current_prefix = "└── " if is_last else "├── "
                items.append(f"{prefix}{current_prefix}{entry.name}")
                
                if entry.is_dir() and entry.name != "__pycache__":
                    extension = "    " if is_last else "│   "
                    items.extend(build_tree(entry, prefix + extension))
            
            return items
        
        if project_path.exists():
            tree = [project_id + "/"]
            tree.extend(build_tree(project_path))
            return {
                "structure": "\n".join(tree),
                "files": [str(p.relative_to(project_path)) for p in project_path.rglob("*") if p.is_file()]
            }
        
        return {"structure": "", "files": []}


# Singleton instance
code_generator = CodeGeneratorService()
