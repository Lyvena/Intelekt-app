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

// ==================== Analytics Types ====================

export interface AnalyticsEvent {
  event_type: string;
  event_category: string;
  event_action: string;
  user_id?: string;
  session_id?: string;
  event_label?: string;
  event_value?: number;
  properties?: Record<string, unknown>;
  page_url?: string;
}

export interface DashboardMetrics {
  period_days: number;
  total_sessions: number;
  avg_session_duration_minutes: number;
  events_by_category: Record<string, number>;
  daily_active_users: Array<{ date: string; users: number }>;
  ai_usage: Record<string, {
    requests: number;
    tokens: number;
    avg_response_time_ms: number;
    total_cost_usd: number;
  }>;
  top_features: Array<{ name: string; usage: number }>;
}

export interface RealtimeMetrics {
  active_sessions: number;
  recent_events: number;
  active_users: number;
  timestamp: string;
}

export interface UserAnalytics {
  user_id: string;
  metrics: {
    first_seen: string | null;
    last_seen: string | null;
    total_sessions: number;
    total_time_spent_minutes: number;
    engagement_score: number;
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    frameworks_started: number;
    frameworks_completed: number;
    total_chat_messages: number;
    total_code_generations: number;
    total_files_generated: number;
    preferred_tech_stack: string | null;
    favorite_ai_provider: string | null;
  };
  recent_activity: Array<{
    type: string;
    category: string;
    action: string;
    timestamp: string;
  }>;
  projects: Array<{
    project_id: string;
    framework_completed: boolean;
    chat_messages: number;
    code_generations: number;
    files_generated: number;
    last_activity: string | null;
  }>;
}

export interface ProjectAnalytics {
  project_id: string;
  framework: {
    started_at: string | null;
    completed_at: string | null;
    completion_time_minutes: number | null;
    steps_completed: number;
    steps_skipped: number;
    phase_times: Record<string, number> | null;
  };
  chat: {
    total_messages: number;
    ai_responses: number;
    avg_response_time_ms: number | null;
    tokens_used: number;
    claude_messages: number;
    grok_messages: number;
  };
  code_generation: {
    total_generations: number;
    files_generated: number;
    lines_generated: number;
    success_rate: number | null;
    languages_used: Record<string, number> | null;
  };
  engagement: {
    total_sessions: number;
    time_spent_minutes: number;
    last_activity: string | null;
    exports: number;
    deployments: number;
    github_pushes: number;
  };
  recent_events: Array<{
    type: string;
    category: string;
    action: string;
    timestamp: string;
  }>;
}

export interface FrameworkAnalytics {
  period_days: number;
  total_started: number;
  total_completed: number;
  completion_rate: number;
  avg_completion_time_minutes: number;
  avg_phase_times: Record<string, number>;
  steps_completion_distribution: Record<string, number>;
}

export interface AIProviderAnalytics {
  period_days: number;
  providers: Record<string, {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    avg_response_time_ms: number;
    success_rate: number;
  }>;
  daily_trend: Array<{
    date: string;
    provider: string;
    requests: number;
    tokens: number;
  }>;
}

export interface FunnelAnalytics {
  funnel_name: string;
  period_days: number;
  steps: Record<string, {
    order: number;
    started: number;
    completed: number;
    dropped: number;
    avg_time_seconds: number;
    completion_rate: number;
    conversion_from_previous: number;
  }>;
  overall_conversion: number;
}

export interface SessionInfo {
  session_id: string;
  user_id?: string;
  started_at: string;
}

export interface ProductAnalytics {
  window_days: number;
  framework: {
    ready_count: number;
    avg_time_to_ready_sec: number | null;
    first_export_count: number;
    avg_time_to_first_export_sec: number | null;
    step_completions: number;
    export_count: number;
  };
  preview: {
    starts: number;
    success: number;
    errors: number;
    success_rate: number | null;
    avg_duration_sec: number | null;
  };
}
