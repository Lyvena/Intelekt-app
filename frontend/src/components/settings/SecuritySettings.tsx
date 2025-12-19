import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Check,
  X,
  AlertTriangle,
  Copy,
  RefreshCw,
  LogOut,
  Loader2,
  Globe,
  Clock,
  Zap,
  Crown,
} from 'lucide-react';
import {
  securityService,
  type TwoFactorStatus,
  type TwoFactorSetup,
  type APIKey,
  type Session,
  type RateLimitInfo,
} from '../../services/securityService';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface SecuritySettingsProps {
  className?: string;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ className }) => {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'2fa' | 'apikeys' | 'sessions' | 'limits'>('2fa');

  // Set token for security service
  useEffect(() => {
    const initToken = async () => {
      const token = await getToken();
      securityService.setToken(token);
    };
    initToken();
  }, [getToken]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">Security Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: '2fa', label: 'Two-Factor Auth', icon: Smartphone },
          { id: 'apikeys', label: 'API Keys', icon: Key },
          { id: 'sessions', label: 'Sessions', icon: Monitor },
          { id: 'limits', label: 'Usage & Limits', icon: Zap },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === '2fa' && <TwoFactorSection />}
        {activeTab === 'apikeys' && <APIKeysSection />}
        {activeTab === 'sessions' && <SessionsSection />}
        {activeTab === 'limits' && <RateLimitsSection />}
      </div>
    </div>
  );
};

