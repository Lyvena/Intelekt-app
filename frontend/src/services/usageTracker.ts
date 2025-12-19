// Usage Tracker Service - Track AI token usage and costs per project

// Token pricing (per 1M tokens) - approximate rates
const PRICING: Record<string, { input: number; output: number }> = {
  claude: { input: 3.00, output: 15.00 },      // Claude 3.5 Sonnet
  grok: { input: 5.00, output: 15.00 },        // Grok approximate
  openai: { input: 5.00, output: 15.00 },      // GPT-4 approximate
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface AIInteraction {
  id: string;
  projectId: string;
  timestamp: number;
  type: 'chat' | 'code_generation' | 'error_fix' | 'explanation' | 'debug';
  provider: string;
  model?: string;
  prompt: string;
  response: string;
  usage: TokenUsage;
  duration: number; // ms
  success: boolean;
  metadata?: {
    filesGenerated?: number;
    filesModified?: number;
    linesOfCode?: number;
  };
}

export interface ProjectUsage {
  projectId: string;
  totalInteractions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byProvider: Record<string, TokenUsage>;
  byType: Record<string, TokenUsage>;
  history: AIInteraction[];
}

type UsageListener = (usage: ProjectUsage) => void;

class UsageTrackerService {
  private projectUsage: Map<string, ProjectUsage> = new Map();
  private listeners: Map<string, Set<UsageListener>> = new Map();
  private storageKey = 'intelekt-usage-history';

  constructor() {
    this.loadFromStorage();
  }

  // Load usage data from localStorage
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        for (const [projectId, usage] of Object.entries(data)) {
          this.projectUsage.set(projectId, usage as ProjectUsage);
        }
      }
    } catch (e) {
      console.error('[UsageTracker] Failed to load from storage:', e);
    }
  }

  // Save usage data to localStorage
  private saveToStorage() {
    try {
      const data: Record<string, ProjectUsage> = {};
      for (const [projectId, usage] of this.projectUsage) {
        // Keep only last 100 interactions per project
        const trimmedUsage = {
          ...usage,
          history: usage.history.slice(-100),
        };
        data[projectId] = trimmedUsage;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.error('[UsageTracker] Failed to save to storage:', e);
    }
  }

  // Estimate tokens from text (rough approximation: ~4 chars per token)
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Calculate cost from tokens
  calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING[provider.toLowerCase()] || PRICING.claude;
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  // Track a new AI interaction
  trackInteraction(interaction: Omit<AIInteraction, 'id' | 'usage'> & { 
    inputTokens?: number;
    outputTokens?: number;
  }): AIInteraction {
    const inputTokens = interaction.inputTokens || this.estimateTokens(interaction.prompt);
    const outputTokens = interaction.outputTokens || this.estimateTokens(interaction.response);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(interaction.provider, inputTokens, outputTokens);

    const fullInteraction: AIInteraction = {
      ...interaction,
      id: `${interaction.projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCost,
      },
    };

    // Update project usage
    this.updateProjectUsage(fullInteraction);
    
    return fullInteraction;
  }

  // Update aggregated project usage
  private updateProjectUsage(interaction: AIInteraction) {
    const { projectId } = interaction;
    
    let usage = this.projectUsage.get(projectId);
    if (!usage) {
      usage = {
        projectId,
        totalInteractions: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        byProvider: {},
        byType: {},
        history: [],
      };
    }

    // Update totals
    usage.totalInteractions++;
    usage.totalInputTokens += interaction.usage.inputTokens;
    usage.totalOutputTokens += interaction.usage.outputTokens;
    usage.totalCost += interaction.usage.estimatedCost;

    // Update by provider
    const provider = interaction.provider.toLowerCase();
    if (!usage.byProvider[provider]) {
      usage.byProvider[provider] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 };
    }
    usage.byProvider[provider].inputTokens += interaction.usage.inputTokens;
    usage.byProvider[provider].outputTokens += interaction.usage.outputTokens;
    usage.byProvider[provider].totalTokens += interaction.usage.totalTokens;
    usage.byProvider[provider].estimatedCost += interaction.usage.estimatedCost;

    // Update by type
    if (!usage.byType[interaction.type]) {
      usage.byType[interaction.type] = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 };
    }
    usage.byType[interaction.type].inputTokens += interaction.usage.inputTokens;
    usage.byType[interaction.type].outputTokens += interaction.usage.outputTokens;
    usage.byType[interaction.type].totalTokens += interaction.usage.totalTokens;
    usage.byType[interaction.type].estimatedCost += interaction.usage.estimatedCost;

    // Add to history
    usage.history.push(interaction);

    this.projectUsage.set(projectId, usage);
    this.saveToStorage();
    this.notifyListeners(projectId, usage);
  }

  // Get usage for a project
  getProjectUsage(projectId: string): ProjectUsage | null {
    return this.projectUsage.get(projectId) || null;
  }

  // Get interaction history for a project
  getHistory(projectId: string, limit?: number): AIInteraction[] {
    const usage = this.projectUsage.get(projectId);
    if (!usage) return [];
    
    const history = [...usage.history].reverse(); // Most recent first
    return limit ? history.slice(0, limit) : history;
  }

  // Get total usage across all projects
  getTotalUsage(): TokenUsage {
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let estimatedCost = 0;

    for (const usage of this.projectUsage.values()) {
      inputTokens += usage.totalInputTokens;
      outputTokens += usage.totalOutputTokens;
      totalTokens += usage.totalInputTokens + usage.totalOutputTokens;
      estimatedCost += usage.totalCost;
    }

    return { inputTokens, outputTokens, totalTokens, estimatedCost };
  }

  // Clear usage for a project
  clearProjectUsage(projectId: string) {
    this.projectUsage.delete(projectId);
    this.saveToStorage();
    
    const listeners = this.listeners.get(projectId);
    if (listeners) {
      listeners.forEach(l => l({
        projectId,
        totalInteractions: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        byProvider: {},
        byType: {},
        history: [],
      }));
    }
  }

  // Subscribe to usage updates for a project
  subscribe(projectId: string, listener: UsageListener): () => void {
    if (!this.listeners.has(projectId)) {
      this.listeners.set(projectId, new Set());
    }
    this.listeners.get(projectId)!.add(listener);
    
    // Immediately notify with current data
    const usage = this.projectUsage.get(projectId);
    if (usage) {
      listener(usage);
    }

    return () => {
      this.listeners.get(projectId)?.delete(listener);
    };
  }

  private notifyListeners(projectId: string, usage: ProjectUsage) {
    const listeners = this.listeners.get(projectId);
    if (listeners) {
      listeners.forEach(listener => listener(usage));
    }
  }

  // Format cost for display
  formatCost(cost: number): string {
    if (cost < 0.01) {
      return `$${(cost * 100).toFixed(3)}¢`;
    }
    return `$${cost.toFixed(4)}`;
  }

  // Format tokens for display
  formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(2)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
  }
}

export const usageTracker = new UsageTrackerService();
