"""
Integration Service

Coordinates between all services to ensure features work together:
- Framework → Project Management (create tasks from framework steps)
- GitHub → Project Management (sync issues ↔ tasks)
- GitHub → Collaboration (sync PRs → notifications)
- Framework → Collaboration (team progress notifications)
- Project Management → Collaboration (task notifications)
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
from uuid import uuid4

from .framework_service import framework_service
from .project_management_service import project_management_service
from .collaboration_service import collaboration_service
from .github_service import github_service
from models.project_management import (
    TaskCreate, TaskType, TaskPriority, TaskStatus,
    SprintCreate, MilestoneCreate,
    NotificationType
)


class IntegrationService:
    """Service that integrates all features for seamless operation."""
    
    def __init__(self):
        self.project_github_links: Dict[str, Dict[str, str]] = {}  # project_id -> {owner, repo}
        self.task_issue_links: Dict[str, int] = {}  # task_id -> github_issue_number
        self.issue_task_links: Dict[str, str] = {}  # "{owner}/{repo}#{issue}" -> task_id
    
    # ============== FRAMEWORK → PROJECT MANAGEMENT ==============
    
    async def create_tasks_from_framework(
        self,
        project_id: str,
        user_id: str,
        user_name: str
    ) -> List[Dict[str, Any]]:
        """Create project tasks from completed framework steps."""
        session = framework_service.get_session(project_id)
        if not session:
            return []
        
        created_tasks = []
        summary = framework_service.generate_summary(project_id)
        
        if not summary:
            return []
        
        # Create milestone from framework completion
        milestone = project_management_service.create_milestone(
            project_id=project_id,
            milestone_data=MilestoneCreate(
                name="MVP Development",
                description=f"Building MVP for: {summary.get('idea', 'Project')}",
                target_date=datetime.now().replace(month=datetime.now().month + 3)
            ),
            user_id=user_id,
            user_name=user_name
        )
        
        # Create tasks based on framework insights
        task_templates = [
            {
                "title": f"Define target customer: {summary.get('persona', 'Target User')}",
                "type": TaskType.RESEARCH,
                "priority": TaskPriority.HIGH,
                "description": f"Beachhead Market: {summary.get('beachhead_market', 'TBD')}"
            },
            {
                "title": "Implement core value proposition",
                "type": TaskType.FEATURE,
                "priority": TaskPriority.CRITICAL,
                "description": summary.get('value_proposition', '')
            },
            {
                "title": "Build MVP based on product specification",
                "type": TaskType.FEATURE,
                "priority": TaskPriority.HIGH,
                "description": summary.get('mvp_specification', '')
            },
            {
                "title": "Set up business model infrastructure",
                "type": TaskType.TECH_DEBT,
                "priority": TaskPriority.MEDIUM,
                "description": summary.get('business_model', '')
            },
            {
                "title": "Implement product plan features",
                "type": TaskType.FEATURE,
                "priority": TaskPriority.MEDIUM,
                "description": summary.get('product_plan', '')
            }
        ]
        
        # Add tasks for each key insight
        for insight in summary.get('key_insights', [])[:5]:
            task_templates.append({
                "title": f"Address insight: {insight[:50]}...",
                "type": TaskType.IMPROVEMENT,
                "priority": TaskPriority.MEDIUM,
                "description": insight
            })
        
        for template in task_templates:
            task = project_management_service.create_task(
                project_id=project_id,
                task_data=TaskCreate(
                    title=template["title"],
                    description=template.get("description", ""),
                    type=template["type"],
                    priority=template["priority"],
                    milestone_id=milestone.id
                ),
                reporter_id=user_id,
                reporter_name=user_name
            )
            created_tasks.append({
                "task_id": task.id,
                "title": task.title,
                "type": task.type.value
            })
        
        # Notify team about framework completion
        await self._notify_framework_complete(project_id, user_id, user_name, len(created_tasks))
        
        return created_tasks
    
    async def _notify_framework_complete(
        self,
        project_id: str,
        user_id: str,
        user_name: str,
        task_count: int
    ):
        """Notify team that framework is complete."""
        members = collaboration_service.get_team_members(project_id)
        
        for member in members:
            if member.user_id != user_id:
                collaboration_service.create_notification(
                    user_id=member.user_id,
                    project_id=project_id,
                    type=NotificationType.SYSTEM,
                    title="Framework Analysis Complete! 🎉",
                    message=f"{user_name} completed the MIT 24-Step framework. {task_count} tasks have been created.",
                    from_user_id=user_id,
                    from_user_name=user_name
                )
    
    # ============== GITHUB ↔ PROJECT MANAGEMENT ==============
    
    def link_project_to_github(
        self,
        project_id: str,
        owner: str,
        repo: str
    ):
        """Link an Intelekt project to a GitHub repository."""
        self.project_github_links[project_id] = {
            "owner": owner,
            "repo": repo
        }
    
    def get_github_link(self, project_id: str) -> Optional[Dict[str, str]]:
        """Get GitHub repo linked to a project."""
        return self.project_github_links.get(project_id)
    
    async def sync_github_issues_to_tasks(
        self,
        project_id: str,
        user_id: str,
        user_name: str,
        token: str
    ) -> Dict[str, Any]:
        """Sync GitHub issues to project tasks."""
        link = self.get_github_link(project_id)
        if not link:
            return {"synced": 0, "error": "Project not linked to GitHub"}
        
        owner, repo = link["owner"], link["repo"]
        
        try:
            issues = await github_service.list_issues(token, owner, repo, state="open")
            
            synced = 0
            for issue in issues:
                issue_key = f"{owner}/{repo}#{issue['number']}"
                
                # Skip if already synced
                if issue_key in self.issue_task_links:
                    continue
                
                # Create task from issue
                task = project_management_service.create_task(
                    project_id=project_id,
                    task_data=TaskCreate(
                        title=f"[GH#{issue['number']}] {issue['title']}",
                        description=f"{issue.get('body', '')}\n\n---\n[View on GitHub]({issue['html_url']})",
                        type=TaskType.BUG if 'bug' in [l['name'].lower() for l in issue.get('labels', [])] else TaskType.FEATURE,
                        priority=TaskPriority.HIGH if 'priority:high' in [l['name'].lower() for l in issue.get('labels', [])] else TaskPriority.MEDIUM
                    ),
                    reporter_id=user_id,
                    reporter_name=user_name
                )
                
                # Track links
                self.task_issue_links[task.id] = issue['number']
                self.issue_task_links[issue_key] = task.id
                synced += 1
            
            return {"synced": synced, "total_issues": len(issues)}
        except Exception as e:
            return {"synced": 0, "error": str(e)}
    
    async def create_github_issue_from_task(
        self,
        project_id: str,
        task_id: str,
        user_id: str,
        token: str
    ) -> Optional[Dict[str, Any]]:
        """Create a GitHub issue from a task."""
        link = self.get_github_link(project_id)
        if not link:
            return None
        
        task = project_management_service.get_task(project_id, task_id)
        if not task:
            return None
        
        owner, repo = link["owner"], link["repo"]
        
        # Map task type to labels
        labels = []
        if task.type == TaskType.BUG:
            labels.append("bug")
        elif task.type == TaskType.FEATURE:
            labels.append("enhancement")
        elif task.type == TaskType.DOCUMENTATION:
            labels.append("documentation")
        
        # Map priority to labels
        if task.priority == TaskPriority.CRITICAL:
            labels.append("priority:critical")
        elif task.priority == TaskPriority.HIGH:
            labels.append("priority:high")
        
        try:
            issue = await github_service.create_issue(
                token=token,
                owner=owner,
                repo=repo,
                title=task.title,
                body=f"{task.description}\n\n---\n*Created from Intelekt task {task.id}*",
                labels=labels
            )
            
            # Track link
            issue_key = f"{owner}/{repo}#{issue['number']}"
            self.task_issue_links[task_id] = issue['number']
            self.issue_task_links[issue_key] = task_id
            
            return issue
        except Exception as e:
            return {"error": str(e)}
    
    async def sync_task_status_to_github(
        self,
        project_id: str,
        task_id: str,
        token: str
    ) -> bool:
        """Sync task status to linked GitHub issue."""
        link = self.get_github_link(project_id)
        if not link or task_id not in self.task_issue_links:
            return False
        
        task = project_management_service.get_task(project_id, task_id)
        if not task:
            return False
        
        owner, repo = link["owner"], link["repo"]
        issue_number = self.task_issue_links[task_id]
        
        try:
            # Close issue if task is done
            if task.status == TaskStatus.DONE:
                await github_service.update_issue(
                    token=token,
                    owner=owner,
                    repo=repo,
                    issue_number=issue_number,
                    state="closed"
                )
            return True
        except:
            return False
    
    # ============== GITHUB → COLLABORATION ==============
    
    async def notify_pr_activity(
        self,
        project_id: str,
        pr_data: Dict[str, Any],
        action: str,
        actor_name: str
    ):
        """Notify team about PR activity."""
        members = collaboration_service.get_team_members(project_id)
        
        title_map = {
            "opened": f"New PR: {pr_data.get('title', 'Untitled')}",
            "merged": f"PR Merged: {pr_data.get('title', 'Untitled')}",
            "closed": f"PR Closed: {pr_data.get('title', 'Untitled')}",
            "review_requested": f"Review Requested: {pr_data.get('title', 'Untitled')}"
        }
        
        for member in members:
            collaboration_service.create_notification(
                user_id=member.user_id,
                project_id=project_id,
                type=NotificationType.SYSTEM,
                title=title_map.get(action, f"PR Activity: {pr_data.get('title', '')}"),
                message=f"{actor_name} {action} pull request #{pr_data.get('number', '')}",
                entity_type="pull_request",
                entity_id=str(pr_data.get('number', ''))
            )
    
    async def notify_workflow_status(
        self,
        project_id: str,
        workflow_name: str,
        status: str,
        conclusion: Optional[str],
        run_url: str
    ):
        """Notify team about workflow run status."""
        members = collaboration_service.get_team_members(project_id)
        
        emoji = "✅" if conclusion == "success" else "❌" if conclusion == "failure" else "⏳"
        
        for member in members:
            collaboration_service.create_notification(
                user_id=member.user_id,
                project_id=project_id,
                type=NotificationType.SYSTEM,
                title=f"{emoji} Workflow: {workflow_name}",
                message=f"Status: {conclusion or status}",
                entity_type="workflow_run",
                entity_id=run_url
            )
    
    # ============== PROJECT MANAGEMENT → COLLABORATION ==============
    
    def notify_task_assigned(
        self,
        project_id: str,
        task_id: str,
        assignee_id: str,
        assigner_id: str,
        assigner_name: str
    ):
        """Notify user when assigned to a task."""
        task = project_management_service.get_task(project_id, task_id)
        if not task:
            return
        
        collaboration_service.create_notification(
            user_id=assignee_id,
            project_id=project_id,
            type=NotificationType.TASK_ASSIGNED,
            title="Task Assigned",
            message=f"You've been assigned to: {task.title}",
            entity_type="task",
            entity_id=task_id,
            from_user_id=assigner_id,
            from_user_name=assigner_name
        )
    
    def notify_task_completed(
        self,
        project_id: str,
        task_id: str,
        completer_id: str,
        completer_name: str
    ):
        """Notify relevant users when a task is completed."""
        task = project_management_service.get_task(project_id, task_id)
        if not task:
            return
        
        # Notify reporter
        if task.reporter_id != completer_id:
            collaboration_service.create_notification(
                user_id=task.reporter_id,
                project_id=project_id,
                type=NotificationType.TASK_COMPLETED,
                title="Task Completed",
                message=f"{completer_name} completed: {task.title}",
                entity_type="task",
                entity_id=task_id,
                from_user_id=completer_id,
                from_user_name=completer_name
            )
    
    def notify_sprint_started(
        self,
        project_id: str,
        sprint_id: str,
        starter_id: str,
        starter_name: str
    ):
        """Notify team when a sprint starts."""
        sprint = project_management_service.get_sprint(project_id, sprint_id)
        if not sprint:
            return
        
        members = collaboration_service.get_team_members(project_id)
        
        for member in members:
            if member.user_id != starter_id:
                collaboration_service.create_notification(
                    user_id=member.user_id,
                    project_id=project_id,
                    type=NotificationType.SPRINT_STARTED,
                    title="Sprint Started! 🏃",
                    message=f"{starter_name} started sprint: {sprint.name}",
                    entity_type="sprint",
                    entity_id=sprint_id,
                    from_user_id=starter_id,
                    from_user_name=starter_name
                )
    
    def notify_milestone_reached(
        self,
        project_id: str,
        milestone_id: str
    ):
        """Notify team when a milestone is reached."""
        milestone = project_management_service.milestones.get(project_id, {}).get(milestone_id)
        if not milestone or milestone.progress_percentage < 100:
            return
        
        members = collaboration_service.get_team_members(project_id)
        
        for member in members:
            collaboration_service.create_notification(
                user_id=member.user_id,
                project_id=project_id,
                type=NotificationType.MILESTONE_REACHED,
                title="Milestone Reached! 🎯",
                message=f"Congratulations! Milestone '{milestone.name}' has been completed!",
                entity_type="milestone",
                entity_id=milestone_id
            )
    
    # ============== UNIFIED PROJECT DASHBOARD DATA ==============
    
    async def get_project_dashboard(
        self,
        project_id: str,
        user_id: str,
        github_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get unified dashboard data for a project."""
        dashboard = {
            "project_id": project_id,
            "timestamp": datetime.now().isoformat(),
            "framework": None,
            "project_management": None,
            "team": None,
            "github": None
        }
        
        # Framework status
        session = framework_service.get_session(project_id)
        if session:
            progress = framework_service.get_progress(project_id)
            dashboard["framework"] = {
                "current_step": session.get("current_step", 1),
                "progress_percentage": progress.get("progress_percentage", 0) if progress else 0,
                "ready_for_development": progress.get("ready_for_development", False) if progress else False
            }
        
        # Project management stats
        analytics = project_management_service.get_project_analytics(project_id)
        active_sprint = project_management_service.get_active_sprint(project_id)
        dashboard["project_management"] = {
            "total_tasks": analytics.total_tasks,
            "tasks_by_status": analytics.tasks_by_status,
            "active_sprint": {
                "name": active_sprint.name,
                "progress": f"{active_sprint.tasks_completed}/{active_sprint.tasks_total}"
            } if active_sprint else None,
            "velocity": analytics.velocity_average
        }
        
        # Team stats
        members = collaboration_service.get_team_members(project_id)
        online = collaboration_service.get_online_users(project_id)
        unread = collaboration_service.get_unread_count(user_id)
        dashboard["team"] = {
            "total_members": len(members),
            "online_count": len(online),
            "unread_notifications": unread
        }
        
        # GitHub stats (if linked and token provided)
        github_link = self.get_github_link(project_id)
        if github_link and github_token:
            try:
                owner, repo = github_link["owner"], github_link["repo"]
                repo_data = await github_service.get_repo(github_token, owner, repo)
                prs = await github_service.list_pull_requests(github_token, owner, repo, state="open")
                issues = await github_service.list_issues(github_token, owner, repo, state="open")
                
                dashboard["github"] = {
                    "repo": f"{owner}/{repo}",
                    "stars": repo_data.get("stargazers_count", 0),
                    "open_prs": len(prs) if isinstance(prs, list) else 0,
                    "open_issues": len(issues) if isinstance(issues, list) else 0,
                    "default_branch": repo_data.get("default_branch", "main")
                }
            except:
                dashboard["github"] = {"linked": True, "error": "Failed to fetch data"}
        
        return dashboard
    
    # ============== WEBHOOK HANDLERS ==============
    
    async def handle_github_webhook(
        self,
        project_id: str,
        event_type: str,
        payload: Dict[str, Any]
    ):
        """Handle incoming GitHub webhooks."""
        if event_type == "issues":
            action = payload.get("action")
            issue = payload.get("issue", {})
            
            if action == "opened":
                # Could auto-create task from new issue
                pass
            elif action == "closed":
                # Sync to linked task
                issue_key = f"{payload.get('repository', {}).get('full_name')}#{issue.get('number')}"
                if issue_key in self.issue_task_links:
                    task_id = self.issue_task_links[issue_key]
                    project_management_service.update_task(
                        project_id=project_id,
                        task_id=task_id,
                        updates={"status": TaskStatus.DONE},
                        user_id="github",
                        user_name="GitHub"
                    )
        
        elif event_type == "pull_request":
            action = payload.get("action")
            pr = payload.get("pull_request", {})
            sender = payload.get("sender", {}).get("login", "Unknown")
            
            await self.notify_pr_activity(project_id, pr, action, sender)
        
        elif event_type == "workflow_run":
            workflow = payload.get("workflow_run", {})
            if payload.get("action") == "completed":
                await self.notify_workflow_status(
                    project_id=project_id,
                    workflow_name=workflow.get("name", "Unknown"),
                    status=workflow.get("status"),
                    conclusion=workflow.get("conclusion"),
                    run_url=workflow.get("html_url", "")
                )


# Singleton instance
integration_service = IntegrationService()
