import axios from 'axios';
import type {
  ChatRequest,
  ChatResponse,
  Project,
  ProjectCreate,
  ProjectFile,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;
