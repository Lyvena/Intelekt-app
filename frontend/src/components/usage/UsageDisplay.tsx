import React, { useEffect, useState } from 'react';
import { 
  Zap, 
  Crown, 
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { usageAPI } from '../../services/api';
import { cn } from '../../lib/utils';

interface UsageStats {
  tier: string;
  generations: {
    used: number;
    limit: number;
    remaining: number;
    unlimited: boolean;
    percentage: number;
  };
  total_generations: number;
  reset_date: string;
  days_until_reset: number;
  limits: {
    max_projects: number;
    max_files_per_project: number;
    ai_providers: string[];
  };
  features: string[];
  subscription: {
    tier: string;
    started_at: string | null;
    expires_at: string | null;
    is_active: boolean;
  };
}

interface UsageDisplayProps {
  compact?: boolean;
  showUpgrade?: boolean;
  className?: string;
}

export const UsageDisplay: React.FC<UsageDisplayProps> = ({ 
  compact = false, 
  showUpgrade = true,
  className 
}) => {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const data = await usageAPI.getUsage();
      setUsage(data);
      setError(null);
    } catch (err) {
      setError('Failed to load usage data');
      console.error('Usage fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-4 bg-secondary rounded w-24"></div>
      </div>
    );
  }

  if (error || !usage) {
    return null;
  }

  const { generations, tier, days_until_reset } = usage;
  const isNearLimit = !generations.unlimited && generations.percentage >= 80;
  const isAtLimit = !generations.unlimited && generations.remaining === 0;

  // Compact version for sidebar/toolbar
  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-1.5">
          <Zap className={cn(
            "w-3.5 h-3.5",
            isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-green-500"
          )} />
          <span className="text-xs font-medium">
            {generations.unlimited ? (
              <span className="text-green-500">∞</span>
            ) : (
              <span className={cn(
                isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-muted-foreground"
              )}>
                {generations.remaining}/{generations.limit}
              </span>
            )}
          </span>
        </div>
        {tier !== 'free' && (
          <Crown className="w-3 h-3 text-yellow-500" />
        )}
      </div>
    );
  }

  // Full version with progress bar
  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className={cn(
            "w-4 h-4",
            isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-primary"
          )} />
          <span className="font-medium text-sm">Usage</span>
          {tier !== 'free' && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-600 rounded text-xs font-medium">
              <Crown className="w-3 h-3" />
              {tier.toUpperCase()}
            </span>
          )}
        </div>
        <button 
          onClick={fetchUsage}
          className="p-1 hover:bg-secondary rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Progress Bar */}
      {!generations.unlimited && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">
              {generations.used} / {generations.limit} generations
            </span>
            <span className={cn(
              "font-medium",
              isAtLimit ? "text-red-500" : isNearLimit ? "text-yellow-500" : "text-green-500"
            )}>
              {generations.remaining} left
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isAtLimit ? "bg-red-500" : isNearLimit ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(100, generations.percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* Unlimited Badge */}
      {generations.unlimited && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-green-500/10 rounded-lg">
          <Sparkles className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600 font-medium">Unlimited generations</span>
        </div>
      )}

      {/* Reset Info */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
        <TrendingUp className="w-3 h-3" />
        <span>Resets in {days_until_reset} days</span>
        <span className="text-muted-foreground/50">•</span>
        <span>{usage.total_generations} total generations</span>
      </div>

      {/* Warning */}
      {isAtLimit && showUpgrade && (
        <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-red-600 font-medium">Generation limit reached</p>
            <p className="text-xs text-red-500/80">Upgrade to Pro for unlimited generations</p>
          </div>
        </div>
      )}

      {/* Upgrade CTA */}
      {tier === 'free' && showUpgrade && !isAtLimit && (
        <a 
          href="/pricing" 
          className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Crown className="w-4 h-4" />
          Upgrade to Pro — $19/mo
        </a>
      )}

      {/* Upgrade CTA when at limit */}
      {isAtLimit && showUpgrade && (
        <a 
          href="/pricing" 
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Upgrade Now
        </a>
      )}
    </div>
  );
};

export default UsageDisplay;
