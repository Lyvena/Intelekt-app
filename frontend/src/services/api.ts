import axios from 'axios';
import type {
  ChatRequest,
  ChatResponse,
  Project,
  ProjectCreate,
  ProjectFile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token getter function - will be set by auth context
let tokenGetter: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (getter: () => Promise<string | null>) => {
  tokenGetter = getter;
};

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.error('Authentication error:', error.response?.data);
    }
    return Promise.reject(error);
  }
);

export const chatAPI = {
  sendMessage: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/api/chat', request);
    return response.data;
  },

  fixErrors: async (request: {
    errors: string[];
    files: Record<string, string>;
    ai_provider?: 'claude' | 'grok';
    project_id?: string;
  }): Promise<{
    success: boolean;
    analysis: string;
    summary: string;
    fixed_files: Array<{ path: string; content: string; had_errors: boolean }>;
    cannot_fix: boolean;
    explanation: string;
  }> => {
    const response = await api.post('/api/chat/fix-errors', request);
    return response.data;
  },
};

export const deployAPI = {
  // Check deployment service status
  status: async (): Promise<{
    railway_configured: boolean;
    supported_platforms: string[];
  }> => {
    const response = await api.get('/api/deploy/status');
    return response.data;
  },

  // Deploy files to Railway
  deployToRailway: async (request: {
    project_name: string;
    files: Record<string, string>;
    railway_token?: string;
  }): Promise<{
    success: boolean;
    project_id: string;
    project_name: string;
    deployment_id?: string;
    url?: string;
    status: string;
    dashboard_url: string;
  }> => {
    const response = await api.post('/api/deploy/railway', request);
    return response.data;
  },

  // Deploy existing project to Railway
  deployProjectToRailway: async (
    projectId: string,
    railwayToken?: string
  ): Promise<{
    success: boolean;
    project_id: string;
    url?: string;
    dashboard_url: string;
  }> => {
    const response = await api.post(`/api/deploy/railway/project/${projectId}`, {
      project_id: projectId,
      railway_token: railwayToken,
    });
    return response.data;
  },

  // Get deployment status
  getDeploymentStatus: async (
    deploymentId: string,
    railwayToken?: string
  ): Promise<{
    id: string;
    status: string;
    url?: string;
  }> => {
    const response = await api.get(
      `/api/deploy/railway/status/${deploymentId}`,
      { params: { railway_token: railwayToken } }
    );
    return response.data;
  },

  // Prepare files for deployment (get configs)
  prepareDeployment: async (request: {
    project_name: string;
    files: Record<string, string>;
  }): Promise<{
    files: Record<string, string>;
    instructions: string;
    file_count: number;
    added_files: string[];
  }> => {
    const response = await api.post('/api/deploy/prepare', request);
    return response.data;
  },
};

export const contextAPI = {
  // Get project context
  getContext: async (projectId: string): Promise<{
    project_id: string;
    tech_stack: Record<string, string>;
    file_structure: string[];
    decisions: Array<{
      type: string;
      description: string;
      rationale: string;
      timestamp: string;
    }>;
    patterns: string[];
    conversation_summary: string;
    last_updated: string;
  }> => {
    const response = await api.get(`/api/context/${projectId}`);
    return response.data;
  },

  // Get context-aware suggestions
  getSuggestions: async (projectId: string, message?: string): Promise<{
    suggestions: string[];
  }> => {
    const params = message ? { message } : {};
    const response = await api.get(`/api/context/${projectId}/suggestions`, { params });
    return response.data;
  },

  // Update tech stack
  updateTechStack: async (projectId: string, techStack: Record<string, string>): Promise<void> => {
    await api.post(`/api/context/${projectId}/tech-stack`, { tech_stack: techStack });
  },

  // Add a decision
  addDecision: async (
    projectId: string,
    decisionType: string,
    description: string,
    rationale?: string
  ): Promise<void> => {
    await api.post(`/api/context/${projectId}/decision`, {
      decision_type: decisionType,
      description,
      rationale: rationale || '',
    });
  },

  // Clear context
  clearContext: async (projectId: string): Promise<void> => {
    await api.delete(`/api/context/${projectId}`);
  },

  // Get comprehensive codebase index
  getCodebaseIndex: async (projectId: string): Promise<{
    success: boolean;
    indexed: boolean;
    project_id?: string;
    total_files?: number;
    total_lines?: number;
    tech_stack?: Record<string, string>;
    patterns?: string[];
    entry_points?: string[];
    files?: Array<{
      path: string;
      language: string;
      lines: number;
      size: number;
      components: string[];
      functions: string[];
      classes: string[];
      imports: string[];
    }>;
    dependencies?: Record<string, string[]>;
    indexed_at?: string;
    message?: string;
  }> => {
    const response = await api.get(`/api/context/${projectId}/index`);
    return response.data;
  },

  // Get AI context string (for debugging)
  getAIContext: async (projectId: string, query?: string): Promise<{
    success: boolean;
    context?: string;
    context_length?: number;
    estimated_tokens?: number;
    message?: string;
  }> => {
    const params = query ? { query } : {};
    const response = await api.get(`/api/context/${projectId}/ai-context`, { params });
    return response.data;
  },
};

