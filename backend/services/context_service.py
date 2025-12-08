"""
Context Service for managing project context and AI memory.

This service enables context-aware suggestions by:
1. Tracking project structure and files
2. Storing technical decisions and patterns
3. Maintaining conversation context
4. Providing relevant context to AI prompts
"""

import json
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
from services import chroma_service
from config import settings


class ProjectContext:
    """Represents the context of a project for AI awareness."""
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.tech_stack: Dict[str, str] = {}
        self.file_structure: List[str] = []
        self.decisions: List[Dict] = []
        self.patterns: List[str] = []
        self.conversation_summary: str = ""
        self.last_updated: datetime = datetime.now()


class ContextService:
    """Service for managing project context and AI memory."""
    
    def __init__(self):
        """Initialize context service."""
        self.contexts: Dict[str, ProjectContext] = {}
        self.context_path = Path(settings.projects_path) / ".contexts"
        self.context_path.mkdir(parents=True, exist_ok=True)
    
    def get_project_context(self, project_id: str) -> ProjectContext:
        """Get or create context for a project."""
        if project_id not in self.contexts:
            # Try to load from disk
            context = self._load_context(project_id)
            if context:
                self.contexts[project_id] = context
            else:
                self.contexts[project_id] = ProjectContext(project_id)
        
        return self.contexts[project_id]
    
    def update_file_structure(self, project_id: str, files: List[str]) -> None:
        """Update the file structure for a project."""
        context = self.get_project_context(project_id)
        context.file_structure = files
        context.last_updated = datetime.now()
        self._save_context(context)
    
    def update_tech_stack(self, project_id: str, tech_stack: Dict[str, str]) -> None:
        """Update the tech stack decisions for a project."""
        context = self.get_project_context(project_id)
        context.tech_stack.update(tech_stack)
        context.last_updated = datetime.now()
        self._save_context(context)
    
    def add_decision(
        self, 
        project_id: str, 
        decision_type: str, 
        description: str,
        rationale: str = ""
    ) -> None:
        """
        Record a technical decision for the project.
        
        Args:
            project_id: The project ID
            decision_type: Type of decision (e.g., 'framework', 'database', 'architecture')
            description: What was decided
            rationale: Why this decision was made
        """
        context = self.get_project_context(project_id)
        context.decisions.append({
            "type": decision_type,
            "description": description,
            "rationale": rationale,
            "timestamp": datetime.now().isoformat()
        })
        context.last_updated = datetime.now()
        self._save_context(context)
        
        # Also store in ChromaDB for semantic search
        chroma_service.add_code_snippet(
            code=f"Decision: {description}\nRationale: {rationale}",
            tech_stack=decision_type,
            project_id=project_id,
            file_path=f"decisions/{decision_type}"
        )
    
    def add_pattern(self, project_id: str, pattern: str) -> None:
        """Add a code pattern or convention used in the project."""
        context = self.get_project_context(project_id)
        if pattern not in context.patterns:
            context.patterns.append(pattern)
            context.last_updated = datetime.now()
            self._save_context(context)
    
    def update_conversation_summary(self, project_id: str, summary: str) -> None:
        """Update the conversation summary for context."""
        context = self.get_project_context(project_id)
        context.conversation_summary = summary
        context.last_updated = datetime.now()
        self._save_context(context)
    
    def build_context_prompt(self, project_id: str, include_files: bool = True) -> str:
        """
        Build a context prompt for the AI.
        
        This creates a comprehensive context string that helps the AI
        understand the project and make context-aware suggestions.
        """
        context = self.get_project_context(project_id)
        
        parts = []
        
        # Project overview
        parts.append("=== PROJECT CONTEXT ===")
        parts.append(f"Project ID: {project_id}")
        
        # Tech stack
        if context.tech_stack:
            parts.append("\n--- Tech Stack ---")
            for key, value in context.tech_stack.items():
                parts.append(f"- {key}: {value}")
        
        # File structure
        if include_files and context.file_structure:
            parts.append("\n--- Current Files ---")
            for file in context.file_structure[:20]:  # Limit to 20 files
                parts.append(f"- {file}")
            if len(context.file_structure) > 20:
                parts.append(f"... and {len(context.file_structure) - 20} more files")
        
        # Recent decisions
        if context.decisions:
            parts.append("\n--- Previous Decisions ---")
            for decision in context.decisions[-5:]:  # Last 5 decisions
                parts.append(f"- [{decision['type']}] {decision['description']}")
                if decision.get('rationale'):
                    parts.append(f"  Reason: {decision['rationale']}")
        
        # Patterns
        if context.patterns:
            parts.append("\n--- Code Patterns & Conventions ---")
            for pattern in context.patterns[-5:]:
                parts.append(f"- {pattern}")
        
        # Conversation context
        if context.conversation_summary:
            parts.append("\n--- Conversation Context ---")
            parts.append(context.conversation_summary)
        
        parts.append("\n=== END CONTEXT ===")
        
        return "\n".join(parts)
    
    def get_suggestions(self, project_id: str, current_message: str) -> List[str]:
        """
        Generate context-aware suggestions based on project state.
        
        Returns a list of suggested next steps or questions.
        """
        context = self.get_project_context(project_id)
        suggestions = []
        
        # Suggestions based on file structure
        if not context.file_structure:
            suggestions.append("Start by describing what you want to build")
            suggestions.append("Create your first file")
        else:
            has_html = any(f.endswith('.html') for f in context.file_structure)
            has_css = any(f.endswith('.css') for f in context.file_structure)
            has_js = any(f.endswith('.js') for f in context.file_structure)
            has_py = any(f.endswith('.py') for f in context.file_structure)
            has_tests = any('test' in f.lower() for f in context.file_structure)
            has_readme = any('readme' in f.lower() for f in context.file_structure)
            
            # Suggest missing components
            if has_html and not has_css:
                suggestions.append("Add styling with CSS")
            if has_html and not has_js:
                suggestions.append("Add interactivity with JavaScript")
            if has_py and not has_tests:
                suggestions.append("Add tests for your Python code")
            if not has_readme and len(context.file_structure) > 2:
                suggestions.append("Create a README.md")
        
        # Suggestions based on tech stack
        if context.tech_stack:
            if 'backend' in context.tech_stack and 'database' not in context.tech_stack:
                suggestions.append("Set up ChromaDB for data storage")
            if 'frontend' in context.tech_stack and 'styling' not in context.tech_stack:
                suggestions.append("Add a styling framework")
        
        # Suggestions based on recent activity
        if context.decisions:
            last_decision = context.decisions[-1]
            if last_decision['type'] == 'framework':
                suggestions.append(f"Continue building with {last_decision['description']}")
        
        # Default suggestions
        if not suggestions:
            suggestions = [
                "What feature would you like to add?",
                "Need help optimizing the code?",
                "Ready to deploy your app?"
            ]
        
        return suggestions[:3]  # Return top 3 suggestions
    
    def analyze_message_for_decisions(self, message: str, response: str) -> List[Dict]:
        """
        Analyze a conversation to extract technical decisions.
        
        Returns a list of decisions found in the exchange.
        """
        decisions = []
        
        # Keywords that indicate decisions
        decision_keywords = {
            'framework': ['using', 'chose', 'selected', 'framework', 'library'],
            'database': ['database', 'chromadb', 'storage', 'data'],
            'architecture': ['structure', 'architecture', 'pattern', 'design'],
            'styling': ['css', 'tailwind', 'styling', 'theme'],
            'api': ['api', 'endpoint', 'route', 'rest'],
        }
        
        combined_text = (message + " " + response).lower()
        
        for decision_type, keywords in decision_keywords.items():
            for keyword in keywords:
                if keyword in combined_text:
                    # Extract a brief description
                    decisions.append({
                        "type": decision_type,
                        "detected": True
                    })
                    break
        
        return decisions
    
    def _save_context(self, context: ProjectContext) -> None:
        """Save context to disk."""
        file_path = self.context_path / f"{context.project_id}.json"
        
        data = {
            "project_id": context.project_id,
            "tech_stack": context.tech_stack,
            "file_structure": context.file_structure,
            "decisions": context.decisions,
            "patterns": context.patterns,
            "conversation_summary": context.conversation_summary,
            "last_updated": context.last_updated.isoformat()
        }
        
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _load_context(self, project_id: str) -> Optional[ProjectContext]:
        """Load context from disk."""
        file_path = self.context_path / f"{project_id}.json"
        
        if not file_path.exists():
            return None
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            context = ProjectContext(project_id)
            context.tech_stack = data.get("tech_stack", {})
            context.file_structure = data.get("file_structure", [])
            context.decisions = data.get("decisions", [])
            context.patterns = data.get("patterns", [])
            context.conversation_summary = data.get("conversation_summary", "")
            
            if data.get("last_updated"):
                context.last_updated = datetime.fromisoformat(data["last_updated"])
            
            return context
        except Exception as e:
            print(f"Error loading context for {project_id}: {e}")
            return None
    
    def clear_context(self, project_id: str) -> None:
        """Clear all context for a project."""
        if project_id in self.contexts:
            del self.contexts[project_id]
        
        file_path = self.context_path / f"{project_id}.json"
        if file_path.exists():
            file_path.unlink()


# Singleton instance
context_service = ContextService()
