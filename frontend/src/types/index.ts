export type AIProvider = 'claude' | 'grok';

export type TechStack = 'mojo' | 'python' | 'javascript';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatRequest {
  message: string;
  project_id?: string;
  ai_provider: AIProvider;
  tech_stack?: TechStack;
  conversation_history: ChatMessage[];
}

export interface ChatResponse {
  message: string;
  code_generated?: string;
  file_path?: string;
  project_id?: string;
  suggestions: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tech_stack: TechStack;
  ai_provider: AIProvider;
  created_at: string;
  updated_at: string;
  files: string[];
  status: 'active' | 'completed' | 'archived';
}

export interface ProjectCreate {
  name: string;
  description: string;
  tech_stack: TechStack;
  ai_provider: AIProvider;
}

export interface ProjectFile {
  path: string;
  content: string;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  getToken: () => Promise<string | null>;
  logout: () => void | Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}
