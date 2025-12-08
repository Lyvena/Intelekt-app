"""
Dependency Service for managing project dependencies.

Features:
1. Auto-detect dependencies from code
2. Generate package.json for Node.js projects
3. Generate requirements.txt for Python projects
4. Manage Mojo dependencies
5. Suggest missing dependencies
"""

import re
import json
from typing import Dict, List, Optional, Set, Tuple
from pathlib import Path
from datetime import datetime
from config import settings


# Common package mappings (import name -> package name)
PYTHON_PACKAGE_MAPPINGS = {
    # Standard library (no install needed)
    'os': None, 'sys': None, 'json': None, 'datetime': None, 're': None,
    'pathlib': None, 'typing': None, 'collections': None, 'functools': None,
    'itertools': None, 'math': None, 'random': None, 'time': None,
    'asyncio': None, 'threading': None, 'subprocess': None, 'io': None,
    'hashlib': None, 'base64': None, 'urllib': None, 'http': None,
    
    # Third-party packages
    'fastapi': 'fastapi',
    'uvicorn': 'uvicorn',
    'pydantic': 'pydantic',
    'requests': 'requests',
    'httpx': 'httpx',
    'aiohttp': 'aiohttp',
    'flask': 'flask',
    'django': 'django',
    'numpy': 'numpy',
    'pandas': 'pandas',
    'scipy': 'scipy',
    'matplotlib': 'matplotlib',
    'seaborn': 'seaborn',
    'sklearn': 'scikit-learn',
    'tensorflow': 'tensorflow',
    'torch': 'torch',
    'transformers': 'transformers',
    'openai': 'openai',
    'anthropic': 'anthropic',
    'chromadb': 'chromadb',
    'sqlalchemy': 'sqlalchemy',
    'alembic': 'alembic',
    'pytest': 'pytest',
    'redis': 'redis',
    'celery': 'celery',
    'boto3': 'boto3',
    'pillow': 'Pillow',
    'PIL': 'Pillow',
    'cv2': 'opencv-python',
    'bs4': 'beautifulsoup4',
    'lxml': 'lxml',
    'yaml': 'pyyaml',
    'dotenv': 'python-dotenv',
    'jwt': 'PyJWT',
    'bcrypt': 'bcrypt',
    'passlib': 'passlib',
    'slowapi': 'slowapi',
    'websockets': 'websockets',
    'socketio': 'python-socketio',
    'jinja2': 'Jinja2',
    'markdown': 'markdown',
    'rich': 'rich',
    'click': 'click',
    'typer': 'typer',
    'streamlit': 'streamlit',
    'gradio': 'gradio',
}

# JavaScript/TypeScript import to package mapping
JS_PACKAGE_MAPPINGS = {
    'react': 'react',
    'react-dom': 'react-dom',
    'next': 'next',
    'vue': 'vue',
    'svelte': 'svelte',
    'express': 'express',
    'axios': 'axios',
    'lodash': 'lodash',
    'moment': 'moment',
    'dayjs': 'dayjs',
    'date-fns': 'date-fns',
    'uuid': 'uuid',
    'zod': 'zod',
    'yup': 'yup',
    'formik': 'formik',
    'react-hook-form': 'react-hook-form',
    'tailwindcss': 'tailwindcss',
    'styled-components': 'styled-components',
    '@emotion/react': '@emotion/react',
    '@emotion/styled': '@emotion/styled',
    'framer-motion': 'framer-motion',
    'gsap': 'gsap',
    'three': 'three',
    'd3': 'd3',
    'chart.js': 'chart.js',
    'recharts': 'recharts',
    'socket.io': 'socket.io',
    'socket.io-client': 'socket.io-client',
    'mongoose': 'mongoose',
    'prisma': '@prisma/client',
    'typeorm': 'typeorm',
    'sequelize': 'sequelize',
    'bcryptjs': 'bcryptjs',
    'jsonwebtoken': 'jsonwebtoken',
    'cors': 'cors',
    'helmet': 'helmet',
    'morgan': 'morgan',
    'winston': 'winston',
    'dotenv': 'dotenv',
    'commander': 'commander',
    'inquirer': 'inquirer',
    'chalk': 'chalk',
    'ora': 'ora',
    'jest': 'jest',
    'mocha': 'mocha',
    'chai': 'chai',
    'cypress': 'cypress',
    'playwright': '@playwright/test',
    'lucide-react': 'lucide-react',
    '@radix-ui': '@radix-ui/react-icons',
    'clsx': 'clsx',
    'class-variance-authority': 'class-variance-authority',
    'tailwind-merge': 'tailwind-merge',
    'zustand': 'zustand',
    'redux': 'redux',
    'react-redux': 'react-redux',
    '@reduxjs/toolkit': '@reduxjs/toolkit',
    'react-query': '@tanstack/react-query',
    'swr': 'swr',
    'react-router': 'react-router-dom',
    'react-router-dom': 'react-router-dom',
}

