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
