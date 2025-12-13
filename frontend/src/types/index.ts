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
  email_verified: boolean;
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
  login: (token: string, user: User) => void;
  logout: () => void | Promise<void>;
  refreshUser: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// MIT 24-Step Framework Types
export type FrameworkPhase = 'customer' | 'value' | 'acquisition' | 'monetization' | 'building' | 'scaling';
export type StepStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';
export type ProjectPhase = 'ideation' | 'development';

export interface FrameworkStep {
  number: number;
  name: string;
  phase: FrameworkPhase;
  description: string;
  key_questions: string[];
  deliverables: string[];
  status: StepStatus;
  user_responses: Record<string, string>;
  ai_analysis: string | null;
  completed_at: string | null;
}

export interface FrameworkProgress {
  current_step: number;
  current_phase: string;
  completed_steps: number;
  total_steps: number;
  progress_percentage: number;
  ready_for_development: boolean;
  phases_completed: Record<string, boolean>;
}

export interface FrameworkSession {
  project_id: string;
  idea_description: string;
  current_step: number;
  current_phase: FrameworkPhase;
  steps: Record<string, FrameworkStep>;
  framework_summary: FrameworkSummary | null;
  ready_for_development: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrameworkSummary {
  idea: string;
  beachhead_market: string;
  persona: string;
  value_proposition: string;
  business_model: string;
  mvp_specification: string;
  product_plan: string;
  key_insights: string[];
  ready_for_development: boolean;
}
