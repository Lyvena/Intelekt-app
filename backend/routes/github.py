"""
GitHub Integration API Routes

Comprehensive endpoints for GitHub repository management,
pull requests, issues, actions, and collaboration.
"""

from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict
from services.github_service import github_service

router = APIRouter(prefix="/api/github", tags=["github"])


# ============== AUTH & USER ==============

@router.post("/auth/token")
async def set_github_token(
    user_id: str = Query(...),
    token: str = Body(..., embed=True)
):
    """Set GitHub token for a user."""
    github_service.set_token(user_id, token)
    return {"success": True, "message": "Token set successfully"}


@router.get("/auth/validate")
async def validate_token(user_id: str = Query(...)):
    """Validate the stored GitHub token."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    is_valid = await github_service.validate_token(token)
    return {"valid": is_valid}


@router.get("/user")
async def get_authenticated_user(user_id: str = Query(...)):
    """Get the authenticated user's GitHub profile."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        user = await github_service.get_authenticated_user(token)
        return {"user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/user/{username}")
async def get_user(username: str, user_id: str = Query(...)):
    """Get a user's public GitHub profile."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        user = await github_service.get_user(token, username)
        return {"user": user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== REPOSITORIES ==============

@router.get("/repos")
async def list_repos(
    user_id: str = Query(...),
    visibility: str = "all",
    sort: str = "updated",
    per_page: int = 30,
    page: int = 1
):
    """List repositories for the authenticated user."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        repos = await github_service.list_repos(token, visibility, sort, per_page, page)
        return {"repos": repos, "count": len(repos)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}")
async def get_repo(owner: str, repo: str, user_id: str = Query(...)):
    """Get a repository."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        repository = await github_service.get_repo(token, owner, repo)
        return {"repo": repository}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos")
async def create_repo(
    user_id: str = Query(...),
    name: str = Body(...),
    description: str = Body(""),
    private: bool = Body(False),
    auto_init: bool = Body(True),
    gitignore_template: Optional[str] = Body(None),
    license_template: Optional[str] = Body(None)
):
    """Create a new repository."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        repository = await github_service.create_repo(
            token, name, description, private, auto_init,
            gitignore_template, license_template
        )
        return {"success": True, "repo": repository}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/repos/{owner}/{repo}")
async def delete_repo(owner: str, repo: str, user_id: str = Query(...)):
    """Delete a repository."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.delete_repo(token, owner, repo)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/fork")
async def fork_repo(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    organization: Optional[str] = Body(None),
    name: Optional[str] = Body(None)
):
    """Fork a repository."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        forked = await github_service.fork_repo(token, owner, repo, organization, name)
        return {"success": True, "repo": forked}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/search")