export const dependenciesAPI = {
  // Analyze dependencies from files
  analyze: async (files: Record<string, string>): Promise<{
    success: boolean;
    project_type: string;
    python_dependencies: string[];
    javascript_dependencies: string[];
    has_package_json: boolean;
    has_requirements_txt: boolean;
    recommendations: {
      required: string[];
      recommended: string[];
      optional: string[];
    };
  }> => {
    const response = await api.post('/api/dependencies/analyze', { files });
    return response.data;
  },

  // Generate dependency files (package.json, requirements.txt)
  generate: async (projectName: string, files: Record<string, string>): Promise<{
    success: boolean;
    files: Record<string, string>;
    file_count: number;
  }> => {
    const response = await api.post('/api/dependencies/generate', {
      project_name: projectName,
      files,
    });
    return response.data;
  },

  // Analyze project dependencies by ID
  analyzeProject: async (projectId: string): Promise<{
    success: boolean;
    project_type: string;
    python_dependencies: string[];
    javascript_dependencies: string[];
    has_package_json: boolean;
    has_requirements_txt: boolean;
    recommendations: {
      required: string[];
      recommended: string[];
      optional: string[];
    };
  }> => {
    const response = await api.get(`/api/dependencies/project/${projectId}/analyze`);
    return response.data;
  },

  // Generate and save dependency files for a project
  generateForProject: async (projectId: string): Promise<{
    success: boolean;
    generated_files: string[];
    saved_files: string[];
    files_content: Record<string, string>;
  }> => {
    const response = await api.post(`/api/dependencies/project/${projectId}/generate`);
    return response.data;
  },

  // Get dependency suggestions
  suggest: async (projectType: string, features: string[] = []): Promise<{
    success: boolean;
    suggestions: {
      required: string[];
      recommended: string[];
      optional: string[];
    };
  }> => {
    const response = await api.post('/api/dependencies/suggest', {
      project_type: projectType,
      features,
    });
    return response.data;
  },
};

export const terminalAPI = {
  // Execute a command (synchronous, waits for completion)
  execute: async (
    command: string,
    projectId: string,
    timeout: number = 300
  ): Promise<{
    success: boolean;
    id: string;
    command: string;
    status: string;
    exit_code: number | null;
    output: string[];
    error: string | null;
  }> => {
    const response = await api.post('/api/terminal/execute', {
      command,
      project_id: projectId,
      timeout,
    });
    return response.data;
  },

  // Stream command output (returns EventSource URL)
  getStreamUrl: (command: string, projectId: string): string => {
    const params = new URLSearchParams({
      command,
      project_id: projectId,
    });
    return `${api.defaults.baseURL}/api/terminal/stream?${params}`;
  },

  // Cancel a running command
  cancel: async (commandId: string): Promise<{ success: boolean }> => {
    const response = await api.post(`/api/terminal/cancel/${commandId}`);
    return response.data;
  },

  // Get npm scripts for a project
  getScripts: async (projectId: string): Promise<{
    success: boolean;
    scripts: Record<string, string>;
    script_count: number;
  }> => {
    const response = await api.get(`/api/terminal/scripts/${projectId}`);
    return response.data;
  },

  // Run an npm script
  runScript: async (
    scriptName: string,
    projectId: string
  ): Promise<{
    success: boolean;
    id: string;
    script: string;
    status: string;
    exit_code: number | null;
    output: string[];
    error: string | null;
  }> => {
    const response = await api.post('/api/terminal/scripts/run', {
      script_name: scriptName,
      project_id: projectId,
    });
    return response.data;
  },

  // Get command suggestions for a project
  getSuggestions: async (projectId: string): Promise<{
    success: boolean;
    commands: Array<{ command: string; description: string }>;
  }> => {
    const response = await api.get(`/api/terminal/suggestions/${projectId}`);
    return response.data;
  },

  // Validate if a command is safe
  validate: async (command: string): Promise<{
    safe: boolean;
    reason: string;
  }> => {
    const response = await api.get('/api/terminal/validate', {
      params: { command },
    });
    return response.data;
  },
};

