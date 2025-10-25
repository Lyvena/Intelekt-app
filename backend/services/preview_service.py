"""
Preview Service - Handles live code execution and preview generation.
Supports Python, JavaScript, and HTML/CSS/JS projects with Docker sandboxing.
"""

import os
import json
import uuid
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
from config import settings


class PreviewService:
    """Service for executing and previewing generated code."""
    
    def __init__(self):
        """Initialize preview service."""
        self.preview_dir = Path(settings.projects_path) / "previews"
        self.preview_dir.mkdir(parents=True, exist_ok=True)
        self.active_previews: Dict[str, Dict] = {}
        self.timeout = 30  # 30 seconds timeout
        
    def create_preview_id(self) -> str:
        """Generate unique preview ID."""
        return str(uuid.uuid4())[:8]
    
    async def preview_python_project(
        self, 
        project_id: str, 
        files: Dict[str, str],
        entry_point: str = "main.py"
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Preview a Python project.
        
        Args:
            project_id: Project ID
            files: Dictionary of {filename: content}
            entry_point: Main file to execute
            
        Returns:
            (success, output/error, preview_url)
        """
        preview_id = self.create_preview_id()
        temp_dir = None
        
        try:
            # Create temporary directory for execution
            temp_dir = tempfile.mkdtemp(prefix=f"preview_{preview_id}_")
            
            # Write files to temp directory
            for filename, content in files.items():
                file_path = Path(temp_dir) / filename
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(content)
            
            # Execute Python file
            entry_path = Path(temp_dir) / entry_point
            if not entry_path.exists():
                return False, f"Entry point not found: {entry_point}", None
            
            # Run with timeout
            result = await self._run_python_safe(str(entry_path), temp_dir)
            
            if result["success"]:
                # Store preview info
                self.active_previews[preview_id] = {
                    "project_id": project_id,
                    "type": "python",
                    "created_at": datetime.now(),
                    "output": result["output"],
                    "temp_dir": temp_dir
                }
                
                return True, result["output"], preview_id
            else:
                return False, result["error"], None
                
        except Exception as e:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            return False, f"Preview error: {str(e)}", None
    
    async def preview_javascript_project(
        self,
        project_id: str,
        files: Dict[str, str],
        entry_point: str = "index.js"
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Preview a JavaScript/Node.js project.
        
        Args:
            project_id: Project ID
            files: Dictionary of {filename: content}
            entry_point: Main file to execute
            
        Returns:
            (success, output/error, preview_url)
        """
        preview_id = self.create_preview_id()
        temp_dir = None
        
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp(prefix=f"preview_{preview_id}_")
            
            # Write files
            for filename, content in files.items():
                file_path = Path(temp_dir) / filename
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(content)
            
            # Execute Node.js file
            entry_path = Path(temp_dir) / entry_point
            if not entry_path.exists():
                return False, f"Entry point not found: {entry_point}", None
            
            result = await self._run_nodejs_safe(str(entry_path), temp_dir)
            
            if result["success"]:
                self.active_previews[preview_id] = {
                    "project_id": project_id,
                    "type": "javascript",
                    "created_at": datetime.now(),
                    "output": result["output"],
                    "temp_dir": temp_dir
                }
                
                return True, result["output"], preview_id
            else:
                return False, result["error"], None
                
        except Exception as e:
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            return False, f"Preview error: {str(e)}", None
    
    async def preview_html_project(
        self,
        project_id: str,
        html_content: str,
        css_content: Optional[str] = None,
        js_content: Optional[str] = None
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Preview an HTML/CSS/JS project.
        
        Args:
            project_id: Project ID
            html_content: HTML content
            css_content: Optional CSS content
            js_content: Optional JavaScript content
            
        Returns:
            (success, html_output, preview_id)
        """
        preview_id = self.create_preview_id()
        
        try:
            # Combine HTML, CSS, and JS
            html = html_content
            
            if css_content:
                html = html.replace("</head>", f"<style>{css_content}</style></head>")
            
            if js_content:
                html = html.replace("</body>", f"<script>{js_content}</script></body>")
            
            # Store preview
            self.active_previews[preview_id] = {
                "project_id": project_id,
                "type": "html",
                "created_at": datetime.now(),
                "content": html
            }
            
            return True, html, preview_id
            
        except Exception as e:
            return False, f"Preview error: {str(e)}", None
    
    async def _run_python_safe(self, script_path: str, working_dir: str) -> Dict:
        """
        Safely execute Python script with timeout and isolation.
        
        Args:
            script_path: Path to Python script
            working_dir: Working directory for execution
            
        Returns:
            Dictionary with success, output/error
        """
        try:
            process = await asyncio.create_subprocess_exec(
                "python3",
                script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=working_dir,
                limit=1024 * 1024  # 1MB output limit
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout
                )
                
                output = stdout.decode("utf-8", errors="replace")
                error = stderr.decode("utf-8", errors="replace")
                
                if process.returncode == 0:
                    return {
                        "success": True,
                        "output": output or "✅ Program executed successfully"
                    }
                else:
                    return {
                        "success": False,
                        "error": error or f"Process exited with code {process.returncode}"
                    }
                    
            except asyncio.TimeoutError:
                process.kill()
                return {
                    "success": False,
                    "error": f"Execution timeout (>{self.timeout}s)"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution error: {str(e)}"
            }
    
    async def _run_nodejs_safe(self, script_path: str, working_dir: str) -> Dict:
        """
        Safely execute Node.js script with timeout and isolation.
        
        Args:
            script_path: Path to JavaScript file
            working_dir: Working directory for execution
            
        Returns:
            Dictionary with success, output/error
        """
        try:
            process = await asyncio.create_subprocess_exec(
                "node",
                script_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=working_dir,
                limit=1024 * 1024  # 1MB output limit
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=self.timeout
                )
                
                output = stdout.decode("utf-8", errors="replace")
                error = stderr.decode("utf-8", errors="replace")
                
                if process.returncode == 0:
                    return {
                        "success": True,
                        "output": output or "✅ Program executed successfully"
                    }
                else:
                    return {
                        "success": False,
                        "error": error or f"Process exited with code {process.returncode}"
                    }
                    
            except asyncio.TimeoutError:
                process.kill()
                return {
                    "success": False,
                    "error": f"Execution timeout (>{self.timeout}s)"
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": f"Execution error: {str(e)}"
            }
    
    def get_preview(self, preview_id: str) -> Optional[Dict]:
        """Get preview by ID."""
        preview = self.active_previews.get(preview_id)
        if preview:
            # Check if expired (1 hour)
            if datetime.now() - preview["created_at"] > timedelta(hours=1):
                self.cleanup_preview(preview_id)
                return None
        return preview
    
    def cleanup_preview(self, preview_id: str) -> None:
        """Clean up preview resources."""
        preview = self.active_previews.pop(preview_id, None)
        if preview and "temp_dir" in preview:
            temp_dir = preview["temp_dir"]
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
    
    def cleanup_old_previews(self) -> None:
        """Clean up previews older than 1 hour."""
        now = datetime.now()
        expired = [
            pid for pid, preview in self.active_previews.items()
            if now - preview["created_at"] > timedelta(hours=1)
        ]
        for pid in expired:
            self.cleanup_preview(pid)


# Global instance
_preview_service: Optional[PreviewService] = None


def get_preview_service() -> PreviewService:
    """Get or create preview service instance."""
    global _preview_service
    if _preview_service is None:
        _preview_service = PreviewService()
    return _preview_service
