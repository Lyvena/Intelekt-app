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
