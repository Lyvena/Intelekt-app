import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Optional
import uuid
from config import settings


class ChromaService:
    """Service for managing ChromaDB operations."""
    
    def __init__(self):
        """Initialize ChromaDB client."""
        self.client = chromadb.PersistentClient(
            path=settings.chromadb_path,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        self._init_collections()
    
    def _init_collections(self):
        """Initialize required collections."""
        # Collection for code snippets and templates
        self.code_collection = self.client.get_or_create_collection(
            name="code_snippets",
            metadata={"description": "Code snippets and templates"}
        )
        
        # Collection for conversation context
        self.context_collection = self.client.get_or_create_collection(
            name="conversation_context",
            metadata={"description": "Conversation history and context"}
        )
        
        # Collection for project metadata
        self.project_collection = self.client.get_or_create_collection(
            name="projects",
            metadata={"description": "Project metadata and files"}
        )
    
    def add_code_snippet(
        self,
        code: str,
        tech_stack: str,
        description: str,
        metadata: Optional[Dict] = None
    ) -> str:
        """Add a code snippet to the database."""
        snippet_id = str(uuid.uuid4())
        
        meta = {
            "tech_stack": tech_stack,
            "description": description,
            **(metadata or {})
        }
        
        self.code_collection.add(
            documents=[code],
            metadatas=[meta],
            ids=[snippet_id]
        )
        
        return snippet_id
    
    def search_code_snippets(
        self,
        query: str,
        tech_stack: Optional[str] = None,
        n_results: int = 5
    ) -> List[Dict]:
        """Search for relevant code snippets."""
        where_filter = {"tech_stack": tech_stack} if tech_stack else None
        
        results = self.code_collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
        
        snippets = []
        if results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                snippets.append({
                    "code": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else None
                })
        
        return snippets
    
    def add_conversation_context(
        self,
        project_id: str,
        message: str,
        role: str,
        metadata: Optional[Dict] = None
    ) -> str:
        """Add conversation message to context."""
        context_id = str(uuid.uuid4())
        
        meta = {
            "project_id": project_id,
            "role": role,
            **(metadata or {})
        }
        
        self.context_collection.add(
            documents=[message],
            metadatas=[meta],
            ids=[context_id]
        )
        
        return context_id
    
    def get_conversation_context(
        self,
        project_id: str,
        n_results: int = 10
    ) -> List[Dict]:
        """Retrieve conversation context for a project."""
        results = self.context_collection.query(
            query_texts=[""],
            n_results=n_results,
            where={"project_id": project_id}
        )
        
        context = []
        if results["documents"]:
            for i, doc in enumerate(results["documents"][0]):
                context.append({
                    "message": doc,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {}
                })
        
        return context
    
    def add_project_metadata(
        self,
        project_id: str,
        project_data: Dict
    ) -> str:
        """Add or update project metadata."""
        self.project_collection.upsert(
            documents=[str(project_data)],
            metadatas=[{"project_id": project_id}],
            ids=[project_id]
        )
        
        return project_id
    
    def get_project_metadata(self, project_id: str) -> Optional[Dict]:
        """Retrieve project metadata."""
        results = self.project_collection.get(
            ids=[project_id]
        )
        
        if results["documents"]:
            return {
                "data": results["documents"][0],
                "metadata": results["metadatas"][0] if results["metadatas"] else {}
            }
        
        return None
    
    def delete_project(self, project_id: str):
        """Delete project and associated data."""
        # Delete project metadata
        try:
            self.project_collection.delete(ids=[project_id])
        except:
            pass
        
        # Delete conversation context
        try:
            results = self.context_collection.get(
                where={"project_id": project_id}
            )
            if results["ids"]:
                self.context_collection.delete(ids=results["ids"])
        except:
            pass


# Singleton instance
chroma_service = ChromaService()
