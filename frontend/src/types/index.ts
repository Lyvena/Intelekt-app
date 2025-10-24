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
