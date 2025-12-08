"""
Codebase Indexer - Comprehensive project understanding for AI.

This service indexes the entire codebase to give the AI full context:
1. File structure and relationships
2. Code content with semantic search
3. Import/export dependency graph
4. Function/class/component inventory
5. Detected patterns and conventions
"""

import re
import json
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from config import settings


@dataclass
class FileInfo:
    """Information about a single file."""
    path: str
    content: str
    language: str
    size: int
    lines: int
    imports: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    functions: List[str] = field(default_factory=list)
    classes: List[str] = field(default_factory=list)
    components: List[str] = field(default_factory=list)  # React components


@dataclass  
class CodebaseIndex:
    """Complete index of a project's codebase."""
    project_id: str
    files: Dict[str, FileInfo] = field(default_factory=dict)
    dependency_graph: Dict[str, List[str]] = field(default_factory=dict)
    tech_stack: Dict[str, str] = field(default_factory=dict)
    patterns: List[str] = field(default_factory=list)
    entry_points: List[str] = field(default_factory=list)
    total_lines: int = 0
    total_files: int = 0
    indexed_at: datetime = field(default_factory=datetime.now)


class CodebaseIndexer:
    """Service for indexing and understanding codebases."""
    
    # File extensions by language
    LANGUAGE_MAP = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript-react',
        '.ts': 'typescript',
        '.tsx': 'typescript-react',
        '.html': 'html',
        '.css': 'css',
        '.scss': 'scss',
        '.json': 'json',
        '.md': 'markdown',
        '.mojo': 'mojo',
        '.sql': 'sql',
        '.yaml': 'yaml',
        '.yml': 'yaml',
    }
    
    # Patterns for extracting code structure
    PATTERNS = {
        'python': {
            'imports': [
                r'^import\s+(\w+)',
                r'^from\s+(\w+)',
            ],
            'functions': r'^def\s+(\w+)\s*\(',
            'classes': r'^class\s+(\w+)',
        },
        'javascript': {
            'imports': [
                r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
                r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)',
            ],
            'functions': r'(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?\(|=\s*function|\()',
            'classes': r'class\s+(\w+)',
            'components': r'(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z]\w+)',
        },
        'typescript': {
            'imports': [
                r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
            ],
            'functions': r'(?:export\s+)?(?:async\s+)?function\s+(\w+)',
            'classes': r'(?:export\s+)?class\s+(\w+)',
            'interfaces': r'(?:export\s+)?interface\s+(\w+)',
            'types': r'(?:export\s+)?type\s+(\w+)',
            'components': r'(?:export\s+)?(?:default\s+)?(?:function|const)\s+([A-Z]\w+)',
        },
    }
    
    def __init__(self):
        """Initialize the indexer."""
        self.projects_path = Path(settings.projects_path)
        self.indexes: Dict[str, CodebaseIndex] = {}
    
    def index_project(self, project_id: str, files: Dict[str, str]) -> CodebaseIndex:
        """
        Index all files in a project.
        
        Args:
            project_id: The project identifier
            files: Dict of filepath -> content
            
        Returns:
            Complete codebase index
        """
        index = CodebaseIndex(project_id=project_id)
        
        for filepath, content in files.items():
            file_info = self._analyze_file(filepath, content)
            index.files[filepath] = file_info
            index.total_lines += file_info.lines
            index.total_files += 1
        
        # Build dependency graph
        index.dependency_graph = self._build_dependency_graph(index.files)
        
        # Detect tech stack
        index.tech_stack = self._detect_tech_stack(files)
        
        # Detect patterns
        index.patterns = self._detect_patterns(index.files)
        
        # Find entry points
        index.entry_points = self._find_entry_points(files)
        
        # Cache the index
        self.indexes[project_id] = index
        
        return index
    
    def _analyze_file(self, filepath: str, content: str) -> FileInfo:
        """Analyze a single file and extract metadata."""
        ext = Path(filepath).suffix.lower()
        language = self.LANGUAGE_MAP.get(ext, 'unknown')
        
        info = FileInfo(
            path=filepath,
            content=content,
            language=language,
            size=len(content.encode('utf-8')),
            lines=content.count('\n') + 1
        )
        
        # Get patterns for this language
        lang_key = language.split('-')[0]  # 'typescript-react' -> 'typescript'
        patterns = self.PATTERNS.get(lang_key, self.PATTERNS.get('javascript', {}))
        
        # Extract imports
        for pattern in patterns.get('imports', []):
            info.imports.extend(re.findall(pattern, content, re.MULTILINE))
        
        # Extract functions
        func_pattern = patterns.get('functions')
        if func_pattern:
            info.functions = re.findall(func_pattern, content, re.MULTILINE)
        
        # Extract classes
        class_pattern = patterns.get('classes')
        if class_pattern:
            info.classes = re.findall(class_pattern, content, re.MULTILINE)
        
        # Extract React components
        comp_pattern = patterns.get('components')
        if comp_pattern:
            potential_components = re.findall(comp_pattern, content, re.MULTILINE)
            # Filter to only PascalCase names (React convention)
            info.components = [c for c in potential_components if c[0].isupper()]
        
        return info
    
    def _build_dependency_graph(self, files: Dict[str, FileInfo]) -> Dict[str, List[str]]:
        """Build a graph of file dependencies."""
        graph = defaultdict(list)
        
        # Map file basenames to full paths
        file_map = {}
        for filepath in files.keys():
            name = Path(filepath).stem
            file_map[name] = filepath
        
        for filepath, info in files.items():
            for imp in info.imports:
                # Try to resolve local imports
                imp_name = imp.split('/')[-1].replace('./', '').replace('../', '')
                if imp_name in file_map:
                    graph[filepath].append(file_map[imp_name])
        
        return dict(graph)
    
    def _detect_tech_stack(self, files: Dict[str, str]) -> Dict[str, str]:
        """Detect the technology stack from files."""
        tech = {}
        
        # Check package.json
        if 'package.json' in files:
            try:
                pkg = json.loads(files['package.json'])
                deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                
                if 'react' in deps:
                    tech['frontend'] = 'React'
                if 'next' in deps:
                    tech['framework'] = 'Next.js'
                if 'vue' in deps:
                    tech['frontend'] = 'Vue'
                if 'svelte' in deps:
                    tech['frontend'] = 'Svelte'
                if 'tailwindcss' in deps:
                    tech['styling'] = 'Tailwind CSS'
                if 'typescript' in deps:
                    tech['language'] = 'TypeScript'
                if '@prisma/client' in deps:
                    tech['orm'] = 'Prisma'
                if 'express' in deps:
                    tech['backend'] = 'Express'
            except:
                pass
        
        # Check requirements.txt
        if 'requirements.txt' in files:
            reqs = files['requirements.txt'].lower()
            if 'fastapi' in reqs:
                tech['backend'] = 'FastAPI'
            if 'flask' in reqs:
                tech['backend'] = 'Flask'
            if 'django' in reqs:
                tech['backend'] = 'Django'
            if 'chromadb' in reqs:
                tech['database'] = 'ChromaDB'
            if 'sqlalchemy' in reqs:
                tech['orm'] = 'SQLAlchemy'
        
        # Check for Python files
        if any(f.endswith('.py') for f in files):
            if 'language' not in tech:
                tech['language'] = 'Python'
        
        # Check for Mojo files
        if any(f.endswith('.mojo') for f in files):
            tech['language'] = 'Mojo'
        
        return tech
    
    def _detect_patterns(self, files: Dict[str, FileInfo]) -> List[str]:
        """Detect coding patterns and conventions."""
        patterns = []
        
        # Check for component patterns
        components = []
        for info in files.values():
            components.extend(info.components)
        
        if components:
            patterns.append(f"React functional components: {', '.join(components[:5])}")
        
        # Check for API patterns
        api_files = [f for f in files.keys() if 'api' in f.lower() or 'route' in f.lower()]
        if api_files:
            patterns.append(f"API routes in: {', '.join(api_files[:3])}")
        
        # Check for hooks
        hooks = []
        for info in files.values():
            hooks.extend([f for f in info.functions if f.startswith('use')])
        if hooks:
            patterns.append(f"Custom hooks: {', '.join(hooks[:5])}")
        
        # Check for state management
        for info in files.values():
            if 'zustand' in ' '.join(info.imports):
                patterns.append("State management: Zustand")
                break
            if 'redux' in ' '.join(info.imports):
                patterns.append("State management: Redux")
                break
        
        return patterns
    
    def _find_entry_points(self, files: Dict[str, str]) -> List[str]:
        """Find the main entry points of the application."""
        entry_points = []
        
        priority_files = [
            'src/index.tsx',
            'src/index.ts',
            'src/index.js',
            'src/main.tsx',
            'src/main.ts',
            'src/App.tsx',
            'src/App.tsx',
            'index.html',
            'main.py',
            'app.py',
            'server.py',
            'index.js',
            'main.mojo',
        ]
        
        for pf in priority_files:
            if pf in files:
                entry_points.append(pf)
        
        return entry_points
    
    def build_ai_context(
        self, 
        project_id: str, 
        files: Dict[str, str],
        user_query: str = "",
        max_file_lines: int = 100,
        max_files: int = 10
    ) -> str:
        """
        Build comprehensive AI context from the codebase.
        
        This creates a detailed context string that helps the AI
        understand the entire project structure and code.
        """
        # Index the project
        index = self.index_project(project_id, files)
        
        parts = []
        
        # Header
        parts.append("=" * 60)
        parts.append("CODEBASE CONTEXT - You have full access to this project")
        parts.append("=" * 60)
        
        # Project overview
        parts.append(f"\n📁 PROJECT: {project_id}")
        parts.append(f"📊 Stats: {index.total_files} files, {index.total_lines:,} lines of code")
        
        # Tech stack
        if index.tech_stack:
            parts.append("\n🛠️ TECH STACK:")
            for key, value in index.tech_stack.items():
                parts.append(f"  • {key}: {value}")
        
        # Entry points
        if index.entry_points:
            parts.append("\n🚀 ENTRY POINTS:")
            for ep in index.entry_points:
                parts.append(f"  • {ep}")
        
        # File structure with details
        parts.append("\n📂 FILE STRUCTURE:")
        for filepath, info in sorted(index.files.items()):
            icon = self._get_file_icon(info.language)
            parts.append(f"  {icon} {filepath} ({info.lines} lines)")
            
            # Show components/functions for key files
            if info.components:
                parts.append(f"      └─ Components: {', '.join(info.components[:5])}")
            if info.functions and not info.components:
                funcs = info.functions[:5]
                if funcs:
                    parts.append(f"      └─ Functions: {', '.join(funcs)}")
        
        # Patterns
        if index.patterns:
            parts.append("\n🎨 DETECTED PATTERNS:")
            for pattern in index.patterns:
                parts.append(f"  • {pattern}")
        
        # Relevant file contents
        parts.append("\n" + "=" * 60)
        parts.append("📄 RELEVANT CODE (for your reference)")
        parts.append("=" * 60)
        
        # Select most relevant files based on query or importance
        relevant_files = self._select_relevant_files(index, files, user_query, max_files)
        
        for filepath in relevant_files:
            content = files.get(filepath, "")
            if content:
                lines = content.split('\n')
                truncated = len(lines) > max_file_lines
                display_lines = lines[:max_file_lines]
                
                parts.append(f"\n--- {filepath} ---")
                parts.append("```" + self._get_language_tag(filepath))
                parts.append('\n'.join(display_lines))
                if truncated:
                    parts.append(f"\n... ({len(lines) - max_file_lines} more lines)")
                parts.append("```")
        
        # Instructions for AI
        parts.append("\n" + "=" * 60)
        parts.append("📋 INSTRUCTIONS")
        parts.append("=" * 60)
        parts.append("""
You have COMPLETE ACCESS to this codebase. When making changes:
1. Follow the existing patterns and conventions shown above
2. Use the same styling/frameworks detected in the tech stack
3. Maintain consistency with existing file structure
4. Reference specific files when suggesting changes
5. Generate complete, working code that fits the project
""")
        
        return '\n'.join(parts)
    
    def _select_relevant_files(
        self, 
        index: CodebaseIndex, 
        files: Dict[str, str],
        query: str,
        max_files: int
    ) -> List[str]:
        """Select the most relevant files for the AI context."""
        scores: Dict[str, float] = {}
        query_lower = query.lower()
        
        for filepath, info in index.files.items():
            score = 0.0
            
            # Entry points get high priority
            if filepath in index.entry_points:
                score += 10
            
            # Config files are important
            if any(x in filepath.lower() for x in ['config', 'package.json', 'requirements']):
                score += 5
            
            # Files matching query keywords
            if query_lower:
                keywords = query_lower.split()
                for kw in keywords:
                    if kw in filepath.lower():
                        score += 3
                    if kw in info.content.lower():
                        score += 1
            
            # Component files for UI queries
            if info.components:
                score += 2
            
            # Smaller files are easier to include
            if info.lines < 100:
                score += 1
            
            scores[filepath] = score
        
        # Sort by score and return top files
        sorted_files = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [f[0] for f in sorted_files[:max_files]]
    
    def _get_file_icon(self, language: str) -> str:
        """Get an emoji icon for a file type."""
        icons = {
            'python': '🐍',
            'javascript': '📜',
            'javascript-react': '⚛️',
            'typescript': '💙',
            'typescript-react': '⚛️',
            'html': '🌐',
            'css': '🎨',
            'json': '📋',
            'markdown': '📝',
            'mojo': '🔥',
            'sql': '🗃️',
        }
        return icons.get(language, '📄')
    
    def _get_language_tag(self, filepath: str) -> str:
        """Get the code fence language tag."""
        ext = Path(filepath).suffix.lower()
        tags = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'jsx',
            '.ts': 'typescript',
            '.tsx': 'tsx',
            '.html': 'html',
            '.css': 'css',
            '.json': 'json',
            '.md': 'markdown',
            '.mojo': 'mojo',
            '.sql': 'sql',
        }
        return tags.get(ext, '')
    
    def get_file_summary(self, project_id: str) -> Dict:
        """Get a summary of the indexed project."""
        if project_id not in self.indexes:
            return {"error": "Project not indexed"}
        
        index = self.indexes[project_id]
        
        return {
            "project_id": project_id,
            "total_files": index.total_files,
            "total_lines": index.total_lines,
            "tech_stack": index.tech_stack,
            "patterns": index.patterns,
            "entry_points": index.entry_points,
            "files": [
                {
                    "path": filepath,
                    "language": info.language,
                    "lines": info.lines,
                    "components": info.components,
                    "functions": info.functions[:5]
                }
                for filepath, info in index.files.items()
            ],
            "indexed_at": index.indexed_at.isoformat()
        }


# Singleton instance
codebase_indexer = CodebaseIndexer()