export const exportAPI = {
  // Download project as ZIP (returns blob URL)
  downloadZip: async (
    files: Record<string, string>,
    projectName: string
  ): Promise<string> => {
    const response = await api.post('/api/export/download', {
      files,
      project_name: projectName,
      include_readme: true,
    }, {
      responseType: 'blob',
    });

    // Create blob URL for download
    const blob = new Blob([response.data], { type: 'application/zip' });
    return URL.createObjectURL(blob);
  },

  // Download existing project by ID
  downloadProject: async (projectId: string): Promise<string> => {
    const response = await api.get(`/api/export/download/${projectId}`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/zip' });
    return URL.createObjectURL(blob);
  },

  // Export to GitHub
  exportToGitHub: async (
    projectId: string,
    repoName: string,
    githubToken: string,
    description?: string,
    isPrivate?: boolean
  ): Promise<{
    success: boolean;
    message: string;
    repo_url: string | null;
  }> => {
    const response = await api.post('/api/export/github', {
      project_id: projectId,
      repo_name: repoName,
      github_token: githubToken,
      description: description || '',
      private: isPrivate || false,
    });
    return response.data;
  },

  // Get project stats
  getStats: async (projectId: string): Promise<{
    success: boolean;
    total_files: number;
    total_lines: number;
    total_size_bytes: number;
    file_types: Record<string, number>;
    largest_file: string | null;
    largest_file_size: number;
  }> => {
    const response = await api.get(`/api/export/stats/${projectId}`);
    return response.data;
  },
};

export const gitAPI = {
  // Initialize git repository
  init: async (projectId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/git/${projectId}/init`);
    return response.data;
  },

  // Get git status
  getStatus: async (projectId: string): Promise<{
    success: boolean;
    is_repo: boolean;
    branch?: string;
    staged: Array<{ path: string; status: string }>;
    unstaged: Array<{ path: string; status: string }>;
    untracked: string[];
    has_changes: boolean;
  }> => {
    const response = await api.get(`/api/git/${projectId}/status`);
    return response.data;
  },

  // Stage files
  addFiles: async (
    projectId: string,
    files?: string[]
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/git/${projectId}/add`, { files });
    return response.data;
  },

  // Create commit
  commit: async (
    projectId: string,
    message: string,
    addAll: boolean = true
  ): Promise<{
    success: boolean;
    message: string;
    commit_hash?: string;
  }> => {
    const response = await api.post(`/api/git/${projectId}/commit`, {
      message,
      add_all: addAll,
    });
    return response.data;
  },

  // Get commit log
  getLog: async (projectId: string, limit: number = 50): Promise<{
    success: boolean;
    commits: Array<{
      hash: string;
      short_hash: string;
      message: string;
      author: string;
      date: string;
    }>;
    count: number;
  }> => {
    const response = await api.get(`/api/git/${projectId}/log`, {
      params: { limit },
    });
    return response.data;
  },

  // Get branches
  getBranches: async (projectId: string): Promise<{
    success: boolean;
    current_branch: string | null;
    branches: Array<{ name: string; is_current: boolean }>;
    count: number;
  }> => {
    const response = await api.get(`/api/git/${projectId}/branches`);
    return response.data;
  },

  // Create branch
  createBranch: async (
    projectId: string,
    branchName: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/git/${projectId}/branches`, {
      branch_name: branchName,
    });
    return response.data;
  },

  // Checkout branch
  checkoutBranch: async (
    projectId: string,
    branchName: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/git/${projectId}/checkout`, {
      branch_name: branchName,
    });
    return response.data;
  },

  // Get diff
  getDiff: async (
    projectId: string,
    staged: boolean = false,
    commit?: string
  ): Promise<{
    success: boolean;
    diffs: Array<{
      path: string;
      status: string;
      additions: number;
      deletions: number;
      diff_content: string;
    }>;
    count: number;
  }> => {
    const response = await api.get(`/api/git/${projectId}/diff`, {
      params: { staged, commit },
    });
    return response.data;
  },

  // Discard changes
  discardChanges: async (
    projectId: string,
    files?: string[]
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/api/git/${projectId}/discard`, { files });
    return response.data;
  },
};

export const projectsAPI = {
  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await api.post<Project>('/api/projects', data);
    return response.data;
  },

  list: async (): Promise<Project[]> => {
    const response = await api.get<Project[]>('/api/projects');
    return response.data;
  },

  get: async (id: string): Promise<Project> => {
    const response = await api.get<Project>(`/api/projects/${id}`);
    return response.data;
  },

  getFiles: async (id: string): Promise<{ files: ProjectFile[] }> => {
    const response = await api.get<{ files: ProjectFile[] }>(
      `/api/projects/${id}/files`
    );
    return response.data;
  },

  getFile: async (id: string, filePath: string): Promise<ProjectFile> => {
    const response = await api.get<ProjectFile>(
      `/api/projects/${id}/files/${filePath}`
    );
    return response.data;
  },

  getStructure: async (id: string): Promise<{ structure: string; files: string[] }> => {
    const response = await api.get<{ structure: string; files: string[] }>(
      `/api/projects/${id}/structure`
    );
    return response.data;
  },

  export: async (id: string): Promise<Blob> => {
    const response = await api.post(
      `/api/projects/${id}/export`,
      {},
      { responseType: 'blob' }
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/projects/${id}`);
  },
};

