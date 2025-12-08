"""
Terminal Service for executing commands and streaming output.

Features:
1. Execute shell commands safely
2. Stream output in real-time
3. Run npm/pip scripts
4. Command history and sessions
"""

import asyncio
import subprocess
import os
import uuid
import json
from typing import Dict, List, Optional, AsyncGenerator
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum
from config import settings


class CommandStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class CommandResult:
    """Result of a command execution."""
    id: str
    command: str
    status: CommandStatus
    exit_code: Optional[int] = None
    output: List[str] = field(default_factory=list)
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    working_directory: Optional[str] = None


@dataclass
class TerminalSession:
    """A terminal session for a project."""
    id: str
    project_id: str
    working_directory: str
    history: List[CommandResult] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


# Allowed commands whitelist (for security)
ALLOWED_COMMANDS = {
    # npm commands
    'npm': ['install', 'run', 'start', 'build', 'test', 'init', 'ci', 'audit', 'outdated', 'list', 'ls'],
    'npx': None,  # Allow all npx commands
    'yarn': ['install', 'add', 'run', 'build', 'start', 'test'],
    'pnpm': ['install', 'add', 'run', 'build', 'start', 'test'],
    
    # Python commands
    'pip': ['install', 'freeze', 'list', 'show'],
    'pip3': ['install', 'freeze', 'list', 'show'],
    'python': ['-m', '-c', '--version'],
    'python3': ['-m', '-c', '--version'],
    'uvicorn': None,
    'pytest': None,
    
    # Build tools
    'vite': ['build', 'preview', 'dev'],
    'tsc': None,
    'esbuild': None,
    
    # Utility commands
    'ls': None,
    'dir': None,
    'cat': None,
    'echo': None,
    'pwd': None,
    'which': None,
    'node': ['--version', '-v', '-e'],
    'git': ['status', 'log', 'diff', 'branch', 'show'],
    
    # Mojo
    'mojo': ['build', 'run', 'test', 'doc', '--version'],
}

# Dangerous patterns to block
DANGEROUS_PATTERNS = [
    'rm -rf',
    'rmdir',
    'del /s',
    'format',
    'mkfs',
    'dd if=',
    ':(){:|:&};:',
    'chmod 777',
    'sudo',
    'su ',
    '> /dev/',
    'curl | sh',
    'wget | sh',
    'eval',
    'exec',
]


