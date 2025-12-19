import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitPullRequest,
  AlertCircle,
  Folder,
  Star,
  GitFork,
  Clock,
  RefreshCw,
  ExternalLink,
  Search,
  Check,
  X,
  Play,
  Square,
  Upload,
  Plus,
  Loader2
} from 'lucide-react';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  private: boolean;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  updated_at: string;
  language: string;
}

interface Branch {
  name: string;
  commit: { sha: string };
  protected: boolean;
}

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string; avatar_url: string };
  created_at: string;
  head: { ref: string };
  base: { ref: string };
  draft: boolean;
  mergeable: boolean;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string };
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  comments: number;
}

interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string;
  html_url: string;
  created_at: string;
  head_branch: string;
}

interface GitHubPanelProps {
  projectId: string;
  userId: string;
  files?: Record<string, string>;
  onRepoSelect?: (repo: Repository) => void;
  onPushSuccess?: (result: PushResult) => void;
}

interface PushResult {
  success: boolean;
  commit_sha?: string;
  commit_url?: string;
  files_pushed?: number;
  branch?: string;
  error?: string;
}

type TabType = 'repos' | 'branches' | 'prs' | 'issues' | 'actions';

export const GitHubPanel: React.FC<GitHubPanelProps> = ({
  userId,
  files,
  onRepoSelect,
  onPushSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('repos');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [prFilter, setPrFilter] = useState<'open' | 'closed' | 'all'>('open');
  const [issueFilter, setIssueFilter] = useState<'open' | 'closed' | 'all'>('open');

  // Token modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');

  // Push modal
  const [showPushModal, setShowPushModal] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Update from Intelekt');
  const [targetBranch, setTargetBranch] = useState('main');
  const [pushResult, setPushResult] = useState<PushResult | null>(null);
  
  // Create repo modal
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDescription, setNewRepoDescription] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [isCreatingRepo, setIsCreatingRepo] = useState(false);

  const handleConnect = async () => {
    if (!tokenInput.trim()) return;
    
    setIsLoading(true);
    try {
      // Set token
      await fetch(`/api/github/auth/token?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput })
      });
      
      // Validate
      const validateRes = await fetch(`/api/github/auth/validate?user_id=${userId}`);
      const validateData = await validateRes.json();
      
      if (validateData.valid) {
        setIsConnected(true);
        setShowTokenModal(false);
        setTokenInput('');
        loadRepos();
      } else {
        setError('Invalid token');
      }
    } catch (err) {
      setError('Failed to connect to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRepos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/github/repos?user_id=${userId}`);
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err) {
      setError('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranches = async () => {
    if (!selectedRepo) return;
    setIsLoading(true);
    try {
      const [owner, repo] = selectedRepo.full_name.split('/');
      const res = await fetch(`/api/github/repos/${owner}/${repo}/branches?user_id=${userId}`);
      const data = await res.json();
      setBranches(data.branches || []);
    } catch (err) {
      setError('Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPullRequests = async () => {
    if (!selectedRepo) return;
    setIsLoading(true);
    try {
      const [owner, repo] = selectedRepo.full_name.split('/');
      const res = await fetch(`/api/github/repos/${owner}/${repo}/pulls?user_id=${userId}&state=${prFilter}`);
      const data = await res.json();
      setPullRequests(data.pull_requests || []);
    } catch (err) {
      setError('Failed to load pull requests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadIssues = async () => {
    if (!selectedRepo) return;
    setIsLoading(true);
    try {
      const [owner, repo] = selectedRepo.full_name.split('/');
      const res = await fetch(`/api/github/repos/${owner}/${repo}/issues?user_id=${userId}&state=${issueFilter}`);
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (err) {
      setError('Failed to load issues');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWorkflowRuns = async () => {
    if (!selectedRepo) return;
    setIsLoading(true);
    try {
      const [owner, repo] = selectedRepo.full_name.split('/');
      const res = await fetch(`/api/github/repos/${owner}/${repo}/actions/runs?user_id=${userId}`);
      const data = await res.json();
      setWorkflowRuns(data.workflow_runs || []);
    } catch (err) {
      setError('Failed to load workflow runs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedRepo) {
      if (activeTab === 'branches') loadBranches();
      else if (activeTab === 'prs') loadPullRequests();
      else if (activeTab === 'issues') loadIssues();
      else if (activeTab === 'actions') loadWorkflowRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepo, activeTab, prFilter, issueFilter]);

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
    onRepoSelect?.(repo);
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusColor = (status: string, conclusion?: string) => {
    if (status === 'completed') {
      if (conclusion === 'success') return 'text-green-500';
      if (conclusion === 'failure') return 'text-red-500';
      return 'text-gray-500';
    }
    if (status === 'in_progress') return 'text-yellow-500';
    return 'text-gray-500';
  };

  const handlePushToRepo = async () => {
    if (!selectedRepo || !files || Object.keys(files).length === 0) return;
    
    setIsPushing(true);
    setPushResult(null);
    
    try {
      const [owner, repo] = selectedRepo.full_name.split('/');
      const res = await fetch(`/api/github/push/${owner}/${repo}?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          commit_message: commitMessage,
          branch: targetBranch,
          use_tree_api: true
        })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        setPushResult(result);
        onPushSuccess?.(result);
      } else {
        setPushResult({ success: false, error: result.detail || 'Push failed' });
      }
    } catch (err) {
      setPushResult({ success: false, error: 'Failed to push to repository' });
    } finally {
      setIsPushing(false);
    }
  };

  const handleCreateAndPush = async () => {
    if (!newRepoName.trim() || !files || Object.keys(files).length === 0) return;
    
    setIsCreatingRepo(true);
    setPushResult(null);
    
    try {
      // Get authenticated user to get owner name
      const userRes = await fetch(`/api/github/user?user_id=${userId}`);
      const userData = await userRes.json();
      const owner = userData.user?.login;
      
      if (!owner) {
        setPushResult({ success: false, error: 'Could not get GitHub username' });
        return;
      }
      
      const res = await fetch(`/api/github/push/${owner}/${newRepoName}/create-and-push?user_id=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          commit_message: commitMessage || 'Initial commit from Intelekt',
          description: newRepoDescription,
          private: newRepoPrivate
        })
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        setPushResult({
          success: true,
          commit_sha: result.push_result?.commit_sha,
          commit_url: result.push_result?.commit_url,
          files_pushed: result.push_result?.files_pushed,
          branch: 'main'
        });
        setShowCreateRepoModal(false);
        loadRepos(); // Refresh repos list
        onPushSuccess?.(result.push_result);
      } else {
        setPushResult({ success: false, error: result.detail || 'Failed to create repository' });
      }
    } catch (err) {
      setPushResult({ success: false, error: 'Failed to create repository and push' });
    } finally {
      setIsCreatingRepo(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Connect to GitHub
          </h3>
          <p className="text-gray-500 mb-4">
            Connect your GitHub account to manage repositories, pull requests, issues, and more.
          </p>
          <button
            onClick={() => setShowTokenModal(true)}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 font-medium"
          >
            Connect GitHub
          </button>
        </div>

        {/* Token Modal */}
        {showTokenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Enter GitHub Token</h3>
              <p className="text-sm text-gray-500 mb-4">
                Create a personal access token at{' '}
                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  GitHub Settings
                </a>
                {' '}with repo, workflow, and user scopes.
              </p>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTokenModal(false)}
                  className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isLoading || !tokenInput.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {isLoading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          <span className="font-semibold">GitHub</span>
          {selectedRepo && (
            <>
              <span className="text-gray-400">/</span>
              <span className="text-blue-500">{selectedRepo.full_name}</span>
            </>
          )}
        </div>
        <button
          onClick={() => activeTab === 'repos' ? loadRepos() : null}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'repos', label: 'Repositories', icon: Folder },
          { id: 'branches', label: 'Branches', icon: GitBranch },
          { id: 'prs', label: 'Pull Requests', icon: GitPullRequest },
          { id: 'issues', label: 'Issues', icon: AlertCircle },
          { id: 'actions', label: 'Actions', icon: Play },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            disabled={tab.id !== 'repos' && !selectedRepo}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            } ${tab.id !== 'repos' && !selectedRepo ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Repositories Tab */}
        {activeTab === 'repos' && (
          <div>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredRepos.map(repo => (
                <div
                  key={repo.id}
                  onClick={() => handleRepoSelect(repo)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRepo?.id === repo.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">{repo.name}</span>
                        {repo.private && (
                          <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">Private</span>
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{repo.description}</p>
                      )}
                    </div>
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {repo.language && <span>{repo.language}</span>}
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" />{repo.stargazers_count}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{repo.forks_count}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(repo.updated_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Branches Tab */}
        {activeTab === 'branches' && selectedRepo && (
          <div className="space-y-2">
            {branches.map(branch => (
              <div
                key={branch.name}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{branch.name}</span>
                  {branch.protected && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">Protected</span>
                  )}
                  {branch.name === selectedRepo.default_branch && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Default</span>
                  )}
                </div>
                <code className="text-xs text-gray-500">{branch.commit.sha.slice(0, 7)}</code>
              </div>
            ))}
          </div>
        )}

        {/* Pull Requests Tab */}
        {activeTab === 'prs' && selectedRepo && (
          <div>
            <div className="flex gap-2 mb-4">
              {(['open', 'closed', 'all'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setPrFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    prFilter === filter
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {pullRequests.map(pr => (
                <a
                  key={pr.id}
                  href={pr.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="flex items-start gap-2">
                    <GitPullRequest className={`w-4 h-4 mt-1 ${pr.state === 'open' ? 'text-green-500' : 'text-purple-500'}`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {pr.title}
                        {pr.draft && <span className="ml-2 text-xs text-gray-500">(Draft)</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        #{pr.number} opened by {pr.user.login} • {pr.head.ref} → {pr.base.ref}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && selectedRepo && (
          <div>
            <div className="flex gap-2 mb-4">
              {(['open', 'closed', 'all'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setIssueFilter(filter)}
                  className={`px-3 py-1 text-sm rounded-full ${
                    issueFilter === filter
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {issues.map(issue => (
                <a
                  key={issue.id}
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`w-4 h-4 mt-1 ${issue.state === 'open' ? 'text-green-500' : 'text-red-500'}`} />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{issue.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {issue.labels.slice(0, 3).map(label => (
                          <span
                            key={label.name}
                            className="px-1.5 py-0.5 text-xs rounded"
                            style={{ backgroundColor: `#${label.color}30`, color: `#${label.color}` }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        #{issue.number} opened by {issue.user.login} • {issue.comments} comments
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && selectedRepo && (
          <div className="space-y-2">
            {workflowRuns.map(run => (
              <a
                key={run.id}
                href={run.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              >
                <div className="flex items-center gap-3">
                  <div className={getStatusColor(run.status, run.conclusion)}>
                    {run.status === 'completed' ? (
                      run.conclusion === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />
                    ) : run.status === 'in_progress' ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{run.name}</div>
                    <div className="text-xs text-gray-500">
                      {run.head_branch} • {formatDate(run.created_at)}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  run.conclusion === 'success' ? 'bg-green-100 text-green-700' :
                  run.conclusion === 'failure' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {run.conclusion || run.status}
                </span>
              </a>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {/* Push Actions Bar */}
      {files && Object.keys(files).length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">
              {Object.keys(files).length} files ready to push
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateRepoModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <Plus className="w-4 h-4" />
                New Repo
              </button>
              <button
                onClick={() => setShowPushModal(true)}
                disabled={!selectedRepo}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" />
                Push to {selectedRepo?.name || 'Repo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Push Modal */}
      {showPushModal && selectedRepo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Push to {selectedRepo.full_name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Commit Message</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Update from Intelekt"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <input
                  type="text"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              
              <div className="text-sm text-gray-500">
                {Object.keys(files || {}).length} files will be pushed
              </div>
              
              {pushResult && (
                <div className={`p-3 rounded-lg ${pushResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                  {pushResult.success ? (
                    <div>
                      <p className="font-medium">✓ Successfully pushed {pushResult.files_pushed} files!</p>
                      {pushResult.commit_url && (
                        <a href={pushResult.commit_url} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                          View commit →
                        </a>
                      )}
                    </div>
                  ) : (
                    <p>✗ {pushResult.error}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => { setShowPushModal(false); setPushResult(null); }}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handlePushToRepo}
                disabled={isPushing}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isPushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isPushing ? 'Pushing...' : 'Push'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Repo Modal */}
      {showCreateRepoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Repository
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Repository Name *</label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value.replace(/[^a-zA-Z0-9-_]/g, '-'))}
                  placeholder="my-awesome-project"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newRepoDescription}
                  onChange={(e) => setNewRepoDescription(e.target.value)}
                  placeholder="A brief description of your project"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private-repo"
                  checked={newRepoPrivate}
                  onChange={(e) => setNewRepoPrivate(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="private-repo" className="text-sm">Make repository private</label>
              </div>
              
              <div className="text-sm text-gray-500">
                {Object.keys(files || {}).length} files will be pushed after creation
              </div>
              
              {pushResult && !pushResult.success && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                  <p>✗ {pushResult.error}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => { setShowCreateRepoModal(false); setPushResult(null); }}
                className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAndPush}
                disabled={isCreatingRepo || !newRepoName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isCreatingRepo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isCreatingRepo ? 'Creating...' : 'Create & Push'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubPanel;