// ============ Two-Factor Authentication Section ============
const TwoFactorSection: React.FC = () => {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    const s = await securityService.get2FAStatus();
    setStatus(s);
    setIsLoading(false);
  };

  const startSetup = async () => {
    setIsSettingUp(true);
    setError(null);
    try {
      const s = await securityService.setup2FA();
      setSetup(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to setup 2FA');
    }
    setIsSettingUp(false);
  };

  const verify = async () => {
    setError(null);
    try {
      const result = await securityService.verify2FA(verificationCode);
      if (result.success) {
        setBackupCodes(result.backupCodes || null);
        setSetup(null);
        loadStatus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    }
  };

  const disable = async () => {
    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return;
    setError(null);
    try {
      const code = prompt('Enter your 2FA code to confirm:');
      if (!code) return;
      await securityService.disable2FA(code);
      loadStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disable 2FA');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Status Card */}
      <div className={cn(
        "p-6 rounded-xl border",
        status?.enabled
          ? "bg-green-500/10 border-green-500/30"
          : "bg-yellow-500/10 border-yellow-500/30"
      )}>
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-3 rounded-xl",
            status?.enabled ? "bg-green-500/20" : "bg-yellow-500/20"
          )}>
            {status?.enabled ? (
              <Shield className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">
              {status?.enabled ? '2FA Enabled' : '2FA Not Enabled'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {status?.enabled
                ? 'Your account is protected with two-factor authentication.'
                : 'Enable 2FA to add an extra layer of security to your account.'}
            </p>
            {status?.lastVerified && (
              <p className="text-xs text-muted-foreground mt-2">
                Last verified: {new Date(status.lastVerified).toLocaleString()}
              </p>
            )}
          </div>
          {status?.enabled ? (
            <button
              onClick={disable}
              className="px-4 py-2 text-sm bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={startSetup}
              disabled={isSettingUp}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSettingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable 2FA'}
            </button>
          )}
        </div>
      </div>

      {/* Setup Flow */}
      {setup && (
        <div className="p-6 bg-card rounded-xl border border-border space-y-4">
          <h3 className="font-semibold">Setup Two-Factor Authentication</h3>
          
          <div className="flex gap-6">
            {/* QR Code */}
            <div className="flex-shrink-0">
              <div className="p-4 bg-white rounded-xl">
                <img src={setup.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Scan with authenticator app
              </p>
            </div>

            {/* Manual Entry */}
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Manual entry code:</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 px-3 py-2 bg-secondary rounded font-mono text-sm">
                    {setup.secret}
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(setup.secret)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Enter verification code:</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="flex-1 px-3 py-2 bg-secondary border border-border rounded-lg font-mono text-lg tracking-widest text-center"
                    maxLength={6}
                  />
                  <button
                    onClick={verify}
                    disabled={verificationCode.length !== 6}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Backup Codes */}
      {backupCodes && (
        <div className="p-6 bg-card rounded-xl border border-border space-y-4">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold">2FA Enabled Successfully!</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <code key={i} className="px-3 py-2 bg-secondary rounded font-mono text-sm text-center">
                {code}
              </code>
            ))}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(backupCodes.join('\n'));
              setBackupCodes(null);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Copy & Close
          </button>
        </div>
      )}
    </div>
  );
};

// ============ API Keys Section ============
const APIKeysSection: React.FC = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState<{ provider: 'claude' | 'grok' | 'openai'; name: string; apiKey: string }>({ provider: 'claude', name: '', apiKey: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setIsLoading(true);
    const k = await securityService.getAPIKeys();
    setKeys(k);
    setIsLoading(false);
  };

  const addKey = async () => {
    setError(null);
    try {
      await securityService.addAPIKey(newKey.provider, newKey.name, newKey.apiKey);
      setNewKey({ provider: 'claude', name: '', apiKey: '' });
      setShowAddForm(false);
      loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add API key');
    }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      await securityService.deleteAPIKey(keyId);
      loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete API key');
    }
  };

  const toggleKey = async (keyId: string, isActive: boolean) => {
    try {
      await securityService.toggleAPIKey(keyId, isActive);
      loadKeys();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update API key');
    }
  };

  const PROVIDERS = [
    { id: 'claude', name: 'Claude (Anthropic)', color: 'text-orange-500' },
    { id: 'grok', name: 'Grok (xAI)', color: 'text-blue-500' },
    { id: 'openai', name: 'OpenAI', color: 'text-green-500' },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">API Keys</h3>
          <p className="text-sm text-muted-foreground">
            Add your own API keys to use with Intelekt
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 bg-card rounded-xl border border-border space-y-4">
          <div>
            <label className="text-sm font-medium">Provider</label>
            <select
              value={newKey.provider}
              onChange={(e) => setNewKey({ ...newKey, provider: e.target.value as 'claude' | 'grok' | 'openai' })}
              className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Name (optional)</label>
            <input
              type="text"
              value={newKey.name}
              onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
              placeholder="My API Key"
              className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm font-medium">API Key</label>
            <input
              type="password"
              value={newKey.apiKey}
              onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addKey}
              disabled={!newKey.apiKey}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Save Key
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No API keys added yet</p>
          <p className="text-sm mt-1">Add your own API keys to use Intelekt without limits</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const provider = PROVIDERS.find((p) => p.id === key.provider);
            return (
              <div
                key={key.id}
                className={cn(
                  "p-4 bg-card rounded-xl border transition-colors",
                  key.isActive ? "border-border" : "border-border/50 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-secondary", provider?.color)}>
                    <Key className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name || provider?.name}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded", key.isActive ? "bg-green-500/20 text-green-500" : "bg-secondary text-muted-foreground")}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <code>{key.maskedKey}</code>
                      <span>•</span>
                      <span>Added {new Date(key.createdAt).toLocaleDateString()}</span>
                      {key.lastUsed && (
                        <>
                          <span>•</span>
                          <span>Last used {new Date(key.lastUsed).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleKey(key.id, !key.isActive)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors"
                      title={key.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {key.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteKey(key.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ Sessions Section ============
const SessionsSection: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    const s = await securityService.getSessions();
    setSessions(s);
    setIsLoading(false);
  };

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Revoke this session? The device will be logged out.')) return;
    try {
      await securityService.revokeSession(sessionId);
      loadSessions();
    } catch (e) {
      console.error('Failed to revoke session:', e);
    }
  };

  const revokeAll = async () => {
    if (!confirm('Revoke all other sessions? All devices except this one will be logged out.')) return;
    try {
      await securityService.revokeAllOtherSessions();
      loadSessions();
    } catch (e) {
      console.error('Failed to revoke sessions:', e);
    }
  };

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) return Smartphone;
    return Monitor;
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Active Sessions</h3>
          <p className="text-sm text-muted-foreground">
            Manage devices logged into your account
          </p>
        </div>
        {sessions.filter(s => !s.isCurrent).length > 0 && (
          <button
            onClick={revokeAll}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Revoke All Others
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No active sessions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.device);
            return (
              <div
                key={session.id}
                className={cn(
                  "p-4 bg-card rounded-xl border",
                  session.isCurrent ? "border-primary/50 bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary">
                    <DeviceIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{session.device}</span>
                      {session.isCurrent && (
                        <span className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {session.location}
                      </span>
                      <span>{session.browser}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(session.lastActive).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => revokeSession(session.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg text-destructive transition-colors"
                      title="Revoke session"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============ Rate Limits Section ============
const RateLimitsSection: React.FC = () => {
  const [limits, setLimits] = useState<RateLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLimits();
    const unsubscribe = securityService.subscribeToRateLimits(setLimits);
    return unsubscribe;
  }, []);

  const loadLimits = async () => {
    setIsLoading(true);
    await securityService.getRateLimits();
    setIsLoading(false);
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'text-blue-500 bg-blue-500/20';
      case 'enterprise': return 'text-purple-500 bg-purple-500/20';
      default: return 'text-gray-500 bg-gray-500/20';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!limits) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Plan Card */}
      <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", getPlanColor(limits.plan))}>
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg capitalize">{limits.plan} Plan</h3>
              <p className="text-sm text-muted-foreground">
                {limits.plan === 'free' ? 'Upgrade for more features' : 'Thank you for your support!'}
              </p>
            </div>
          </div>
          {limits.plan === 'free' && (
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Usage Limits */}
      <div className="space-y-4">
        <h3 className="font-semibold">API Usage</h3>
        
        {Object.entries(limits.limits).map(([key, limit]) => {
          const percentage = (limit.used / limit.limit) * 100;
          const labels: Record<string, string> = {
            chatRequests: 'Chat Requests',
            codeGenerations: 'Code Generations',
            apiCalls: 'Total API Calls',
          };
          
          return (
            <div key={key} className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{labels[key]}</span>
                <span className="text-sm text-muted-foreground">
                  {limit.used} / {limit.limit}
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn("h-full transition-all", getUsageColor(percentage))}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Resets {new Date(limit.resetAt).toLocaleString()}
              </p>
              {percentage >= 80 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-yellow-500">
                  <AlertTriangle className="w-4 h-4" />
                  {percentage >= 100 ? 'Limit reached!' : 'Approaching limit'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h3 className="font-semibold">Plan Features</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-card rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">Max Projects</p>
            <p className="text-2xl font-bold">{limits.features.maxProjects}</p>
          </div>
          <div className="p-4 bg-card rounded-xl border border-border">
            <p className="text-sm text-muted-foreground">Files per Project</p>
            <p className="text-2xl font-bold">{limits.features.maxFilesPerProject}</p>
          </div>
          <div className="p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2">
              {limits.features.prioritySupport ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <X className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm">Priority Support</span>
            </div>
          </div>
          <div className="p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2">
              {limits.features.customModels ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <X className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm">Custom Models</span>
            </div>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <button
        onClick={loadLimits}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh usage data
      </button>
    </div>
  );
};

export default SecuritySettings;