class TerminalService:
    """Service for terminal command execution."""
    
    def __init__(self):
        """Initialize terminal service."""
        self.sessions: Dict[str, TerminalSession] = {}
        self.running_processes: Dict[str, asyncio.subprocess.Process] = {}
        self.projects_path = Path(settings.projects_path)
    
    def create_session(self, project_id: str) -> TerminalSession:
        """Create a new terminal session for a project."""
        session_id = str(uuid.uuid4())
        working_dir = str(self.projects_path / project_id)
        
        # Ensure directory exists
        Path(working_dir).mkdir(parents=True, exist_ok=True)
        
        session = TerminalSession(
            id=session_id,
            project_id=project_id,
            working_directory=working_dir
        )
        
        self.sessions[session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[TerminalSession]:
        """Get an existing session."""
        return self.sessions.get(session_id)
    
    def get_project_session(self, project_id: str) -> Optional[TerminalSession]:
        """Get or create session for a project."""
        for session in self.sessions.values():
            if session.project_id == project_id:
                return session
        return self.create_session(project_id)
    
    def is_command_safe(self, command: str) -> tuple[bool, str]:
        """
        Check if a command is safe to execute.
        
        Returns (is_safe, reason).
        """
        command_lower = command.lower().strip()
        
        # Check for dangerous patterns
        for pattern in DANGEROUS_PATTERNS:
            if pattern in command_lower:
                return False, f"Blocked: Contains dangerous pattern '{pattern}'"
        
        # Parse the command
        parts = command.split()
        if not parts:
            return False, "Empty command"
        
        base_command = parts[0]
        
        # Check if base command is in whitelist
        if base_command not in ALLOWED_COMMANDS:
            return False, f"Command '{base_command}' is not in the allowed list"
        
        # Check subcommands if restricted
        allowed_subcommands = ALLOWED_COMMANDS[base_command]
        if allowed_subcommands is not None and len(parts) > 1:
            subcommand = parts[1]
            if subcommand not in allowed_subcommands and not subcommand.startswith('-'):
                return False, f"Subcommand '{subcommand}' not allowed for '{base_command}'"
        
        return True, "OK"
    
    async def execute_command(
        self,
        command: str,
        project_id: str,
        session_id: Optional[str] = None,
        timeout: int = 300  # 5 minutes default
    ) -> CommandResult:
        """
        Execute a command and return the result.
        
        This is a non-streaming version that waits for completion.
        """
        # Validate command
        is_safe, reason = self.is_command_safe(command)
        if not is_safe:
            return CommandResult(
                id=str(uuid.uuid4()),
                command=command,
                status=CommandStatus.FAILED,
                error=reason
            )
        
        # Get or create session
        session = None
        if session_id:
            session = self.get_session(session_id)
        if not session:
            session = self.get_project_session(project_id)
        
        # Create result
        result = CommandResult(
            id=str(uuid.uuid4()),
            command=command,
            status=CommandStatus.RUNNING,
            started_at=datetime.now(),
            working_directory=session.working_directory
        )
        
        try:
            # Execute command
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=session.working_directory,
                env={**os.environ, 'TERM': 'xterm-256color'}
            )
            
            self.running_processes[result.id] = process
            
            # Wait for completion with timeout
            try:
                stdout, _ = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
                
                result.exit_code = process.returncode
                result.output = stdout.decode('utf-8', errors='replace').split('\n')
                result.status = CommandStatus.COMPLETED if result.exit_code == 0 else CommandStatus.FAILED
                
            except asyncio.TimeoutError:
                process.kill()
                result.status = CommandStatus.FAILED
                result.error = f"Command timed out after {timeout} seconds"
            
        except Exception as e:
            result.status = CommandStatus.FAILED
            result.error = str(e)
        
        finally:
            result.completed_at = datetime.now()
            if result.id in self.running_processes:
                del self.running_processes[result.id]
            
            # Add to session history
            session.history.append(result)
        
        return result
    
    async def stream_command(
        self,
        command: str,
        project_id: str,
        session_id: Optional[str] = None
    ) -> AsyncGenerator[Dict, None]:
        """
        Execute a command and stream output in real-time.
        
        Yields dicts with type and content.
        """
        # Validate command
        is_safe, reason = self.is_command_safe(command)
        if not is_safe:
            yield {"type": "error", "content": reason}
            return
        
        # Get or create session
        session = None
        if session_id:
            session = self.get_session(session_id)
        if not session:
            session = self.get_project_session(project_id)
        
        command_id = str(uuid.uuid4())
        
        yield {
            "type": "start",
            "command_id": command_id,
            "command": command,
            "cwd": session.working_directory
        }
        
        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
                cwd=session.working_directory,
                env={**os.environ, 'TERM': 'xterm-256color'}
            )
            
            self.running_processes[command_id] = process
            
            # Stream output
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                
                decoded = line.decode('utf-8', errors='replace').rstrip()
                yield {"type": "output", "content": decoded}
            
            # Wait for process to complete
            await process.wait()
            
            yield {
                "type": "exit",
                "exit_code": process.returncode,
                "success": process.returncode == 0
            }
            
        except Exception as e:
            yield {"type": "error", "content": str(e)}
        
        finally:
            if command_id in self.running_processes:
                del self.running_processes[command_id]
    
    async def cancel_command(self, command_id: str) -> bool:
        """Cancel a running command."""
        if command_id in self.running_processes:
            process = self.running_processes[command_id]
            process.kill()
            del self.running_processes[command_id]
            return True
        return False
    
    def get_npm_scripts(self, project_id: str) -> Dict[str, str]:
        """
        Get npm scripts from package.json if it exists.
        """
        package_path = self.projects_path / project_id / "package.json"
        
        if not package_path.exists():
            return {}
        
        try:
            with open(package_path, 'r') as f:
                package = json.load(f)
            return package.get('scripts', {})
        except Exception:
            return {}
    
    def get_common_commands(self, project_id: str) -> List[Dict[str, str]]:
        """
        Get suggested commands for a project based on its structure.
        """
        commands = []
        project_path = self.projects_path / project_id
        
        # Check for package.json
        if (project_path / 'package.json').exists():
            commands.extend([
                {"command": "npm install", "description": "Install dependencies"},
                {"command": "npm run dev", "description": "Start development server"},
                {"command": "npm run build", "description": "Build for production"},
                {"command": "npm test", "description": "Run tests"},
            ])
        
        # Check for requirements.txt
        if (project_path / 'requirements.txt').exists():
            commands.extend([
                {"command": "pip install -r requirements.txt", "description": "Install Python dependencies"},
            ])
        
        # Check for Python files
        if list(project_path.glob('*.py')):
            commands.extend([
                {"command": "python3 main.py", "description": "Run main.py"},
                {"command": "pytest", "description": "Run Python tests"},
            ])
        
        # Check for Mojo files
        if list(project_path.glob('*.mojo')):
            commands.extend([
                {"command": "mojo run main.mojo", "description": "Run Mojo file"},
            ])
        
        return commands
    
    def get_session_history(self, session_id: str) -> List[Dict]:
        """Get command history for a session."""
        session = self.get_session(session_id)
        if not session:
            return []
        
        return [
            {
                "id": r.id,
                "command": r.command,
                "status": r.status.value,
                "exit_code": r.exit_code,
                "started_at": r.started_at.isoformat() if r.started_at else None,
                "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            }
            for r in session.history
        ]


# Singleton instance
terminal_service = TerminalService()