async def search_repos(
    user_id: str = Query(...),
    query: str = Query(...),
    sort: str = "stars",
    order: str = "desc",
    per_page: int = 30
):
    """Search repositories."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        results = await github_service.search_repos(token, query, sort, order, per_page)
        return results
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== BRANCHES ==============

@router.get("/repos/{owner}/{repo}/branches")
async def list_branches(
    owner: str,
    repo: str,
    user_id: str = Query(...)
):
    """List branches in a repository."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        branches = await github_service.list_branches(token, owner, repo)
        return {"branches": branches, "count": len(branches)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/branches/{branch}")
async def get_branch(owner: str, repo: str, branch: str, user_id: str = Query(...)):
    """Get a specific branch."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        branch_data = await github_service.get_branch(token, owner, repo, branch)
        return {"branch": branch_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/branches")
async def create_branch(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    branch_name: str = Body(...),
    from_branch: str = Body("main")
):
    """Create a new branch."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        result = await github_service.create_branch(token, owner, repo, branch_name, from_branch)
        return {"success": True, "ref": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/repos/{owner}/{repo}/branches/{branch}")
async def delete_branch(owner: str, repo: str, branch: str, user_id: str = Query(...)):
    """Delete a branch."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.delete_branch(token, owner, repo, branch)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/merge")
async def merge_branches(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    base: str = Body(...),
    head: str = Body(...),
    commit_message: Optional[str] = Body(None)
):
    """Merge branches."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        result = await github_service.merge_branches(token, owner, repo, base, head, commit_message)
        return {"success": True, "commit": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== COMMITS ==============

@router.get("/repos/{owner}/{repo}/commits")
async def list_commits(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    branch: Optional[str] = None,
    per_page: int = 30,
    page: int = 1
):
    """List commits in a repository."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        commits = await github_service.list_commits(token, owner, repo, branch, per_page, page)
        return {"commits": commits, "count": len(commits)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/commits/{ref}")
async def get_commit(owner: str, repo: str, ref: str, user_id: str = Query(...)):
    """Get a specific commit."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        commit = await github_service.get_commit(token, owner, repo, ref)
        return {"commit": commit}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/compare/{base}...{head}")
async def compare_commits(owner: str, repo: str, base: str, head: str, user_id: str = Query(...)):
    """Compare two commits."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        comparison = await github_service.compare_commits(token, owner, repo, base, head)
        return {"comparison": comparison}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== FILES & CONTENTS ==============

@router.get("/repos/{owner}/{repo}/contents")
async def get_contents(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    path: str = "",
    ref: Optional[str] = None
):
    """Get repository contents."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        contents = await github_service.get_contents(token, owner, repo, path, ref)
        return {"contents": contents}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/repos/{owner}/{repo}/contents/{path:path}")
async def create_or_update_file(
    owner: str,
    repo: str,
    path: str,
    user_id: str = Query(...),
    content: str = Body(...),
    message: str = Body(...),
    branch: Optional[str] = Body(None),
    sha: Optional[str] = Body(None)
):
    """Create or update a file."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        result = await github_service.create_or_update_file(
            token, owner, repo, path, content, message, branch, sha
        )
        return {"success": True, "content": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/readme")
async def get_readme(owner: str, repo: str, user_id: str = Query(...)):
    """Get repository README."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        readme = await github_service.get_readme(token, owner, repo)
        return {"readme": readme}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== PULL REQUESTS ==============

@router.get("/repos/{owner}/{repo}/pulls")
async def list_pull_requests(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    state: str = "open",
    sort: str = "created",
    direction: str = "desc",
    per_page: int = 30
):
    """List pull requests."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        prs = await github_service.list_pull_requests(token, owner, repo, state, sort, direction, per_page)
        return {"pull_requests": prs, "count": len(prs)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/pulls/{pull_number}")
async def get_pull_request(owner: str, repo: str, pull_number: int, user_id: str = Query(...)):
    """Get a pull request."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        pr = await github_service.get_pull_request(token, owner, repo, pull_number)
        return {"pull_request": pr}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/pulls")
async def create_pull_request(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    title: str = Body(...),
    head: str = Body(...),
    base: str = Body(...),
    body: str = Body(""),
    draft: bool = Body(False)
):
    """Create a pull request."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        pr = await github_service.create_pull_request(token, owner, repo, title, head, base, body, draft)
        return {"success": True, "pull_request": pr}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/repos/{owner}/{repo}/pulls/{pull_number}")
async def update_pull_request(
    owner: str,
    repo: str,
    pull_number: int,
    user_id: str = Query(...),
    title: Optional[str] = Body(None),
    body: Optional[str] = Body(None),
    state: Optional[str] = Body(None),
    base: Optional[str] = Body(None)
):
    """Update a pull request."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        pr = await github_service.update_pull_request(token, owner, repo, pull_number, title, body, state, base)
        return {"success": True, "pull_request": pr}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/repos/{owner}/{repo}/pulls/{pull_number}/merge")
async def merge_pull_request(
    owner: str,
    repo: str,
    pull_number: int,
    user_id: str = Query(...),
    commit_title: Optional[str] = Body(None),
    commit_message: Optional[str] = Body(None),
    merge_method: str = Body("merge")
):
    """Merge a pull request."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        result = await github_service.merge_pull_request(
            token, owner, repo, pull_number, commit_title, commit_message, merge_method
        )
        return {"success": True, "merge": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/pulls/{pull_number}/files")
async def list_pr_files(owner: str, repo: str, pull_number: int, user_id: str = Query(...)):
    """List files in a pull request."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        files = await github_service.list_pr_files(token, owner, repo, pull_number)
        return {"files": files, "count": len(files)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/pulls/{pull_number}/reviews")
async def create_pr_review(
    owner: str,
    repo: str,
    pull_number: int,
    user_id: str = Query(...),
    body: str = Body(...),
    event: str = Body("COMMENT"),
    comments: Optional[List[Dict]] = Body(None)
):
    """Create a review on a pull request."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        review = await github_service.create_pr_review(token, owner, repo, pull_number, body, event, comments)
        return {"success": True, "review": review}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== ISSUES ==============

@router.get("/repos/{owner}/{repo}/issues")
async def list_issues(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    state: str = "open",
    labels: Optional[str] = None,
    assignee: Optional[str] = None,
    sort: str = "created",
    direction: str = "desc",
    per_page: int = 30
):
    """List issues."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        issues = await github_service.list_issues(
            token, owner, repo, state, labels, assignee, sort, direction, per_page
        )
        return {"issues": issues, "count": len(issues)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/issues/{issue_number}")
async def get_issue(owner: str, repo: str, issue_number: int, user_id: str = Query(...)):
    """Get an issue."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        issue = await github_service.get_issue(token, owner, repo, issue_number)
        return {"issue": issue}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/issues")
async def create_issue(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    title: str = Body(...),
    body: str = Body(""),
    labels: Optional[List[str]] = Body(None),
    assignees: Optional[List[str]] = Body(None),
    milestone: Optional[int] = Body(None)
):
    """Create an issue."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        issue = await github_service.create_issue(token, owner, repo, title, body, labels, assignees, milestone)
        return {"success": True, "issue": issue}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/repos/{owner}/{repo}/issues/{issue_number}")
async def update_issue(
    owner: str,
    repo: str,
    issue_number: int,
    user_id: str = Query(...),
    title: Optional[str] = Body(None),
    body: Optional[str] = Body(None),
    state: Optional[str] = Body(None),
    labels: Optional[List[str]] = Body(None),
    assignees: Optional[List[str]] = Body(None)
):
    """Update an issue."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        issue = await github_service.update_issue(
            token, owner, repo, issue_number, title, body, state, labels, assignees
        )
        return {"success": True, "issue": issue}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/issues/{issue_number}/comments")
async def add_issue_comment(
    owner: str,
    repo: str,
    issue_number: int,
    user_id: str = Query(...),
    body: str = Body(...)
):
    """Add a comment to an issue."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        comment = await github_service.add_issue_comment(token, owner, repo, issue_number, body)
        return {"success": True, "comment": comment}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/issues/{issue_number}/comments")
async def list_issue_comments(owner: str, repo: str, issue_number: int, user_id: str = Query(...)):
    """List comments on an issue."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        comments = await github_service.list_issue_comments(token, owner, repo, issue_number)
        return {"comments": comments, "count": len(comments)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== GITHUB ACTIONS ==============

@router.get("/repos/{owner}/{repo}/actions/workflows")
async def list_workflows(owner: str, repo: str, user_id: str = Query(...)):
    """List workflows."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        workflows = await github_service.list_workflows(token, owner, repo)
        return workflows
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches")
async def trigger_workflow(
    owner: str,
    repo: str,
    workflow_id: str,
    user_id: str = Query(...),
    ref: str = Body(...),
    inputs: Optional[Dict[str, str]] = Body(None)
):
    """Trigger a workflow."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.trigger_workflow(token, owner, repo, workflow_id, ref, inputs)
        return {"success": True, "message": "Workflow triggered"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/actions/runs")
async def list_workflow_runs(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    workflow_id: Optional[str] = None,
    status: Optional[str] = None,
    per_page: int = 30
):
    """List workflow runs."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        runs = await github_service.list_workflow_runs(token, owner, repo, workflow_id, status, per_page)
        return runs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/actions/runs/{run_id}")
async def get_workflow_run(owner: str, repo: str, run_id: int, user_id: str = Query(...)):
    """Get a workflow run."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        run = await github_service.get_workflow_run(token, owner, repo, run_id)
        return {"run": run}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/actions/runs/{run_id}/cancel")
async def cancel_workflow_run(owner: str, repo: str, run_id: int, user_id: str = Query(...)):
    """Cancel a workflow run."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.cancel_workflow_run(token, owner, repo, run_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/actions/runs/{run_id}/rerun")
async def rerun_workflow(owner: str, repo: str, run_id: int, user_id: str = Query(...)):
    """Re-run a workflow."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.rerun_workflow(token, owner, repo, run_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/actions/runs/{run_id}/jobs")
async def list_workflow_jobs(owner: str, repo: str, run_id: int, user_id: str = Query(...)):
    """List jobs for a workflow run."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        jobs = await github_service.list_workflow_jobs(token, owner, repo, run_id)
        return jobs
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== RELEASES ==============

@router.get("/repos/{owner}/{repo}/releases")
async def list_releases(owner: str, repo: str, user_id: str = Query(...), per_page: int = 30):
    """List releases."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        releases = await github_service.list_releases(token, owner, repo, per_page)
        return {"releases": releases, "count": len(releases)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/releases/latest")
async def get_latest_release(owner: str, repo: str, user_id: str = Query(...)):
    """Get the latest release."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        release = await github_service.get_latest_release(token, owner, repo)
        return {"release": release}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/releases")
async def create_release(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    tag_name: str = Body(...),
    name: str = Body(...),
    body: str = Body(""),
    draft: bool = Body(False),
    prerelease: bool = Body(False),
    target_commitish: str = Body("main")
):
    """Create a release."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        release = await github_service.create_release(
            token, owner, repo, tag_name, name, body, draft, prerelease, target_commitish
        )
        return {"success": True, "release": release}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== COLLABORATORS ==============

@router.get("/repos/{owner}/{repo}/collaborators")
async def list_collaborators(owner: str, repo: str, user_id: str = Query(...)):
    """List collaborators."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        collaborators = await github_service.list_collaborators(token, owner, repo)
        return {"collaborators": collaborators, "count": len(collaborators)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/repos/{owner}/{repo}/collaborators/{username}")
async def add_collaborator(
    owner: str,
    repo: str,
    username: str,
    user_id: str = Query(...),
    permission: str = Body("push")
):
    """Add a collaborator."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.add_collaborator(token, owner, repo, username, permission)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/repos/{owner}/{repo}/collaborators/{username}")
async def remove_collaborator(owner: str, repo: str, username: str, user_id: str = Query(...)):
    """Remove a collaborator."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.remove_collaborator(token, owner, repo, username)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== STATS & INSIGHTS ==============

@router.get("/repos/{owner}/{repo}/stats/contributors")
async def get_contributors_stats(owner: str, repo: str, user_id: str = Query(...)):
    """Get contributor statistics."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        stats = await github_service.get_contributors_stats(token, owner, repo)
        return {"stats": stats}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/languages")
async def get_languages(owner: str, repo: str, user_id: str = Query(...)):
    """Get repository languages."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        languages = await github_service.get_languages(token, owner, repo)
        return {"languages": languages}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/community")
async def get_community_profile(owner: str, repo: str, user_id: str = Query(...)):
    """Get community profile."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        profile = await github_service.get_community_profile(token, owner, repo)
        return {"profile": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== NOTIFICATIONS ==============

@router.get("/notifications")
async def list_notifications(
    user_id: str = Query(...),
    all_notifications: bool = False,
    participating: bool = False
):
    """List notifications."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        notifications = await github_service.list_notifications(token, all_notifications, participating)
        return {"notifications": notifications, "count": len(notifications)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/notifications/read")
async def mark_notifications_read(user_id: str = Query(...)):
    """Mark all notifications as read."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        await github_service.mark_notifications_read(token)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== GISTS ==============

@router.get("/gists")
async def list_gists(user_id: str = Query(...), per_page: int = 30):
    """List gists."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        gists = await github_service.list_gists(token, per_page)
        return {"gists": gists, "count": len(gists)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/gists")
async def create_gist(
    user_id: str = Query(...),
    files: Dict[str, Dict[str, str]] = Body(...),
    description: str = Body(""),
    public: bool = Body(False)
):
    """Create a gist."""
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="No token found for user")
    
    try:
        gist = await github_service.create_gist(token, files, description, public)
        return {"success": True, "gist": gist}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== PROJECT PUSH ==============

@router.post("/push/{owner}/{repo}")
async def push_project_to_repo(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    files: Dict[str, str] = Body(...),
    commit_message: str = Body("Update from Intelekt"),
    branch: str = Body("main"),
    use_tree_api: bool = Body(True)
):
    """
    Push multiple files to a GitHub repository.
    
    Args:
        owner: Repository owner
        repo: Repository name
        user_id: User ID for authentication
        files: Dict of file_path -> content
        commit_message: Commit message
        branch: Target branch (default: main)
        use_tree_api: Use Git Data API for single commit (default: True, more efficient)
    
    Returns:
        Push result with commit details
    """
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected. Please connect your GitHub account first.")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files to push")
    
    try:
        if use_tree_api:
            result = await github_service.push_project_as_tree(
                token=token,
                owner=owner,
                repo=repo,
                files=files,
                commit_message=commit_message,
                branch=branch
            )
        else:
            result = await github_service.push_project(
                token=token,
                owner=owner,
                repo=repo,
                files=files,
                commit_message=commit_message,
                branch=branch
            )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Push failed"))
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/push/{owner}/{repo}/create-and-push")
async def create_repo_and_push(
    owner: str,
    repo: str,
    user_id: str = Query(...),
    files: Dict[str, str] = Body(...),
    commit_message: str = Body("Initial commit from Intelekt"),
    description: str = Body(""),
    private: bool = Body(False)
):
    """
    Create a new repository and push files to it.
    
    Args:
        owner: Repository owner (should match authenticated user)
        repo: Repository name to create
        user_id: User ID for authentication
        files: Dict of file_path -> content
        commit_message: Commit message
        description: Repository description
        private: Whether the repository should be private
    
    Returns:
        Repository creation and push results
    """
    token = github_service.get_token(user_id)
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected. Please connect your GitHub account first.")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files to push")
    
    try:
        # Check if repo already exists
        try:
            existing = await github_service.get_repo(token, owner, repo)
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Repository {owner}/{repo} already exists. Use the push endpoint instead."
                )
        except Exception as e:
            if "404" not in str(e):
                raise
            # Repo doesn't exist, continue with creation
        
        # Create the repository
        new_repo = await github_service.create_repo(
            token=token,
            name=repo,
            description=description,
            private=private,
            auto_init=True  # Initialize with README
        )
        
        # Wait a moment for GitHub to initialize the repo
        import asyncio
        await asyncio.sleep(1)
        
        # Push files to the new repository
        result = await github_service.push_project_as_tree(
            token=token,
            owner=owner,
            repo=repo,
            files=files,
            commit_message=commit_message,
            branch="main"
        )
        
        return {
            "success": True,
            "repo_created": True,
            "repo_url": new_repo.get("html_url"),
            "repo_name": new_repo.get("full_name"),
            "push_result": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
