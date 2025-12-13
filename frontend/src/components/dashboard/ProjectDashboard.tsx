import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  GitBranch,
  CheckSquare,
  Users,
  Bell,
  TrendingUp,
  Target,
  Zap,
  RefreshCw,
  ExternalLink,
  GitPullRequest,
  AlertCircle,
  Play,
  Link2
} from 'lucide-react';

interface DashboardData {
  project_id: string;
  timestamp: string;
  framework: {
    current_step: number;
    progress_percentage: number;
    ready_for_development: boolean;
  } | null;
  project_management: {
    total_tasks: number;
    tasks_by_status: Record<string, number>;
    active_sprint: {
      name: string;
      progress: string;
    } | null;
    velocity: number | null;
  } | null;
  team: {
    total_members: number;
    online_count: number;
    unread_notifications: number;
  } | null;
  github: {
    repo: string;
    stars: number;
    open_prs: number;
    open_issues: number;
    default_branch: string;
  } | null;
}

interface ProjectDashboardProps {
  projectId: string;
  userId: string;
  onNavigate: (section: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projectId,
  userId,
  onNavigate,
}) => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLinkingGithub, setIsLinkingGithub] = useState(false);
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/integration/${projectId}/dashboard?user_id=${userId}`);
      const data = await res.json();
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, userId]);

  useEffect(() => {
    loadDashboard();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const handleLinkGithub = async () => {
    if (!githubOwner.trim() || !githubRepo.trim()) return;
    
    try {
      await fetch(`/api/integration/${projectId}/link-github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: githubOwner, repo: githubRepo })
      });
      setIsLinkingGithub(false);
      loadDashboard();
    } catch (err) {
      setError('Failed to link GitHub repository');
    }
  };

  const handleCreateTasksFromFramework = async () => {
    try {
      const res = await fetch(
        `/api/integration/${projectId}/framework-to-tasks?user_id=${userId}&user_name=User`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        loadDashboard();
      }
    } catch (err) {
      setError('Failed to create tasks from framework');
    }
  };

  const handleSyncGithubIssues = async () => {
    try {
      const res = await fetch(
        `/api/integration/${projectId}/sync-github-issues?user_id=${userId}&user_name=User`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (data.success) {
        loadDashboard();
      }
    } catch (err) {
      setError('Failed to sync GitHub issues');
    }
  };

  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Dashboard</h1>
        </div>
        <button
          onClick={loadDashboard}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Framework Progress */}
        <div
          onClick={() => onNavigate('framework')}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Target className="w-5 h-5 text-purple-500" />
            <span className="text-xs text-gray-500">Framework</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {dashboard?.framework?.progress_percentage ?? 0}%
          </div>
          <div className="text-sm text-gray-500">
            Step {dashboard?.framework?.current_step ?? 1} of 24
          </div>
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all"
              style={{ width: `${dashboard?.framework?.progress_percentage ?? 0}%` }}
            />
          </div>
        </div>

        {/* Tasks */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckSquare className="w-5 h-5 text-green-500" />
            <span className="text-xs text-gray-500">Tasks</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {dashboard?.project_management?.total_tasks ?? 0}
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
              {dashboard?.project_management?.tasks_by_status?.todo ?? 0} todo
            </span>
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
              {dashboard?.project_management?.tasks_by_status?.in_progress ?? 0} in progress
            </span>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
              {dashboard?.project_management?.tasks_by_status?.done ?? 0} done
            </span>
          </div>
        </div>

        {/* Team */}
        <div
          onClick={() => onNavigate('team')}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-gray-500">Team</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {dashboard?.team?.total_members ?? 0}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {dashboard?.team?.online_count ?? 0} online
            </span>
            {(dashboard?.team?.unread_notifications ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <Bell className="w-3 h-3" />
                {dashboard?.team?.unread_notifications} unread
              </span>
            )}
          </div>
        </div>

        {/* Velocity */}
        <div
          onClick={() => onNavigate('analytics')}
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <span className="text-xs text-gray-500">Velocity</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {dashboard?.project_management?.velocity?.toFixed(1) ?? '-'}
          </div>
          <div className="text-sm text-gray-500">
            {dashboard?.project_management?.active_sprint 
              ? `Sprint: ${dashboard.project_management.active_sprint.name}`
              : 'No active sprint'}
          </div>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h2 className="font-semibold text-gray-900 dark:text-white">GitHub Integration</h2>
          </div>
          {dashboard?.github && (
            <a
              href={`https://github.com/${dashboard.github.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
            >
              {dashboard.github.repo}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {dashboard?.github ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <GitPullRequest className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-lg font-semibold">{dashboard.github.open_prs}</div>
                  <div className="text-xs text-gray-500">Open PRs</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="text-lg font-semibold">{dashboard.github.open_issues}</div>
                  <div className="text-xs text-gray-500">Open Issues</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Play className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-lg font-semibold">{dashboard.github.default_branch}</div>
                  <div className="text-xs text-gray-500">Default Branch</div>
                </div>
              </div>
            </div>
            <button
              onClick={handleSyncGithubIssues}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Issues to Tasks
            </button>
          </div>
        ) : (
          <div>
            {isLinkingGithub ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={githubOwner}
                    onChange={(e) => setGithubOwner(e.target.value)}
                    placeholder="Owner (e.g., octocat)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    placeholder="Repository (e.g., hello-world)"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleLinkGithub}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Link Repository
                  </button>
                  <button
                    onClick={() => setIsLinkingGithub(false)}
                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsLinkingGithub(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100"
              >
                <Link2 className="w-4 h-4" />
                Link GitHub Repository
              </button>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {dashboard?.framework?.ready_for_development && (
            <button
              onClick={handleCreateTasksFromFramework}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
            >
              Create Tasks from Framework
            </button>
          )}
          <button
            onClick={() => onNavigate('kanban')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Open Kanban Board
          </button>
          <button
            onClick={() => onNavigate('chat')}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
          >
            Team Chat
          </button>
          <button
            onClick={() => onNavigate('github')}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 text-sm"
          >
            GitHub Panel
          </button>
        </div>
      </div>

      {/* Active Sprint */}
      {dashboard?.project_management?.active_sprint && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Active Sprint: {dashboard.project_management.active_sprint.name}
            </h2>
            <span className="text-sm text-gray-500">
              {dashboard.project_management.active_sprint.progress} tasks
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all"
              style={{
                width: `${(() => {
                  const [done, total] = dashboard.project_management.active_sprint.progress.split('/').map(Number);
                  return total > 0 ? (done / total) * 100 : 0;
                })()}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDashboard;