export const integrationAPI = {
  // Framework to Tasks
  createTasksFromFramework: async (projectId: string, userId: string, userName: string) => {
    const response = await api.post(
      `/api/integration/${projectId}/framework-to-tasks?user_id=${userId}&user_name=${userName}`
    );
    return response.data;
  },

  // GitHub Linking
  linkProjectToGithub: async (projectId: string, owner: string, repo: string) => {
    const response = await api.post(`/api/integration/${projectId}/link-github`, { owner, repo });
    return response.data;
  },

  getGithubLink: async (projectId: string) => {
    const response = await api.get(`/api/integration/${projectId}/github-link`);
    return response.data;
  },

  // GitHub Sync
  syncGithubIssuesToTasks: async (projectId: string, userId: string, userName: string) => {
    const response = await api.post(
      `/api/integration/${projectId}/sync-github-issues?user_id=${userId}&user_name=${userName}`
    );
    return response.data;
  },

  createGithubIssueFromTask: async (projectId: string, taskId: string, userId: string) => {
    const response = await api.post(
      `/api/integration/${projectId}/tasks/${taskId}/create-github-issue?user_id=${userId}`
    );
    return response.data;
  },

  syncTaskStatusToGithub: async (projectId: string, taskId: string, userId: string) => {
    const response = await api.post(
      `/api/integration/${projectId}/tasks/${taskId}/sync-to-github?user_id=${userId}`
    );
    return response.data;
  },

  // Dashboard
  getProjectDashboard: async (projectId: string, userId: string) => {
    const response = await api.get(`/api/integration/${projectId}/dashboard?user_id=${userId}`);
    return response.data;
  },

  // Notifications
  notifyTaskAssigned: async (projectId: string, taskId: string, assigneeId: string, assignerId: string, assignerName: string) => {
    const response = await api.post(`/api/integration/${projectId}/notify/task-assigned`, {
      task_id: taskId,
      assignee_id: assigneeId,
      assigner_id: assignerId,
      assigner_name: assignerName
    });
    return response.data;
  },

  notifyTaskCompleted: async (projectId: string, taskId: string, completerId: string, completerName: string) => {
    const response = await api.post(`/api/integration/${projectId}/notify/task-completed`, {
      task_id: taskId,
      completer_id: completerId,
      completer_name: completerName
    });
    return response.data;
  },

  notifySprintStarted: async (projectId: string, sprintId: string, starterId: string, starterName: string) => {
    const response = await api.post(`/api/integration/${projectId}/notify/sprint-started`, {
      sprint_id: sprintId,
      starter_id: starterId,
      starter_name: starterName
    });
    return response.data;
  },
};

