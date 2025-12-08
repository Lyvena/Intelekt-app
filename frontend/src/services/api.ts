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

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
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

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
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
