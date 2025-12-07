"""
Railway deployment service for one-click deployment of generated apps.

This service handles:
1. Preparing project files for deployment
2. Creating Railway projects via API
3. Deploying code to Railway
4. Managing deployment status
"""

import httpx
import json
import os
import zipfile
import tempfile
import base64
from typing import Dict, List, Optional
from pathlib import Path
from config import settings


class DeploymentService:
    """Service for deploying generated apps to Railway."""
    
    RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2"
    
    def __init__(self):
        """Initialize deployment service."""
        self.api_token = os.getenv("RAILWAY_API_TOKEN")
    
    def is_configured(self) -> bool:
        """Check if Railway API is configured."""
        return self.api_token is not None
    
    async def deploy_project(
        self,
        project_name: str,
        files: Dict[str, str],
        user_token: Optional[str] = None
    ) -> Dict:
        """
        Deploy a project to Railway.
        
        Args:
            project_name: Name for the Railway project
            files: Dict of file_path -> content
            user_token: Optional user's Railway API token
            
        Returns:
            Dict with deployment URL and status
        """
        token = user_token or self.api_token
        
        if not token:
            raise ValueError("Railway API token not configured")
        
        # Generate deployment files
        deployment_files = self._prepare_deployment_files(files)
        
        # Create project on Railway
        project = await self._create_railway_project(project_name, token)
        
        # Deploy files
        deployment = await self._deploy_to_railway(
            project["id"],
            deployment_files,
            token
        )
        
        return {
            "success": True,
            "project_id": project["id"],
            "project_name": project_name,
            "deployment_id": deployment.get("id"),
            "url": deployment.get("url"),
            "status": "deploying",
            "dashboard_url": f"https://railway.app/project/{project['id']}"
        }
    
    def _prepare_deployment_files(self, files: Dict[str, str]) -> Dict[str, str]:
        """Prepare files for Railway deployment."""
        deployment_files = dict(files)
        
        # Detect project type
        has_python = any(f.endswith('.py') for f in files.keys())
        has_mojo = any(f.endswith('.mojo') for f in files.keys())
        has_package_json = 'package.json' in files
        has_html = any(f.endswith('.html') for f in files.keys())
        
        # Add Railway config if not present
        if 'railway.json' not in deployment_files:
            deployment_files['railway.json'] = self._generate_railway_config(
                has_python, has_mojo, has_package_json, has_html
            )
        
        # Add Procfile for Python apps
        if has_python and 'Procfile' not in deployment_files:
            # Find the main Python file
            main_file = self._find_main_python_file(files)
            deployment_files['Procfile'] = f"web: python {main_file}"
        
        # Add requirements.txt if Python and not present
        if has_python and 'requirements.txt' not in deployment_files:
            deployment_files['requirements.txt'] = self._generate_requirements(files)
        
        # Add nixpacks.toml for better build detection
        if 'nixpacks.toml' not in deployment_files:
            deployment_files['nixpacks.toml'] = self._generate_nixpacks_config(
                has_python, has_mojo, has_package_json
            )
        
        return deployment_files
    
    def _generate_railway_config(
        self,
        has_python: bool,
        has_mojo: bool,
        has_package_json: bool,
        has_html: bool
    ) -> str:
        """Generate railway.json configuration."""
        config = {
            "$schema": "https://railway.app/railway.schema.json",
            "build": {},
            "deploy": {}
        }
        
        if has_python:
            config["build"]["builder"] = "NIXPACKS"
            config["deploy"]["startCommand"] = "python main.py"
            config["deploy"]["healthcheckPath"] = "/health"
        elif has_package_json:
            config["build"]["builder"] = "NIXPACKS"
            config["deploy"]["startCommand"] = "npm start"
        elif has_html:
            # Static site
            config["build"]["builder"] = "STATIC"
            config["deploy"]["startCommand"] = "npx serve ."
        
        return json.dumps(config, indent=2)
    
    def _find_main_python_file(self, files: Dict[str, str]) -> str:
        """Find the main Python entry point."""
        priority_names = ['main.py', 'app.py', 'server.py', 'api.py', 'run.py']
        
        for name in priority_names:
            if name in files:
                return name
        
        # Return first Python file found
        for f in files.keys():
            if f.endswith('.py'):
                return f
        
        return 'main.py'
    
    def _generate_requirements(self, files: Dict[str, str]) -> str:
        """Generate requirements.txt based on imports in Python files."""
        requirements = set()
        
        # Common packages to detect
        package_map = {
            'fastapi': 'fastapi',
            'flask': 'flask',
            'django': 'django',
            'chromadb': 'chromadb',
            'uvicorn': 'uvicorn',
            'httpx': 'httpx',
            'requests': 'requests',
            'pandas': 'pandas',
            'numpy': 'numpy',
            'pydantic': 'pydantic',
        }
        
        for content in files.values():
            for import_name, package_name in package_map.items():
                if f'import {import_name}' in content or f'from {import_name}' in content:
                    requirements.add(package_name)
        
        # Always include these for AI apps
        requirements.add('chromadb')
        
        # Add uvicorn if fastapi
        if 'fastapi' in requirements:
            requirements.add('uvicorn[standard]')
        
        return '\n'.join(sorted(requirements))
    
    def _generate_nixpacks_config(
        self,
        has_python: bool,
        has_mojo: bool,
        has_package_json: bool
    ) -> str:
        """Generate nixpacks.toml for Railway."""
        if has_python:
            return '''[phases.setup]
nixPkgs = ["python311", "gcc"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "python main.py"
'''
        elif has_package_json:
            return '''[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm install"]

[start]
cmd = "npm start"
'''
        else:
            return '''[phases.setup]
nixPkgs = ["nodejs-18_x"]

[start]
cmd = "npx serve ."
'''
    
    async def _create_railway_project(
        self,
        project_name: str,
        token: str
    ) -> Dict:
        """Create a new Railway project."""
        query = """
        mutation projectCreate($input: ProjectCreateInput!) {
            projectCreate(input: $input) {
                id
                name
            }
        }
        """
        
        variables = {
            "input": {
                "name": project_name,
                "isPublic": False
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.RAILWAY_API_URL,
                json={"query": query, "variables": variables},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            data = response.json()
            
            if "errors" in data:
                raise Exception(f"Railway API error: {data['errors']}")
            
            return data["data"]["projectCreate"]
    
    async def _deploy_to_railway(
        self,
        project_id: str,
        files: Dict[str, str],
        token: str
    ) -> Dict:
        """Deploy files to Railway project."""
        # Create a service in the project
        service = await self._create_service(project_id, token)
        
        # For Railway, we need to deploy via GitHub or CLI
        # Since we're doing direct deployment, we'll use the deployment API
        
        # Create deployment
        query = """
        mutation deploymentCreate($input: DeploymentCreateInput!) {
            deploymentCreate(input: $input) {
                id
                status
            }
        }
        """
        
        # Encode files as base64 for the API
        encoded_files = {}
        for path, content in files.items():
            encoded_files[path] = base64.b64encode(content.encode()).decode()
        
        variables = {
            "input": {
                "serviceId": service["id"],
                "source": {
                    "repo": None  # Direct deployment
                }
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.RAILWAY_API_URL,
                json={"query": query, "variables": variables},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            data = response.json()
            
            if "errors" in data:
                # Return partial success - project created
                return {
                    "id": None,
                    "status": "pending",
                    "url": f"https://{service.get('name', 'app')}.up.railway.app",
                    "message": "Project created. Connect GitHub for auto-deploy."
                }
            
            deployment = data.get("data", {}).get("deploymentCreate", {})
            
            return {
                "id": deployment.get("id"),
                "status": deployment.get("status", "deploying"),
                "url": f"https://{service.get('name', 'app')}.up.railway.app"
            }
    
    async def _create_service(self, project_id: str, token: str) -> Dict:
        """Create a service in the Railway project."""
        query = """
        mutation serviceCreate($input: ServiceCreateInput!) {
            serviceCreate(input: $input) {
                id
                name
            }
        }
        """
        
        variables = {
            "input": {
                "projectId": project_id,
                "name": "web"
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.RAILWAY_API_URL,
                json={"query": query, "variables": variables},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            data = response.json()
            
            if "errors" in data:
                raise Exception(f"Railway API error: {data['errors']}")
            
            return data["data"]["serviceCreate"]
    
    async def get_deployment_status(
        self,
        deployment_id: str,
        token: Optional[str] = None
    ) -> Dict:
        """Get the status of a deployment."""
        token = token or self.api_token
        
        query = """
        query deployment($id: String!) {
            deployment(id: $id) {
                id
                status
                url
            }
        }
        """
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.RAILWAY_API_URL,
                json={"query": query, "variables": {"id": deployment_id}},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            data = response.json()
            
            if "errors" in data:
                return {"status": "unknown", "error": data["errors"]}
            
            return data.get("data", {}).get("deployment", {})
    
    def generate_deploy_instructions(self, files: Dict[str, str]) -> str:
        """Generate manual deployment instructions."""
        has_python = any(f.endswith('.py') for f in files.keys())
        
        if has_python:
            return """
## Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`

Your app will be live at the provided Railway URL!
"""
        else:
            return """
## Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Deploy: `railway up`

Or drag and drop your files at railway.app
"""


# Singleton instance
deployment_service = DeploymentService()