export const githubAPI = {
  // Auth
  setToken: async (userId: string, token: string) => {
    const response = await api.post(`/api/github/auth/token?user_id=${userId}`, { token });
    return response.data;
  },

  validateToken: async (userId: string) => {
    const response = await api.get(`/api/github/auth/validate?user_id=${userId}`);
    return response.data;
  },

  getAuthenticatedUser: async (userId: string) => {
    const response = await api.get(`/api/github/user?user_id=${userId}`);
    return response.data;
  },

  // Repositories
  listRepos: async (userId: string, options?: { visibility?: string; sort?: string; per_page?: number }) => {
    const response = await api.get(`/api/github/repos`, { params: { user_id: userId, ...options } });
    return response.data;
  },

  getRepo: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}?user_id=${userId}`);
    return response.data;
  },

  createRepo: async (userId: string, data: { name: string; description?: string; private?: boolean; auto_init?: boolean }) => {
    const response = await api.post(`/api/github/repos?user_id=${userId}`, data);
    return response.data;
  },

  deleteRepo: async (userId: string, owner: string, repo: string) => {
    const response = await api.delete(`/api/github/repos/${owner}/${repo}?user_id=${userId}`);
    return response.data;
  },

  forkRepo: async (userId: string, owner: string, repo: string, options?: { organization?: string; name?: string }) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/fork?user_id=${userId}`, options || {});
    return response.data;
  },

  searchRepos: async (userId: string, query: string, options?: { sort?: string; order?: string }) => {
    const response = await api.get(`/api/github/repos/search`, { params: { user_id: userId, query, ...options } });
    return response.data;
  },

  // Branches
  listBranches: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/branches?user_id=${userId}`);
    return response.data;
  },

  getBranch: async (userId: string, owner: string, repo: string, branch: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/branches/${branch}?user_id=${userId}`);
    return response.data;
  },

  createBranch: async (userId: string, owner: string, repo: string, branchName: string, fromBranch?: string) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/branches?user_id=${userId}`, {
      branch_name: branchName,
      from_branch: fromBranch || 'main'
    });
    return response.data;
  },

  deleteBranch: async (userId: string, owner: string, repo: string, branch: string) => {
    const response = await api.delete(`/api/github/repos/${owner}/${repo}/branches/${branch}?user_id=${userId}`);
    return response.data;
  },

  mergeBranches: async (userId: string, owner: string, repo: string, base: string, head: string, message?: string) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/merge?user_id=${userId}`, {
      base, head, commit_message: message
    });
    return response.data;
  },

  // Commits
  listCommits: async (userId: string, owner: string, repo: string, branch?: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/commits`, {
      params: { user_id: userId, branch }
    });
    return response.data;
  },

  getCommit: async (userId: string, owner: string, repo: string, ref: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/commits/${ref}?user_id=${userId}`);
    return response.data;
  },

  // Pull Requests
  listPullRequests: async (userId: string, owner: string, repo: string, state?: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/pulls`, {
      params: { user_id: userId, state: state || 'open' }
    });
    return response.data;
  },

  getPullRequest: async (userId: string, owner: string, repo: string, pullNumber: number) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/pulls/${pullNumber}?user_id=${userId}`);
    return response.data;
  },

  createPullRequest: async (userId: string, owner: string, repo: string, data: {
    title: string; head: string; base: string; body?: string; draft?: boolean
  }) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/pulls?user_id=${userId}`, data);
    return response.data;
  },

  updatePullRequest: async (userId: string, owner: string, repo: string, pullNumber: number, data: {
    title?: string; body?: string; state?: string
  }) => {
    const response = await api.patch(`/api/github/repos/${owner}/${repo}/pulls/${pullNumber}?user_id=${userId}`, data);
    return response.data;
  },

  mergePullRequest: async (userId: string, owner: string, repo: string, pullNumber: number, options?: {
    commit_title?: string; commit_message?: string; merge_method?: string
  }) => {
    const response = await api.put(`/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/merge?user_id=${userId}`, options || {});
    return response.data;
  },

  listPRFiles: async (userId: string, owner: string, repo: string, pullNumber: number) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/files?user_id=${userId}`);
    return response.data;
  },

  createPRReview: async (userId: string, owner: string, repo: string, pullNumber: number, body: string, event: string) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/reviews?user_id=${userId}`, {
      body, event
    });
    return response.data;
  },

  // Issues
  listIssues: async (userId: string, owner: string, repo: string, options?: { state?: string; labels?: string }) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/issues`, {
      params: { user_id: userId, ...options }
    });
    return response.data;
  },

  getIssue: async (userId: string, owner: string, repo: string, issueNumber: number) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/issues/${issueNumber}?user_id=${userId}`);
    return response.data;
  },

  createIssue: async (userId: string, owner: string, repo: string, data: {
    title: string; body?: string; labels?: string[]; assignees?: string[]
  }) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/issues?user_id=${userId}`, data);
    return response.data;
  },

  updateIssue: async (userId: string, owner: string, repo: string, issueNumber: number, data: {
    title?: string; body?: string; state?: string; labels?: string[]
  }) => {
    const response = await api.patch(`/api/github/repos/${owner}/${repo}/issues/${issueNumber}?user_id=${userId}`, data);
    return response.data;
  },

  addIssueComment: async (userId: string, owner: string, repo: string, issueNumber: number, body: string) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/issues/${issueNumber}/comments?user_id=${userId}`, { body });
    return response.data;
  },

  // GitHub Actions
  listWorkflows: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/actions/workflows?user_id=${userId}`);
    return response.data;
  },

  triggerWorkflow: async (userId: string, owner: string, repo: string, workflowId: string, ref: string, inputs?: Record<string, string>) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches?user_id=${userId}`, {
      ref, inputs
    });
    return response.data;
  },

  listWorkflowRuns: async (userId: string, owner: string, repo: string, options?: { workflow_id?: string; status?: string }) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/actions/runs`, {
      params: { user_id: userId, ...options }
    });
    return response.data;
  },

  getWorkflowRun: async (userId: string, owner: string, repo: string, runId: number) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/actions/runs/${runId}?user_id=${userId}`);
    return response.data;
  },

  cancelWorkflowRun: async (userId: string, owner: string, repo: string, runId: number) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/actions/runs/${runId}/cancel?user_id=${userId}`);
    return response.data;
  },

  rerunWorkflow: async (userId: string, owner: string, repo: string, runId: number) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/actions/runs/${runId}/rerun?user_id=${userId}`);
    return response.data;
  },

  // Releases
  listReleases: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/releases?user_id=${userId}`);
    return response.data;
  },

  getLatestRelease: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/releases/latest?user_id=${userId}`);
    return response.data;
  },

  createRelease: async (userId: string, owner: string, repo: string, data: {
    tag_name: string; name: string; body?: string; draft?: boolean; prerelease?: boolean
  }) => {
    const response = await api.post(`/api/github/repos/${owner}/${repo}/releases?user_id=${userId}`, data);
    return response.data;
  },

  // Collaborators
  listCollaborators: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/collaborators?user_id=${userId}`);
    return response.data;
  },

  addCollaborator: async (userId: string, owner: string, repo: string, username: string, permission?: string) => {
    const response = await api.put(`/api/github/repos/${owner}/${repo}/collaborators/${username}?user_id=${userId}`, {
      permission: permission || 'push'
    });
    return response.data;
  },

  removeCollaborator: async (userId: string, owner: string, repo: string, username: string) => {
    const response = await api.delete(`/api/github/repos/${owner}/${repo}/collaborators/${username}?user_id=${userId}`);
    return response.data;
  },

  // Stats
  getLanguages: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/languages?user_id=${userId}`);
    return response.data;
  },

  getContributorsStats: async (userId: string, owner: string, repo: string) => {
    const response = await api.get(`/api/github/repos/${owner}/${repo}/stats/contributors?user_id=${userId}`);
    return response.data;
  },

  // Notifications
  listNotifications: async (userId: string, all?: boolean) => {
    const response = await api.get(`/api/github/notifications`, {
      params: { user_id: userId, all_notifications: all }
    });
    return response.data;
  },

  markNotificationsRead: async (userId: string) => {
    const response = await api.put(`/api/github/notifications/read?user_id=${userId}`);
    return response.data;
  },

  // Gists
  listGists: async (userId: string) => {
    const response = await api.get(`/api/github/gists?user_id=${userId}`);
    return response.data;
  },

  createGist: async (userId: string, files: Record<string, { content: string }>, description?: string, isPublic?: boolean) => {
    const response = await api.post(`/api/github/gists?user_id=${userId}`, {
      files, description, public: isPublic
    });
    return response.data;
  },
};

export const projectManagementAPI = {
  // Tasks
  createTask: async (projectId: string, taskData: {
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    assignee_id?: string;
    sprint_id?: string;
    story_points?: number;
    due_date?: string;
  }, reporterId: string, reporterName: string) => {
    const response = await api.post(`/api/pm/${projectId}/tasks`, taskData, {
      params: { reporter_id: reporterId, reporter_name: reporterName }
    });
    return response.data;
  },

  getTasks: async (projectId: string, filters?: {
    status?: string;
    assignee_id?: string;
    sprint_id?: string;
    priority?: string;
  }) => {
    const response = await api.get(`/api/pm/${projectId}/tasks`, { params: filters });
    return response.data;
  },

  getTask: async (projectId: string, taskId: string) => {
    const response = await api.get(`/api/pm/${projectId}/tasks/${taskId}`);
    return response.data;
  },

  updateTask: async (projectId: string, taskId: string, updates: Record<string, unknown>, userId: string, userName: string) => {
    const response = await api.patch(`/api/pm/${projectId}/tasks/${taskId}`, updates, {
      params: { user_id: userId, user_name: userName }
    });
    return response.data;
  },

  moveTask: async (projectId: string, taskId: string, newStatus: string, newOrder: number, userId: string, userName: string) => {
    const response = await api.post(`/api/pm/${projectId}/tasks/${taskId}/move`, null, {
      params: { new_status: newStatus, new_order: newOrder, user_id: userId, user_name: userName }
    });
    return response.data;
  },

  deleteTask: async (projectId: string, taskId: string, userId: string, userName: string) => {
    const response = await api.delete(`/api/pm/${projectId}/tasks/${taskId}`, {
      params: { user_id: userId, user_name: userName }
    });
    return response.data;
  },

  // Kanban Board
  getKanbanBoard: async (projectId: string, sprintId?: string) => {
    const response = await api.get(`/api/pm/${projectId}/board`, { params: { sprint_id: sprintId } });
    return response.data;
  },

  // Comments
  addComment: async (projectId: string, taskId: string, content: string, userId: string, userName: string) => {
    const response = await api.post(`/api/pm/${projectId}/tasks/${taskId}/comments`, null, {
      params: { content, user_id: userId, user_name: userName }
    });
    return response.data;
  },

  getComments: async (projectId: string, taskId: string) => {
    const response = await api.get(`/api/pm/${projectId}/tasks/${taskId}/comments`);
    return response.data;
  },

  // Checklist
  addChecklistItem: async (projectId: string, taskId: string, text: string) => {
    const response = await api.post(`/api/pm/${projectId}/tasks/${taskId}/checklist`, null, {
      params: { text }
    });
    return response.data;
  },

  toggleChecklistItem: async (projectId: string, taskId: string, itemId: string, userId: string) => {
    const response = await api.post(`/api/pm/${projectId}/tasks/${taskId}/checklist/${itemId}/toggle`, null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Sprints
  createSprint: async (projectId: string, sprintData: {
    name: string;
    goal?: string;
    start_date: string;
    end_date: string;
    capacity_points?: number;
  }, userId: string, userName: string) => {
    const response = await api.post(`/api/pm/${projectId}/sprints`, sprintData, {
      params: { user_id: userId, user_name: userName }
    });
    return response.data;
  },

  getSprints: async (projectId: string, status?: string) => {
    const response = await api.get(`/api/pm/${projectId}/sprints`, { params: { status } });
    return response.data;
  },

  getActiveSprint: async (projectId: string) => {
    const response = await api.get(`/api/pm/${projectId}/sprints/active`);
    return response.data;
  },

  startSprint: async (projectId: string, sprintId: string, userId: string, userName: string) => {
    const response = await api.post(`/api/pm/${projectId}/sprints/${sprintId}/start`, null, {
      params: { user_id: userId, user_name: userName }
    });
    return response.data;
  },

  completeSprint: async (projectId: string, sprintId: string, userId: string, userName: string, moveIncompleteTo?: string) => {
    const response = await api.post(`/api/pm/${projectId}/sprints/${sprintId}/complete`, null, {
      params: { user_id: userId, user_name: userName, move_incomplete_to: moveIncompleteTo }
    });
    return response.data;
  },

  // Milestones
  createMilestone: async (projectId: string, data: {
    name: string;
    description?: string;
    target_date: string;
    version?: string;
  }, userId: string, userName: string) => {
    const response = await api.post(`/api/pm/${projectId}/milestones`, data, {
      params: { user_id: userId, user_name: userName }
    });
    return response.data;
  },

  getMilestones: async (projectId: string) => {
    const response = await api.get(`/api/pm/${projectId}/milestones`);
    return response.data;
  },

  // Analytics
  getAnalytics: async (projectId: string) => {
    const response = await api.get(`/api/pm/${projectId}/analytics`);
    return response.data;
  },

  getBurndownData: async (projectId: string, sprintId: string) => {
    const response = await api.get(`/api/pm/${projectId}/sprints/${sprintId}/burndown`);
    return response.data;
  },

  // Activities
  getActivities: async (projectId: string, limit?: number, entityType?: string) => {
    const response = await api.get(`/api/pm/${projectId}/activities`, {
      params: { limit, entity_type: entityType }
    });
    return response.data;
  },
};

export const teamAPI = {
  // Team Members
  addMember: async (projectId: string, data: {
    user_id: string;
    username: string;
    email: string;
    role?: string;
    full_name?: string;
  }) => {
    const response = await api.post(`/api/team/${projectId}/members`, null, { params: data });
    return response.data;
  },

  getMembers: async (projectId: string) => {
    const response = await api.get(`/api/team/${projectId}/members`);
    return response.data;
  },

  getMember: async (projectId: string, userId: string) => {
    const response = await api.get(`/api/team/${projectId}/members/${userId}`);
    return response.data;
  },

  updateMemberRole: async (projectId: string, userId: string, newRole: string, updatedBy: string) => {
    const response = await api.patch(`/api/team/${projectId}/members/${userId}/role`, null, {
      params: { new_role: newRole, updated_by: updatedBy }
    });
    return response.data;
  },

  removeMember: async (projectId: string, userId: string, removedBy: string) => {
    const response = await api.delete(`/api/team/${projectId}/members/${userId}`, {
      params: { removed_by: removedBy }
    });
    return response.data;
  },

  // Invites
  createInvite: async (projectId: string, email: string, role: string, invitedBy: string) => {
    const response = await api.post(`/api/team/${projectId}/invites`, null, {
      params: { email, role, invited_by: invitedBy }
    });
    return response.data;
  },

  getPendingInvites: async (projectId: string) => {
    const response = await api.get(`/api/team/${projectId}/invites`);
    return response.data;
  },

  acceptInvite: async (inviteId: string, userId: string, username: string, email: string, fullName?: string) => {
    const response = await api.post(`/api/team/invites/${inviteId}/accept`, null, {
      params: { user_id: userId, username, email, full_name: fullName }
    });
    return response.data;
  },

  // Channels
  createChannel: async (projectId: string, name: string, createdBy: string, description?: string, isPrivate?: boolean) => {
    const response = await api.post(`/api/team/${projectId}/channels`, null, {
      params: { name, created_by: createdBy, description, is_private: isPrivate }
    });
    return response.data;
  },

  createDirectChannel: async (projectId: string, user1Id: string, user2Id: string) => {
    const response = await api.post(`/api/team/${projectId}/channels/dm`, null, {
      params: { user1_id: user1Id, user2_id: user2Id }
    });
    return response.data;
  },

  getChannels: async (projectId: string, userId: string) => {
    const response = await api.get(`/api/team/${projectId}/channels`, { params: { user_id: userId } });
    return response.data;
  },

  // Messages
  sendMessage: async (projectId: string, channelId: string, content: string, userId: string, userName: string, options?: {
    messageType?: string;
    threadId?: string;
  }) => {
    const response = await api.post(`/api/team/${projectId}/channels/${channelId}/messages`, null, {
      params: { content, user_id: userId, user_name: userName, ...options }
    });
    return response.data;
  },

  getMessages: async (projectId: string, channelId: string, limit?: number, threadId?: string) => {
    const response = await api.get(`/api/team/${projectId}/channels/${channelId}/messages`, {
      params: { limit, thread_id: threadId }
    });
    return response.data;
  },

  editMessage: async (projectId: string, channelId: string, messageId: string, content: string, userId: string) => {
    const response = await api.patch(`/api/team/${projectId}/channels/${channelId}/messages/${messageId}`, null, {
      params: { content, user_id: userId }
    });
    return response.data;
  },

  deleteMessage: async (projectId: string, channelId: string, messageId: string, userId: string) => {
    const response = await api.delete(`/api/team/${projectId}/channels/${channelId}/messages/${messageId}`, {
      params: { user_id: userId }
    });
    return response.data;
  },

  addReaction: async (projectId: string, channelId: string, messageId: string, emoji: string, userId: string) => {
    const response = await api.post(`/api/team/${projectId}/channels/${channelId}/messages/${messageId}/reactions`, null, {
      params: { emoji, user_id: userId }
    });
    return response.data;
  },

  // Typing
  setTyping: async (projectId: string, channelId: string, userId: string) => {
    const response = await api.post(`/api/team/${projectId}/channels/${channelId}/typing`, null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  getTypingUsers: async (projectId: string, channelId: string) => {
    const response = await api.get(`/api/team/${projectId}/channels/${channelId}/typing`);
    return response.data;
  },

  // Notifications
  getNotifications: async (userId: string, limit?: number, unreadOnly?: boolean) => {
    const response = await api.get('/api/team/notifications', {
      params: { user_id: userId, limit, unread_only: unreadOnly }
    });
    return response.data;
  },

  getUnreadCount: async (userId: string) => {
    const response = await api.get('/api/team/notifications/unread-count', {
      params: { user_id: userId }
    });
    return response.data;
  },

  markNotificationRead: async (notificationId: string, userId: string) => {
    const response = await api.post(`/api/team/notifications/${notificationId}/read`, null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  markAllNotificationsRead: async (userId: string) => {
    const response = await api.post('/api/team/notifications/read-all', null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  // Presence
  setOnline: async (projectId: string, userId: string) => {
    const response = await api.post(`/api/team/${projectId}/presence/online`, null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  setOffline: async (projectId: string, userId: string) => {
    const response = await api.post(`/api/team/${projectId}/presence/offline`, null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  getOnlineUsers: async (projectId: string) => {
    const response = await api.get(`/api/team/${projectId}/presence`);
    return response.data;
  },
};

export const frameworkAPI = {
  // Initialize the MIT 24-Step framework for a project
  initialize: async (projectId: string, idea: string): Promise<{
    success: boolean;
    project_id: string;
    current_step: number;
    current_phase: string;
    step_details: any;
    message: string;
  }> => {
    const response = await api.post(`/api/framework/initialize/${projectId}`, {
      description: idea,
    });
    return response.data;
  },

  // Get framework session
  getSession: async (projectId: string): Promise<{
    session: any;
    progress: any;
  }> => {
    const response = await api.get(`/api/framework/session/${projectId}`);
    return response.data;
  },

  // Get current step
  getCurrentStep: async (projectId: string): Promise<{
    step: any;
    progress: any;
  }> => {
    const response = await api.get(`/api/framework/step/${projectId}`);
    return response.data;
  },

  // Get specific step details
  getStepDetails: async (projectId: string, stepNumber: number): Promise<{
    step: any;
  }> => {
    const response = await api.get(`/api/framework/step/${projectId}/${stepNumber}`);
    return response.data;
  },

  // Complete a step
  completeStep: async (
    projectId: string,
    stepNumber: number,
    userResponses: Record<string, any>,
    aiAnalysis: string
  ): Promise<{
    success: boolean;
    completed_step: number;
    next_step?: any;
    framework_completed?: boolean;
    summary?: any;
    progress: any;
    message?: string;
  }> => {
    const response = await api.post(`/api/framework/step/${projectId}/complete`, {
      project_id: projectId,
      step_number: stepNumber,
      user_responses: userResponses,
      ai_analysis: aiAnalysis,
    });
    return response.data;
  },

  // Skip a step
  skipStep: async (projectId: string, stepNumber: number): Promise<{
    success: boolean;
    skipped_step: number;
    next_step: any;
    progress: any;
  }> => {
    const response = await api.post(`/api/framework/step/${projectId}/skip/${stepNumber}`);
    return response.data;
  },

  // Get progress
  getProgress: async (projectId: string): Promise<{
    current_step: number;
    current_phase: string;
    completed_steps: number;
    total_steps: number;
    progress_percentage: number;
    ready_for_development: boolean;
    phases_completed: Record<string, boolean>;
  }> => {
    const response = await api.get(`/api/framework/progress/${projectId}`);
    return response.data;
  },

  // Check if ready for development
  canDevelop: async (projectId: string): Promise<{
    can_start: boolean;
    reason: string;
    missing_steps?: string[];
    recommendation?: string;
  }> => {
    const response = await api.get(`/api/framework/can-develop/${projectId}`);
    return response.data;
  },

  // Get framework summary
  getSummary: async (projectId: string): Promise<any> => {
    const response = await api.get(`/api/framework/summary/${projectId}`);
    return response.data;
  },

  // Export framework document
  exportDocument: async (projectId: string): Promise<{ document: string }> => {
    const response = await api.get(`/api/framework/export/${projectId}`);
    return response.data;
  },

  // Get all 24 steps
  getAllSteps: async (): Promise<{ steps: any[] }> => {
    const response = await api.get('/api/framework/steps');
    return response.data;
  },

  // Chat during framework analysis (non-streaming)
  chat: async (
    projectId: string,
    message: string,
    aiProvider: 'claude' | 'grok' = 'claude',
    conversationHistory: Array<{ role: string; content: string }> = [],
    idea?: string
  ): Promise<{
    message: string;
    framework_step: number | null;
    framework_phase: string | null;
    step_name: string | null;
    progress: any;
    suggestions: string[];
  }> => {
    const response = await api.post(`/api/framework/chat/${projectId}`, {
      message,
      ai_provider: aiProvider,
      conversation_history: conversationHistory,
      idea,
    });
    return response.data;
  },

  // Get streaming chat URL for framework
  getStreamUrl: (projectId: string): string => {
    return `${api.defaults.baseURL}/api/framework/chat/${projectId}/stream`;
  },
};

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/api/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/api/auth/reset-password', { token, password });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/api/auth/verify-email', { token });
    return response.data;
  },

  getMe: async (): Promise<AuthResponse['user']> => {
    const response = await api.get<AuthResponse['user']>('/api/auth/me');
    return response.data;
  },

  post: async (url: string, data?: any) => {
    return api.post(url, data);
  },

  get: async (url: string) => {
    return api.get(url);
  },

  delete: async (url: string) => {
    return api.delete(url);
  },
};

export default api;
