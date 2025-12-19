"""
GitHub Integration Service

Comprehensive GitHub integration for repository management,
pull requests, issues, actions, and collaboration.
"""

import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel
import base64
import json


class GitHubService:
    """Service for GitHub API integration."""
    
    BASE_URL = "https://api.github.com"
    
    def __init__(self):
        self.tokens: Dict[str, str] = {}  # user_id -> token
    
    def set_token(self, user_id: str, token: str):
        """Set GitHub token for a user."""
        self.tokens[user_id] = token
    
    def get_token(self, user_id: str) -> Optional[str]:
        """Get GitHub token for a user."""
        return self.tokens.get(user_id)
    
    def _get_headers(self, token: str) -> Dict[str, str]:
        """Get headers for GitHub API requests."""
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        token: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Make a request to GitHub API."""
        url = f"{self.BASE_URL}{endpoint}"
        headers = self._get_headers(token)
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=data,
                params=params,
                timeout=30.0
            )
            
            if response.status_code >= 400:
                error_data = response.json() if response.content else {}
                raise Exception(f"GitHub API error: {response.status_code} - {error_data.get('message', 'Unknown error')}")
            
            if response.content:
                return response.json()
            return {"success": True}
    
    # ============== USER & AUTH ==============
    
    async def get_authenticated_user(self, token: str) -> Dict[str, Any]:
        """Get the authenticated user's profile."""
        return await self._request("GET", "/user", token)
    
    async def get_user(self, token: str, username: str) -> Dict[str, Any]:
        """Get a user's public profile."""
        return await self._request("GET", f"/users/{username}", token)
    
    async def validate_token(self, token: str) -> bool:
        """Validate if a token is valid."""
        try:
            await self.get_authenticated_user(token)
            return True
        except:
            return False
    
    # ============== REPOSITORIES ==============
    
    async def list_repos(
        self,
        token: str,
        visibility: str = "all",
        sort: str = "updated",
        per_page: int = 30,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """List repositories for the authenticated user."""
        params = {
            "visibility": visibility,
            "sort": sort,
            "per_page": per_page,
            "page": page
        }
        return await self._request("GET", "/user/repos", token, params=params)
    
    async def get_repo(self, token: str, owner: str, repo: str) -> Dict[str, Any]:
        """Get a repository."""
        return await self._request("GET", f"/repos/{owner}/{repo}", token)
    
    async def create_repo(
        self,
        token: str,
        name: str,
        description: str = "",
        private: bool = False,
        auto_init: bool = True,
        gitignore_template: Optional[str] = None,
        license_template: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new repository."""
        data = {
            "name": name,
            "description": description,
            "private": private,
            "auto_init": auto_init
        }
        if gitignore_template:
            data["gitignore_template"] = gitignore_template
        if license_template:
            data["license_template"] = license_template
        
        return await self._request("POST", "/user/repos", token, data=data)
    
    async def delete_repo(self, token: str, owner: str, repo: str) -> Dict[str, Any]:
        """Delete a repository."""
        return await self._request("DELETE", f"/repos/{owner}/{repo}", token)
    
    async def fork_repo(
        self,
        token: str,
        owner: str,
        repo: str,
        organization: Optional[str] = None,
        name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Fork a repository."""
        data = {}
        if organization:
            data["organization"] = organization
        if name:
            data["name"] = name
        
        return await self._request("POST", f"/repos/{owner}/{repo}/forks", token, data=data or None)
    
    async def search_repos(
        self,
        token: str,
        query: str,
        sort: str = "stars",
        order: str = "desc",
        per_page: int = 30
    ) -> Dict[str, Any]:
        """Search repositories."""
        params = {
            "q": query,
            "sort": sort,
            "order": order,
            "per_page": per_page
        }
        return await self._request("GET", "/search/repositories", token, params=params)
    
    # ============== BRANCHES ==============
    
    async def list_branches(
        self,
        token: str,
        owner: str,
        repo: str,
        per_page: int = 100
    ) -> List[Dict[str, Any]]:
        """List branches in a repository."""
        params = {"per_page": per_page}
        return await self._request("GET", f"/repos/{owner}/{repo}/branches", token, params=params)
    
    async def get_branch(
        self,
        token: str,
        owner: str,
        repo: str,
        branch: str
    ) -> Dict[str, Any]:
        """Get a specific branch."""
        return await self._request("GET", f"/repos/{owner}/{repo}/branches/{branch}", token)
    
    async def create_branch(
        self,
        token: str,
        owner: str,
        repo: str,
        branch_name: str,
        from_branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a new branch."""
        # First get the SHA of the source branch
        source = await self.get_branch(token, owner, repo, from_branch)
        sha = source["commit"]["sha"]
        
        # Create the new branch reference
        data = {
            "ref": f"refs/heads/{branch_name}",
            "sha": sha
        }
        return await self._request("POST", f"/repos/{owner}/{repo}/git/refs", token, data=data)
    
    async def delete_branch(
        self,
        token: str,
        owner: str,
        repo: str,
        branch: str
    ) -> Dict[str, Any]:
        """Delete a branch."""
        return await self._request("DELETE", f"/repos/{owner}/{repo}/git/refs/heads/{branch}", token)
    
    async def merge_branches(
        self,
        token: str,
        owner: str,
        repo: str,
        base: str,
        head: str,
        commit_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """Merge one branch into another."""
        data = {
            "base": base,
            "head": head
        }
        if commit_message:
            data["commit_message"] = commit_message
        
        return await self._request("POST", f"/repos/{owner}/{repo}/merges", token, data=data)
    
    # ============== COMMITS ==============
    
    async def list_commits(
        self,
        token: str,
        owner: str,
        repo: str,
        branch: Optional[str] = None,
        per_page: int = 30,
        page: int = 1
    ) -> List[Dict[str, Any]]:
        """List commits in a repository."""
        params = {"per_page": per_page, "page": page}
        if branch:
            params["sha"] = branch
        return await self._request("GET", f"/repos/{owner}/{repo}/commits", token, params=params)
    
    async def get_commit(
        self,
        token: str,
        owner: str,
        repo: str,
        ref: str
    ) -> Dict[str, Any]:
        """Get a specific commit."""
        return await self._request("GET", f"/repos/{owner}/{repo}/commits/{ref}", token)
    
    async def compare_commits(
        self,
        token: str,
        owner: str,
        repo: str,
        base: str,
        head: str
    ) -> Dict[str, Any]:
        """Compare two commits."""
        return await self._request("GET", f"/repos/{owner}/{repo}/compare/{base}...{head}", token)
    
    # ============== FILES & CONTENTS ==============
    
    async def get_contents(
        self,
        token: str,
        owner: str,
        repo: str,
        path: str = "",
        ref: Optional[str] = None
    ) -> Any:
        """Get repository contents."""
        params = {}
        if ref:
            params["ref"] = ref
        return await self._request("GET", f"/repos/{owner}/{repo}/contents/{path}", token, params=params)
    
    async def create_or_update_file(
        self,
        token: str,
        owner: str,
        repo: str,
        path: str,
        content: str,
        message: str,
        branch: Optional[str] = None,
        sha: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create or update a file in the repository."""
        data = {
            "message": message,
            "content": base64.b64encode(content.encode()).decode()
        }
        if branch:
            data["branch"] = branch
        if sha:
            data["sha"] = sha
        
        return await self._request("PUT", f"/repos/{owner}/{repo}/contents/{path}", token, data=data)
    
    async def delete_file(
        self,
        token: str,
        owner: str,
        repo: str,
        path: str,
        message: str,
        sha: str,
        branch: Optional[str] = None
    ) -> Dict[str, Any]:
        """Delete a file from the repository."""
        data = {
            "message": message,
            "sha": sha
        }
        if branch:
            data["branch"] = branch
        
        return await self._request("DELETE", f"/repos/{owner}/{repo}/contents/{path}", token, data=data)
    
    async def get_readme(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> Dict[str, Any]:
        """Get the README of a repository."""
        return await self._request("GET", f"/repos/{owner}/{repo}/readme", token)
    
    # ============== PULL REQUESTS ==============
    
    async def list_pull_requests(
        self,
        token: str,
        owner: str,
        repo: str,
        state: str = "open",
        sort: str = "created",
        direction: str = "desc",
        per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """List pull requests."""
        params = {
            "state": state,
            "sort": sort,
            "direction": direction,
            "per_page": per_page
        }
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls", token, params=params)
    
    async def get_pull_request(
        self,
        token: str,
        owner: str,
        repo: str,
        pull_number: int
    ) -> Dict[str, Any]:
        """Get a specific pull request."""
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls/{pull_number}", token)
    
    async def create_pull_request(
        self,
        token: str,
        owner: str,
        repo: str,
        title: str,
        head: str,
        base: str,
        body: str = "",
        draft: bool = False
    ) -> Dict[str, Any]:
        """Create a pull request."""
        data = {
            "title": title,
            "head": head,
            "base": base,
            "body": body,
            "draft": draft
        }
        return await self._request("POST", f"/repos/{owner}/{repo}/pulls", token, data=data)
    
    async def update_pull_request(
        self,
        token: str,
        owner: str,
        repo: str,
        pull_number: int,
        title: Optional[str] = None,
        body: Optional[str] = None,
        state: Optional[str] = None,
        base: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update a pull request."""
        data = {}
        if title:
            data["title"] = title
        if body:
            data["body"] = body
        if state:
            data["state"] = state
        if base:
            data["base"] = base
        
        return await self._request("PATCH", f"/repos/{owner}/{repo}/pulls/{pull_number}", token, data=data)
    
    async def merge_pull_request(
        self,
        token: str,
        owner: str,
        repo: str,
        pull_number: int,
        commit_title: Optional[str] = None,
        commit_message: Optional[str] = None,
        merge_method: str = "merge"  # merge, squash, rebase
    ) -> Dict[str, Any]:
        """Merge a pull request."""
        data = {"merge_method": merge_method}
        if commit_title:
            data["commit_title"] = commit_title
        if commit_message:
            data["commit_message"] = commit_message
        
        return await self._request("PUT", f"/repos/{owner}/{repo}/pulls/{pull_number}/merge", token, data=data)
    
    async def list_pr_files(
        self,
        token: str,
        owner: str,
        repo: str,
        pull_number: int
    ) -> List[Dict[str, Any]]:
        """List files changed in a pull request."""
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls/{pull_number}/files", token)
    
    async def list_pr_commits(
        self,
        token: str,
        owner: str,
        repo: str,
        pull_number: int
    ) -> List[Dict[str, Any]]:
        """List commits in a pull request."""
        return await self._request("GET", f"/repos/{owner}/{repo}/pulls/{pull_number}/commits", token)
    
    async def create_pr_review(
        self,
        token: str,
        owner: str,
        repo: str,
        pull_number: int,
        body: str,
        event: str = "COMMENT",  # APPROVE, REQUEST_CHANGES, COMMENT
        comments: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Create a review on a pull request."""
        data = {
            "body": body,
            "event": event
        }
        if comments:
            data["comments"] = comments
        
        return await self._request("POST", f"/repos/{owner}/{repo}/pulls/{pull_number}/reviews", token, data=data)
    
    # ============== ISSUES ==============
    
    async def list_issues(
        self,
        token: str,
        owner: str,
        repo: str,
        state: str = "open",
        labels: Optional[str] = None,
        assignee: Optional[str] = None,
        sort: str = "created",
        direction: str = "desc",
        per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """List issues in a repository."""
        params = {
            "state": state,
            "sort": sort,
            "direction": direction,
            "per_page": per_page
        }
        if labels:
            params["labels"] = labels
        if assignee:
            params["assignee"] = assignee
        
        return await self._request("GET", f"/repos/{owner}/{repo}/issues", token, params=params)
    
    async def get_issue(
        self,
        token: str,
        owner: str,
        repo: str,
        issue_number: int
    ) -> Dict[str, Any]:
        """Get a specific issue."""
        return await self._request("GET", f"/repos/{owner}/{repo}/issues/{issue_number}", token)
    
    async def create_issue(
        self,
        token: str,
        owner: str,
        repo: str,
        title: str,
        body: str = "",
        labels: Optional[List[str]] = None,
        assignees: Optional[List[str]] = None,
        milestone: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create an issue."""
        data = {
            "title": title,
            "body": body
        }
        if labels:
            data["labels"] = labels
        if assignees:
            data["assignees"] = assignees
        if milestone:
            data["milestone"] = milestone
        
        return await self._request("POST", f"/repos/{owner}/{repo}/issues", token, data=data)
    
    async def update_issue(
        self,
        token: str,
        owner: str,
        repo: str,
        issue_number: int,
        title: Optional[str] = None,
        body: Optional[str] = None,
        state: Optional[str] = None,
        labels: Optional[List[str]] = None,
        assignees: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Update an issue."""
        data = {}
        if title:
            data["title"] = title
        if body is not None:
            data["body"] = body
        if state:
            data["state"] = state
        if labels is not None:
            data["labels"] = labels
        if assignees is not None:
            data["assignees"] = assignees
        
        return await self._request("PATCH", f"/repos/{owner}/{repo}/issues/{issue_number}", token, data=data)
    
    async def add_issue_comment(
        self,
        token: str,
        owner: str,
        repo: str,
        issue_number: int,
        body: str
    ) -> Dict[str, Any]:
        """Add a comment to an issue."""
        data = {"body": body}
        return await self._request("POST", f"/repos/{owner}/{repo}/issues/{issue_number}/comments", token, data=data)
    
    async def list_issue_comments(
        self,
        token: str,
        owner: str,
        repo: str,
        issue_number: int
    ) -> List[Dict[str, Any]]:
        """List comments on an issue."""
        return await self._request("GET", f"/repos/{owner}/{repo}/issues/{issue_number}/comments", token)
    
    # ============== LABELS ==============
    
    async def list_labels(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> List[Dict[str, Any]]:
        """List labels in a repository."""
        return await self._request("GET", f"/repos/{owner}/{repo}/labels", token)
    
    async def create_label(
        self,
        token: str,
        owner: str,
        repo: str,
        name: str,
        color: str,
        description: str = ""
    ) -> Dict[str, Any]:
        """Create a label."""
        data = {
            "name": name,
            "color": color.lstrip("#"),
            "description": description
        }
        return await self._request("POST", f"/repos/{owner}/{repo}/labels", token, data=data)
    
    # ============== GITHUB ACTIONS ==============
    
    async def list_workflows(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> Dict[str, Any]:
        """List workflows in a repository."""
        return await self._request("GET", f"/repos/{owner}/{repo}/actions/workflows", token)
    
    async def get_workflow(
        self,
        token: str,
        owner: str,
        repo: str,
        workflow_id: str
    ) -> Dict[str, Any]:
        """Get a specific workflow."""
        return await self._request("GET", f"/repos/{owner}/{repo}/actions/workflows/{workflow_id}", token)
    
    async def trigger_workflow(
        self,
        token: str,
        owner: str,
        repo: str,
        workflow_id: str,
        ref: str,
        inputs: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Trigger a workflow dispatch event."""
        data = {"ref": ref}
        if inputs:
            data["inputs"] = inputs
        
        return await self._request("POST", f"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", token, data=data)
    
    async def list_workflow_runs(
        self,
        token: str,
        owner: str,
        repo: str,
        workflow_id: Optional[str] = None,
        status: Optional[str] = None,
        per_page: int = 30
    ) -> Dict[str, Any]:
        """List workflow runs."""
        params = {"per_page": per_page}
        if status:
            params["status"] = status
        
        if workflow_id:
            endpoint = f"/repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"
        else:
            endpoint = f"/repos/{owner}/{repo}/actions/runs"
        
        return await self._request("GET", endpoint, token, params=params)
    
    async def get_workflow_run(
        self,
        token: str,
        owner: str,
        repo: str,
        run_id: int
    ) -> Dict[str, Any]:
        """Get a specific workflow run."""
        return await self._request("GET", f"/repos/{owner}/{repo}/actions/runs/{run_id}", token)
    
    async def cancel_workflow_run(
        self,
        token: str,
        owner: str,
        repo: str,
        run_id: int
    ) -> Dict[str, Any]:
        """Cancel a workflow run."""
        return await self._request("POST", f"/repos/{owner}/{repo}/actions/runs/{run_id}/cancel", token)
    
    async def rerun_workflow(
        self,
        token: str,
        owner: str,
        repo: str,
        run_id: int
    ) -> Dict[str, Any]:
        """Re-run a workflow."""
        return await self._request("POST", f"/repos/{owner}/{repo}/actions/runs/{run_id}/rerun", token)
    
    async def list_workflow_jobs(
        self,
        token: str,
        owner: str,
        repo: str,
        run_id: int
    ) -> Dict[str, Any]:
        """List jobs for a workflow run."""
        return await self._request("GET", f"/repos/{owner}/{repo}/actions/runs/{run_id}/jobs", token)
    
    async def get_workflow_logs(
        self,
        token: str,
        owner: str,
        repo: str,
        run_id: int
    ) -> str:
        """Get logs for a workflow run (returns download URL)."""
        url = f"{self.BASE_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/logs"
        headers = self._get_headers(token)
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, follow_redirects=False)
            if response.status_code == 302:
                return response.headers.get("Location", "")
            return ""
    
    # ============== COLLABORATORS ==============
    
    async def list_collaborators(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> List[Dict[str, Any]]:
        """List repository collaborators."""
        return await self._request("GET", f"/repos/{owner}/{repo}/collaborators", token)
    
    async def add_collaborator(
        self,
        token: str,
        owner: str,
        repo: str,
        username: str,
        permission: str = "push"  # pull, push, admin, maintain, triage
    ) -> Dict[str, Any]:
        """Add a collaborator to a repository."""
        data = {"permission": permission}
        return await self._request("PUT", f"/repos/{owner}/{repo}/collaborators/{username}", token, data=data)
    
    async def remove_collaborator(
        self,
        token: str,
        owner: str,
        repo: str,
        username: str
    ) -> Dict[str, Any]:
        """Remove a collaborator from a repository."""
        return await self._request("DELETE", f"/repos/{owner}/{repo}/collaborators/{username}", token)
    
    # ============== RELEASES ==============
    
    async def list_releases(
        self,
        token: str,
        owner: str,
        repo: str,
        per_page: int = 30
    ) -> List[Dict[str, Any]]:
        """List releases."""
        params = {"per_page": per_page}
        return await self._request("GET", f"/repos/{owner}/{repo}/releases", token, params=params)
    
    async def get_latest_release(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> Dict[str, Any]:
        """Get the latest release."""
        return await self._request("GET", f"/repos/{owner}/{repo}/releases/latest", token)
    
    async def create_release(
        self,
        token: str,
        owner: str,
        repo: str,
        tag_name: str,
        name: str,
        body: str = "",
        draft: bool = False,
        prerelease: bool = False,
        target_commitish: str = "main"
    ) -> Dict[str, Any]:
        """Create a release."""
        data = {
            "tag_name": tag_name,
            "name": name,
            "body": body,
            "draft": draft,
            "prerelease": prerelease,
            "target_commitish": target_commitish
        }
        return await self._request("POST", f"/repos/{owner}/{repo}/releases", token, data=data)
    
    # ============== WEBHOOKS ==============
    
    async def list_webhooks(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> List[Dict[str, Any]]:
        """List repository webhooks."""
        return await self._request("GET", f"/repos/{owner}/{repo}/hooks", token)
    
    async def create_webhook(
        self,
        token: str,
        owner: str,
        repo: str,
        url: str,
        events: List[str] = None,
        content_type: str = "json",
        secret: Optional[str] = None,
        active: bool = True
    ) -> Dict[str, Any]:
        """Create a webhook."""
        if events is None:
            events = ["push", "pull_request"]
        
        data = {
            "name": "web",
            "active": active,
            "events": events,
            "config": {
                "url": url,
                "content_type": content_type
            }
        }
        if secret:
            data["config"]["secret"] = secret
        
        return await self._request("POST", f"/repos/{owner}/{repo}/hooks", token, data=data)
    
    async def delete_webhook(
        self,
        token: str,
        owner: str,
        repo: str,
        hook_id: int
    ) -> Dict[str, Any]:
        """Delete a webhook."""
        return await self._request("DELETE", f"/repos/{owner}/{repo}/hooks/{hook_id}", token)
    
    # ============== NOTIFICATIONS ==============
    
    async def list_notifications(
        self,
        token: str,
        all_notifications: bool = False,
        participating: bool = False
    ) -> List[Dict[str, Any]]:
        """List notifications for the authenticated user."""
        params = {
            "all": all_notifications,
            "participating": participating
        }
        return await self._request("GET", "/notifications", token, params=params)
    
    async def mark_notifications_read(self, token: str) -> Dict[str, Any]:
        """Mark all notifications as read."""
        return await self._request("PUT", "/notifications", token, data={"read": True})
    
    # ============== GISTS ==============
    
    async def list_gists(self, token: str, per_page: int = 30) -> List[Dict[str, Any]]:
        """List gists for the authenticated user."""
        params = {"per_page": per_page}
        return await self._request("GET", "/gists", token, params=params)
    
    async def create_gist(
        self,
        token: str,
        files: Dict[str, Dict[str, str]],
        description: str = "",
        public: bool = False
    ) -> Dict[str, Any]:
        """Create a gist."""
        data = {
            "description": description,
            "public": public,
            "files": files
        }
        return await self._request("POST", "/gists", token, data=data)
    
    # ============== STATS & INSIGHTS ==============
    
    async def get_contributors_stats(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> List[Dict[str, Any]]:
        """Get contributor statistics."""
        return await self._request("GET", f"/repos/{owner}/{repo}/stats/contributors", token)
    
    async def get_commit_activity(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> List[Dict[str, Any]]:
        """Get commit activity for the last year."""
        return await self._request("GET", f"/repos/{owner}/{repo}/stats/commit_activity", token)
    
    async def get_code_frequency(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> List[List[int]]:
        """Get code frequency statistics."""
        return await self._request("GET", f"/repos/{owner}/{repo}/stats/code_frequency", token)
    
    async def get_languages(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> Dict[str, int]:
        """Get repository languages."""
        return await self._request("GET", f"/repos/{owner}/{repo}/languages", token)
    
    async def get_community_profile(
        self,
        token: str,
        owner: str,
        repo: str
    ) -> Dict[str, Any]:
        """Get community profile metrics."""
        return await self._request("GET", f"/repos/{owner}/{repo}/community/profile", token)
    
    # ============== PROJECT PUSH ==============
    
    async def push_project(
        self,
        token: str,
        owner: str,
        repo: str,
        files: Dict[str, str],
        commit_message: str = "Update from Intelekt",
        branch: str = "main"
    ) -> Dict[str, Any]:
        """
        Push multiple files to a GitHub repository.
        
        Args:
            token: GitHub access token
            owner: Repository owner
            repo: Repository name
            files: Dict of file_path -> content
            commit_message: Commit message
            branch: Target branch (default: main)
        
        Returns:
            Dict with push results
        """
        results = {
            "success": True,
            "pushed_files": [],
            "failed_files": [],
            "commit_message": commit_message
        }
        
        for file_path, content in files.items():
            try:
                # Check if file exists to get its SHA
                sha = None
                try:
                    existing = await self.get_contents(token, owner, repo, file_path, ref=branch)
                    if isinstance(existing, dict) and "sha" in existing:
                        sha = existing["sha"]
                except:
                    pass  # File doesn't exist, will create new
                
                # Create or update the file
                await self.create_or_update_file(
                    token=token,
                    owner=owner,
                    repo=repo,
                    path=file_path,
                    content=content,
                    message=f"{commit_message}: {file_path}",
                    branch=branch,
                    sha=sha
                )
                results["pushed_files"].append(file_path)
            except Exception as e:
                results["failed_files"].append({"path": file_path, "error": str(e)})
        
        if results["failed_files"]:
            results["success"] = len(results["failed_files"]) < len(files)
        
        return results
    
    async def push_project_as_tree(
        self,
        token: str,
        owner: str,
        repo: str,
        files: Dict[str, str],
        commit_message: str = "Update from Intelekt",
        branch: str = "main"
    ) -> Dict[str, Any]:
        """
        Push multiple files to GitHub as a single commit using Git Data API.
        This is more efficient for pushing many files at once.
        
        Args:
            token: GitHub access token
            owner: Repository owner
            repo: Repository name  
            files: Dict of file_path -> content
            commit_message: Commit message
            branch: Target branch (default: main)
        
        Returns:
            Dict with commit details
        """
        try:
            # 1. Get the latest commit SHA on the branch
            branch_info = await self.get_branch(token, owner, repo, branch)
            base_sha = branch_info["commit"]["sha"]
            base_tree_sha = branch_info["commit"]["commit"]["tree"]["sha"]
            
            # 2. Create blobs for each file
            tree_items = []
            for file_path, content in files.items():
                # Create blob
                blob_data = {
                    "content": content,
                    "encoding": "utf-8"
                }
                blob_response = await self._request(
                    "POST", 
                    f"/repos/{owner}/{repo}/git/blobs", 
                    token, 
                    data=blob_data
                )
                
                tree_items.append({
                    "path": file_path,
                    "mode": "100644",  # Regular file
                    "type": "blob",
                    "sha": blob_response["sha"]
                })
            
            # 3. Create a new tree
            tree_data = {
                "base_tree": base_tree_sha,
                "tree": tree_items
            }
            tree_response = await self._request(
                "POST",
                f"/repos/{owner}/{repo}/git/trees",
                token,
                data=tree_data
            )
            
            # 4. Create a new commit
            commit_data = {
                "message": commit_message,
                "tree": tree_response["sha"],
                "parents": [base_sha]
            }
            commit_response = await self._request(
                "POST",
                f"/repos/{owner}/{repo}/git/commits",
                token,
                data=commit_data
            )
            
            # 5. Update the branch reference
            ref_data = {
                "sha": commit_response["sha"],
                "force": False
            }
            await self._request(
                "PATCH",
                f"/repos/{owner}/{repo}/git/refs/heads/{branch}",
                token,
                data=ref_data
            )
            
            return {
                "success": True,
                "commit_sha": commit_response["sha"],
                "commit_url": f"https://github.com/{owner}/{repo}/commit/{commit_response['sha']}",
                "files_pushed": len(files),
                "branch": branch
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Singleton instance
github_service = GitHubService()
