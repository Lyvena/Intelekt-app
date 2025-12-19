// Security Service - Manages 2FA, API keys, sessions, and rate limits

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  method: '2fa_app' | 'email' | null;
  lastVerified: string | null;
}

export interface APIKey {
  id: string;
  provider: 'claude' | 'grok' | 'openai';
  name: string;
  maskedKey: string;
  createdAt: string;
  lastUsed: string | null;
  isActive: boolean;
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  createdAt: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface RateLimitInfo {
  plan: 'free' | 'pro' | 'enterprise';
  limits: {
    chatRequests: { used: number; limit: number; resetAt: string };
    codeGenerations: { used: number; limit: number; resetAt: string };
    apiCalls: { used: number; limit: number; resetAt: string };
  };
  features: {
    maxProjects: number;
    maxFilesPerProject: number;
    prioritySupport: boolean;
    customModels: boolean;
  };
}

type RateLimitListener = (info: RateLimitInfo) => void;

class SecurityService {
  private token: string | null = null;
  private rateLimitListeners: Set<RateLimitListener> = new Set();
  private cachedRateLimits: RateLimitInfo | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ============ 2FA Methods ============

  async get2FAStatus(): Promise<TwoFactorStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/2fa/status`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to get 2FA status');
      return response.json();
    } catch (error) {
      console.error('[Security] Failed to get 2FA status:', error);
      return { enabled: false, method: null, lastVerified: null };
    }
  }

  async setup2FA(): Promise<TwoFactorSetup> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/setup`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to setup 2FA');
    return response.json();
  }

  async verify2FA(code: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error('Invalid verification code');
    return response.json();
  }

  async disable2FA(code: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/disable`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error('Failed to disable 2FA');
    return response.json();
  }

  async regenerateBackupCodes(code: string): Promise<{ backupCodes: string[] }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/2fa/backup-codes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw new Error('Failed to regenerate backup codes');
    return response.json();
  }

  // ============ API Key Methods ============

  async getAPIKeys(): Promise<APIKey[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/api-keys`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to get API keys');
      return response.json();
    } catch (error) {
      console.error('[Security] Failed to get API keys:', error);
      return [];
    }
  }

  async addAPIKey(provider: 'claude' | 'grok' | 'openai', name: string, apiKey: string): Promise<APIKey> {
    const response = await fetch(`${API_BASE_URL}/api/auth/api-keys`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ provider, name, api_key: apiKey }),
    });
    if (!response.ok) throw new Error('Failed to add API key');
    return response.json();
  }

  async deleteAPIKey(keyId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete API key');
    return response.json();
  }

  async toggleAPIKey(keyId: string, isActive: boolean): Promise<APIKey> {
    const response = await fetch(`${API_BASE_URL}/api/auth/api-keys/${keyId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!response.ok) throw new Error('Failed to update API key');
    return response.json();
  }

  async testAPIKey(keyId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/api-keys/${keyId}/test`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  // ============ Session Methods ============

  async getSessions(): Promise<Session[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/sessions`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to get sessions');
      return response.json();
    } catch (error) {
      console.error('[Security] Failed to get sessions:', error);
      return [];
    }
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to revoke session');
    return response.json();
  }

  async revokeAllOtherSessions(): Promise<{ success: boolean; revokedCount: number }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/sessions/revoke-all`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to revoke sessions');
    return response.json();
  }

  // ============ Rate Limiting Methods ============

  async getRateLimits(): Promise<RateLimitInfo> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/rate-limits`, {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to get rate limits');
      const data = await response.json();
      this.cachedRateLimits = data;
      this.notifyRateLimitListeners(data);
      return data;
    } catch (error) {
      console.error('[Security] Failed to get rate limits:', error);
      // Return default free tier limits
      const defaultLimits: RateLimitInfo = {
        plan: 'free',
        limits: {
          chatRequests: { used: 0, limit: 50, resetAt: new Date(Date.now() + 86400000).toISOString() },
          codeGenerations: { used: 0, limit: 20, resetAt: new Date(Date.now() + 86400000).toISOString() },
          apiCalls: { used: 0, limit: 100, resetAt: new Date(Date.now() + 86400000).toISOString() },
        },
        features: {
          maxProjects: 3,
          maxFilesPerProject: 20,
          prioritySupport: false,
          customModels: false,
        },
      };
      this.cachedRateLimits = defaultLimits;
      return defaultLimits;
    }
  }

  getCachedRateLimits(): RateLimitInfo | null {
    return this.cachedRateLimits;
  }

  subscribeToRateLimits(listener: RateLimitListener): () => void {
    this.rateLimitListeners.add(listener);
    if (this.cachedRateLimits) {
      listener(this.cachedRateLimits);
    }
    return () => this.rateLimitListeners.delete(listener);
  }

  private notifyRateLimitListeners(info: RateLimitInfo) {
    this.rateLimitListeners.forEach(listener => listener(info));
  }

  // Update rate limits after an API call (called from other services)
  updateRateLimitUsage(type: 'chatRequests' | 'codeGenerations' | 'apiCalls') {
    if (this.cachedRateLimits) {
      this.cachedRateLimits.limits[type].used++;
      this.notifyRateLimitListeners(this.cachedRateLimits);
    }
  }

  // Check if user is within limits
  canMakeRequest(type: 'chatRequests' | 'codeGenerations' | 'apiCalls'): boolean {
    if (!this.cachedRateLimits) return true;
    const limit = this.cachedRateLimits.limits[type];
    return limit.used < limit.limit;
  }

  getUsagePercentage(type: 'chatRequests' | 'codeGenerations' | 'apiCalls'): number {
    if (!this.cachedRateLimits) return 0;
    const limit = this.cachedRateLimits.limits[type];
    return Math.min(100, (limit.used / limit.limit) * 100);
  }
}

export const securityService = new SecurityService();
