"""
Git Service for version control operations.

Features:
1. Initialize git repositories
2. Commit changes
3. View commit history
4. Branch management
5. Diff viewing
"""

import subprocess
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass
from config import settings


@dataclass
class Commit:
    """Represents a git commit."""
    hash: str
    short_hash: str
    message: str
    author: str
    date: str
    files_changed: int = 0


@dataclass
class Branch:
    """Represents a git branch."""
    name: str
    is_current: bool
    last_commit: Optional[str] = None


@dataclass
class FileDiff:
    """Represents a file diff."""
    path: str
    status: str  # 'added', 'modified', 'deleted', 'renamed'
    additions: int
    deletions: int
    diff_content: str


class GitService:
    """Service for git operations on projects."""
    
    def __init__(self):
        """Initialize git service."""
        self.projects_path = Path(settings.projects_path)
    
    def _get_project_path(self, project_id: str) -> Path:
        """Get the path to a project directory."""
        return self.projects_path / project_id
    
    def _run_git(
        self, 
        project_id: str, 
        args: List[str],
        check: bool = True
    ) -> Tuple[bool, str, str]:
        """
        Run a git command in the project directory.
        
        Returns (success, stdout, stderr).
        """
        project_path = self._get_project_path(project_id)
        
        if not project_path.exists():
            return False, "", "Project directory does not exist"
        
        try:
            result = subprocess.run(
                ['git'] + args,
                cwd=project_path,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            return success, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            return False, "", "Git command timed out"
        except FileNotFoundError:
            return False, "", "Git is not installed"
        except Exception as e:
            return False, "", str(e)
    
    def is_git_repo(self, project_id: str) -> bool:
        """Check if project is a git repository."""
        project_path = self._get_project_path(project_id)
        return (project_path / '.git').exists()
    
    def init_repo(self, project_id: str) -> Tuple[bool, str]:
        """
        Initialize a git repository for the project.
        
        Returns (success, message).
        """
        project_path = self._get_project_path(project_id)
        
        # Create directory if it doesn't exist
        project_path.mkdir(parents=True, exist_ok=True)
        
        if self.is_git_repo(project_id):
            return True, "Repository already initialized"
        
        # Initialize git repo
        success, stdout, stderr = self._run_git(project_id, ['init'])
        
        if not success:
            return False, f"Failed to initialize: {stderr}"
        
        # Configure git user for this repo
        self._run_git(project_id, ['config', 'user.email', 'intelekt@local'])
        self._run_git(project_id, ['config', 'user.name', 'Intelekt'])
        
        # Create initial commit if there are files
        files = list(project_path.glob('*'))
        if files:
            self._run_git(project_id, ['add', '-A'])
            self._run_git(project_id, ['commit', '-m', 'Initial commit'])
        
        return True, "Repository initialized successfully"
    
    def get_status(self, project_id: str) -> Dict:
        """
        Get the current git status.
        
        Returns dict with staged, unstaged, and untracked files.
        """
        if not self.is_git_repo(project_id):
            return {"error": "Not a git repository"}
        
        result = {
            "staged": [],
            "unstaged": [],
            "untracked": [],
            "has_changes": False
        }
        
        # Get status
        success, stdout, _ = self._run_git(
            project_id, 
            ['status', '--porcelain']
        )
        
        if not success:
            return result
        
        for line in stdout.strip().split('\n'):
            if not line:
                continue
            
            status = line[:2]
            filepath = line[3:]
            
            # Staged changes (index)
            if status[0] in ['A', 'M', 'D', 'R']:
                result["staged"].append({
                    "path": filepath,
                    "status": self._status_to_word(status[0])
                })
            
            # Unstaged changes (working tree)
            if status[1] in ['M', 'D']:
                result["unstaged"].append({
                    "path": filepath,
                    "status": self._status_to_word(status[1])
                })
            
            # Untracked files
            if status == '??':
                result["untracked"].append(filepath)
        
        result["has_changes"] = bool(
            result["staged"] or result["unstaged"] or result["untracked"]
        )
        
        return result
    
    def _status_to_word(self, status: str) -> str:
        """Convert git status code to word."""
        mapping = {
            'A': 'added',
            'M': 'modified',
            'D': 'deleted',
            'R': 'renamed',
            '?': 'untracked'
        }
        return mapping.get(status, 'unknown')
    
    def add_files(
        self, 
        project_id: str, 
        files: Optional[List[str]] = None
    ) -> Tuple[bool, str]:
        """
        Stage files for commit.
        
        If files is None, stages all changes.
        """
        if not self.is_git_repo(project_id):
            return False, "Not a git repository"
        
        if files:
            success, _, stderr = self._run_git(project_id, ['add'] + files)
        else:
            success, _, stderr = self._run_git(project_id, ['add', '-A'])
        
        if success:
            return True, "Files staged successfully"
        return False, f"Failed to stage files: {stderr}"
    
    def commit(
        self, 
        project_id: str, 
        message: str,
        add_all: bool = True
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Create a commit.
        
        Returns (success, message, commit_hash).
        """
        if not self.is_git_repo(project_id):
            return False, "Not a git repository", None
        
        if not message:
            return False, "Commit message is required", None
        
        # Stage all changes if requested
        if add_all:
            self._run_git(project_id, ['add', '-A'])
        
        # Check if there's anything to commit
        status = self.get_status(project_id)
        if not status.get("staged"):
            return False, "Nothing to commit", None
        
        # Create commit
        success, stdout, stderr = self._run_git(
            project_id, 
            ['commit', '-m', message]
        )
        
        if not success:
            return False, f"Commit failed: {stderr}", None
        
        # Get commit hash
        success, hash_output, _ = self._run_git(
            project_id, 
            ['rev-parse', 'HEAD']
        )
        
        commit_hash = hash_output.strip() if success else None
        
        return True, "Commit created successfully", commit_hash
    
    def get_log(
        self, 
        project_id: str, 
        limit: int = 50
    ) -> List[Commit]:
        """Get commit history."""
        if not self.is_git_repo(project_id):
            return []
        
        # Get log with custom format
        format_str = '%H|%h|%s|%an|%ad'
        success, stdout, _ = self._run_git(
            project_id,
            ['log', f'-{limit}', f'--format={format_str}', '--date=relative']
        )
        
        if not success:
            return []
        
        commits = []
        for line in stdout.strip().split('\n'):
            if not line:
                continue
            
            parts = line.split('|')
            if len(parts) >= 5:
                commits.append(Commit(
                    hash=parts[0],
                    short_hash=parts[1],
                    message=parts[2],
                    author=parts[3],
                    date=parts[4]
                ))
        
        return commits
    
    def get_branches(self, project_id: str) -> List[Branch]:
        """Get all branches."""
        if not self.is_git_repo(project_id):
            return []
        
        success, stdout, _ = self._run_git(project_id, ['branch', '-a'])
        
        if not success:
            return []
        
        branches = []
        for line in stdout.strip().split('\n'):
            if not line:
                continue
            
            is_current = line.startswith('*')
            name = line.lstrip('* ').strip()
            
            # Skip remote tracking refs for now
            if name.startswith('remotes/'):
                continue
            
            branches.append(Branch(
                name=name,
                is_current=is_current
            ))
        
        return branches
    
    def create_branch(
        self, 
        project_id: str, 
        branch_name: str
    ) -> Tuple[bool, str]:
        """Create a new branch."""
        if not self.is_git_repo(project_id):
            return False, "Not a git repository"
        
        success, _, stderr = self._run_git(
            project_id, 
            ['branch', branch_name]
        )
        
        if success:
            return True, f"Branch '{branch_name}' created"
        return False, f"Failed to create branch: {stderr}"
    
    def checkout_branch(
        self, 
        project_id: str, 
        branch_name: str
    ) -> Tuple[bool, str]:
        """Switch to a branch."""
        if not self.is_git_repo(project_id):
            return False, "Not a git repository"
        
        success, _, stderr = self._run_git(
            project_id, 
            ['checkout', branch_name]
        )
        
        if success:
            return True, f"Switched to branch '{branch_name}'"
        return False, f"Failed to checkout: {stderr}"
    
    def get_diff(
        self, 
        project_id: str,
        staged: bool = False,
        commit: Optional[str] = None
    ) -> List[FileDiff]:
        """
        Get diff of changes.
        
        If staged=True, shows staged changes.
        If commit is provided, shows diff of that commit.
        """
        if not self.is_git_repo(project_id):
            return []
        
        if commit:
            args = ['diff', f'{commit}^..{commit}', '--numstat']
        elif staged:
            args = ['diff', '--cached', '--numstat']
        else:
            args = ['diff', '--numstat']
        
        success, stdout, _ = self._run_git(project_id, args)
        
        if not success:
            return []
        
        diffs = []
        for line in stdout.strip().split('\n'):
            if not line:
                continue
            
            parts = line.split('\t')
            if len(parts) >= 3:
                additions = int(parts[0]) if parts[0] != '-' else 0
                deletions = int(parts[1]) if parts[1] != '-' else 0
                filepath = parts[2]
                
                # Get the actual diff content
                if commit:
                    diff_args = ['diff', f'{commit}^..{commit}', '--', filepath]
                elif staged:
                    diff_args = ['diff', '--cached', '--', filepath]
                else:
                    diff_args = ['diff', '--', filepath]
                
                _, diff_content, _ = self._run_git(project_id, diff_args)
                
                diffs.append(FileDiff(
                    path=filepath,
                    status='modified',
                    additions=additions,
                    deletions=deletions,
                    diff_content=diff_content
                ))
        
        return diffs
    
    def get_file_at_commit(
        self, 
        project_id: str, 
        commit: str, 
        filepath: str
    ) -> Optional[str]:
        """Get file content at a specific commit."""
        if not self.is_git_repo(project_id):
            return None
        
        success, stdout, _ = self._run_git(
            project_id, 
            ['show', f'{commit}:{filepath}']
        )
        
        return stdout if success else None
    
    def discard_changes(
        self, 
        project_id: str, 
        files: Optional[List[str]] = None
    ) -> Tuple[bool, str]:
        """Discard uncommitted changes."""
        if not self.is_git_repo(project_id):
            return False, "Not a git repository"
        
        if files:
            success, _, stderr = self._run_git(
                project_id, 
                ['checkout', '--'] + files
            )
        else:
            success, _, stderr = self._run_git(
                project_id, 
                ['checkout', '--', '.']
            )
        
        if success:
            return True, "Changes discarded"
        return False, f"Failed to discard changes: {stderr}"
    
    def get_current_branch(self, project_id: str) -> Optional[str]:
        """Get the current branch name."""
        if not self.is_git_repo(project_id):
            return None
        
        success, stdout, _ = self._run_git(
            project_id, 
            ['rev-parse', '--abbrev-ref', 'HEAD']
        )
        
        return stdout.strip() if success else None


# Singleton instance
git_service = GitService()