# Default versions for common packages
PYTHON_VERSIONS = {
    'fastapi': '>=0.104.0',
    'uvicorn': '>=0.24.0',
    'pydantic': '>=2.5.0',
    'chromadb': '>=0.4.0',
    'anthropic': '>=0.7.0',
    'openai': '>=1.0.0',
    'httpx': '>=0.25.0',
    'python-dotenv': '>=1.0.0',
}

JS_VERSIONS = {
    'react': '^18.2.0',
    'react-dom': '^18.2.0',
    'next': '^14.0.0',
    'typescript': '^5.0.0',
    'tailwindcss': '^3.4.0',
    'lucide-react': '^0.300.0',
    'zustand': '^4.4.0',
    'axios': '^1.6.0',
}


class DependencyService:
    """Service for managing project dependencies."""
    
    def __init__(self):
        """Initialize dependency service."""
        self.projects_path = Path(settings.projects_path)
    
    def detect_python_imports(self, code: str) -> Set[str]:
        """
        Detect Python imports from code.
        
        Returns a set of package names (not import names).
        """
        imports = set()
        
        # Match 'import x' and 'from x import y'
        import_patterns = [
            r'^import\s+(\w+)',
            r'^from\s+(\w+)',
        ]
        
        for line in code.split('\n'):
            line = line.strip()
            for pattern in import_patterns:
                match = re.match(pattern, line)
                if match:
                    module = match.group(1)
                    # Get the package name (may differ from import name)
                    if module in PYTHON_PACKAGE_MAPPINGS:
                        package = PYTHON_PACKAGE_MAPPINGS[module]
                        if package:  # None means standard library
                            imports.add(package)
                    else:
                        # Unknown package, add as-is
                        imports.add(module)
        
        return imports
    
    def detect_js_imports(self, code: str) -> Set[str]:
        """
        Detect JavaScript/TypeScript imports from code.
        
        Returns a set of package names.
        """
        imports = set()
        
        # Match various import patterns
        import_patterns = [
            r'import\s+.*?\s+from\s+[\'"]([^\.\/][^\'"]+)[\'"]',
            r'import\s+[\'"]([^\.\/][^\'"]+)[\'"]',
            r'require\s*\(\s*[\'"]([^\.\/][^\'"]+)[\'"]\s*\)',
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, code)
            for match in matches:
                # Handle scoped packages (@org/package)
                if match.startswith('@'):
                    parts = match.split('/')
                    if len(parts) >= 2:
                        package = f"{parts[0]}/{parts[1]}"
                    else:
                        package = match
                else:
                    # Get the base package name (before any subpath)
                    package = match.split('/')[0]
                
                # Map to actual package if known
                if package in JS_PACKAGE_MAPPINGS:
                    imports.add(JS_PACKAGE_MAPPINGS[package])
                else:
                    imports.add(package)
        
        return imports
    
    def detect_dependencies_from_files(
        self, 
        files: Dict[str, str]
    ) -> Dict[str, Set[str]]:
        """
        Detect all dependencies from project files.
        
        Returns a dict with 'python' and 'javascript' dependency sets.
        """
        python_deps = set()
        js_deps = set()
        
        for path, content in files.items():
            ext = Path(path).suffix.lower()
            
            if ext in ['.py', '.pyw']:
                python_deps.update(self.detect_python_imports(content))
            elif ext in ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']:
                js_deps.update(self.detect_js_imports(content))
        
        return {
            'python': python_deps,
            'javascript': js_deps
        }
    
    def generate_requirements_txt(
        self,
        dependencies: Set[str],
        include_versions: bool = True
    ) -> str:
        """
        Generate requirements.txt content for Python project.
        """
        lines = [
            "# Auto-generated by Intelekt",
            f"# Generated: {datetime.now().isoformat()}",
            ""
        ]
        
        for dep in sorted(dependencies):
            if include_versions and dep in PYTHON_VERSIONS:
                lines.append(f"{dep}{PYTHON_VERSIONS[dep]}")
            else:
                lines.append(dep)
        
        return '\n'.join(lines)
    
    def generate_package_json(
        self,
        project_name: str,
        dependencies: Set[str],
        dev_dependencies: Optional[Set[str]] = None,
        project_type: str = "module",
        include_scripts: bool = True
    ) -> str:
        """
        Generate package.json content for JavaScript/Node.js project.
        """
        # Build dependencies with versions
        deps = {}
        for dep in sorted(dependencies):
            if dep in JS_VERSIONS:
                deps[dep] = JS_VERSIONS[dep]
            else:
                deps[dep] = "latest"
        
        # Build dev dependencies
        dev_deps = {}
        if dev_dependencies:
            for dep in sorted(dev_dependencies):
                if dep in JS_VERSIONS:
                    dev_deps[dep] = JS_VERSIONS[dep]
                else:
                    dev_deps[dep] = "latest"
        
        package = {
            "name": project_name.lower().replace(' ', '-'),
            "version": "1.0.0",
            "description": f"Generated by Intelekt AI",
            "type": project_type,
            "main": "index.js",
        }
        
        if include_scripts:
            package["scripts"] = {
                "start": "node index.js",
                "dev": "node --watch index.js",
                "build": "echo 'No build step required'",
                "test": "echo 'No tests specified' && exit 0"
            }
        
        if deps:
            package["dependencies"] = deps
        
        if dev_deps:
            package["devDependencies"] = dev_deps
        
        package["keywords"] = ["intelekt", "ai-generated"]
        package["author"] = ""
        package["license"] = "MIT"
        
        return json.dumps(package, indent=2)
    
    def generate_react_package_json(
        self,
        project_name: str,
        dependencies: Set[str]
    ) -> str:
        """
        Generate package.json for React/Vite project.
        """
        # Core React dependencies
        core_deps = {
            "react": "^18.2.0",
            "react-dom": "^18.2.0"
        }
        
        # Add detected dependencies
        for dep in sorted(dependencies):
            if dep not in core_deps:
                if dep in JS_VERSIONS:
                    core_deps[dep] = JS_VERSIONS[dep]
                else:
                    core_deps[dep] = "latest"
        
        dev_deps = {
            "@types/react": "^18.2.0",
            "@types/react-dom": "^18.2.0",
            "@vitejs/plugin-react": "^4.2.0",
            "typescript": "^5.3.0",
            "vite": "^5.0.0"
        }
        
        package = {
            "name": project_name.lower().replace(' ', '-'),
            "private": True,
            "version": "0.0.0",
            "type": "module",
            "scripts": {
                "dev": "vite",
                "build": "tsc && vite build",
                "lint": "eslint . --ext ts,tsx",
                "preview": "vite preview"
            },
            "dependencies": core_deps,
            "devDependencies": dev_deps
        }
        
        return json.dumps(package, indent=2)
    
    def suggest_dependencies(
        self,
        project_type: str,
        features: List[str]
    ) -> Dict[str, List[str]]:
        """
        Suggest dependencies based on project type and features.
        """
        suggestions = {
            'required': [],
            'recommended': [],
            'optional': []
        }
        
        if project_type == 'python-api':
            suggestions['required'] = ['fastapi', 'uvicorn', 'pydantic']
            suggestions['recommended'] = ['python-dotenv', 'httpx']
            if 'database' in features or 'chromadb' in features:
                suggestions['required'].append('chromadb')
            if 'auth' in features:
                suggestions['recommended'].extend(['passlib', 'python-jose'])
        
        elif project_type == 'python-ml':
            suggestions['required'] = ['numpy', 'pandas']
            suggestions['recommended'] = ['scikit-learn', 'matplotlib']
            if 'deep-learning' in features:
                suggestions['optional'] = ['torch', 'transformers']
        
        elif project_type == 'react':
            suggestions['required'] = ['react', 'react-dom']
            suggestions['recommended'] = ['lucide-react', 'clsx']
            if 'routing' in features:
                suggestions['required'].append('react-router-dom')
            if 'state' in features:
                suggestions['recommended'].append('zustand')
            if 'forms' in features:
                suggestions['recommended'].append('react-hook-form')
        
        elif project_type == 'node-api':
            suggestions['required'] = ['express']
            suggestions['recommended'] = ['cors', 'helmet', 'dotenv']
            if 'database' in features:
                suggestions['optional'] = ['mongoose', 'prisma']
        
        return suggestions
    
    def analyze_project(
        self,
        files: Dict[str, str]
    ) -> Dict:
        """
        Analyze a project and return dependency information.
        """
        deps = self.detect_dependencies_from_files(files)
        
        # Detect project type
        has_python = len(deps['python']) > 0
        has_js = len(deps['javascript']) > 0
        
        # Check for specific frameworks
        is_react = 'react' in deps['javascript']
        is_fastapi = 'fastapi' in deps['python']
        is_flask = 'flask' in deps['python']
        is_express = 'express' in deps['javascript']
        
        project_type = 'unknown'
        if is_react:
            project_type = 'react'
        elif is_fastapi or is_flask:
            project_type = 'python-api'
        elif is_express:
            project_type = 'node-api'
        elif has_python:
            project_type = 'python'
        elif has_js:
            project_type = 'javascript'
        
        return {
            'project_type': project_type,
            'python_dependencies': list(deps['python']),
            'javascript_dependencies': list(deps['javascript']),
            'has_package_json': 'package.json' in files,
            'has_requirements_txt': 'requirements.txt' in files,
            'recommendations': self.suggest_dependencies(
                project_type,
                []  # Could extract features from code analysis
            )
        }
    
    def generate_dependency_files(
        self,
        project_name: str,
        files: Dict[str, str]
    ) -> Dict[str, str]:
        """
        Generate dependency files (package.json, requirements.txt) for a project.
        
        Returns a dict of filename -> content for generated files.
        """
        analysis = self.analyze_project(files)
        generated = {}
        
        # Generate requirements.txt if Python dependencies detected
        if analysis['python_dependencies']:
            generated['requirements.txt'] = self.generate_requirements_txt(
                set(analysis['python_dependencies'])
            )
        
        # Generate package.json if JavaScript dependencies detected
        if analysis['javascript_dependencies']:
            if analysis['project_type'] == 'react':
                generated['package.json'] = self.generate_react_package_json(
                    project_name,
                    set(analysis['javascript_dependencies'])
                )
            else:
                generated['package.json'] = self.generate_package_json(
                    project_name,
                    set(analysis['javascript_dependencies'])
                )
        
        return generated


# Singleton instance
dependency_service = DependencyService()
