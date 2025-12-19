import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, Crown, TrendingUp } from 'lucide-react';
import { securityService, type RateLimitInfo } from '../../services/securityService';
import { cn } from '../../lib/utils';

interface RateLimitIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({ className, compact = false }) => {
  const [limits, setLimits] = useState<RateLimitInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Load initial limits
    securityService.getRateLimits();
    
    // Subscribe to updates
    const unsubscribe = securityService.subscribeToRateLimits(setLimits);
    return unsubscribe;
  }, []);

  if (!limits) return null;

  const chatUsage = securityService.getUsagePercentage('chatRequests');
  const isNearLimit = chatUsage >= 80;
  const isAtLimit = chatUsage >= 100;

  const getColor = () => {
    if (isAtLimit) return 'text-red-500';
    if (isNearLimit) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (compact) {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors",
            isAtLimit ? "bg-red-500/20" : isNearLimit ? "bg-yellow-500/20" : "bg-secondary",
            getColor()
          )}
          title={`${limits.limits.chatRequests.used}/${limits.limits.chatRequests.limit} requests`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="font-medium">{limits.limits.chatRequests.limit - limits.limits.chatRequests.used}</span>
        </button>

        {/* Dropdown */}
        {showDetails && (
          <div className="absolute top-full right-0 mt-2 w-72 p-4 bg-card border border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">API Usage</span>
              <span className={cn("text-xs px-2 py-0.5 rounded capitalize", 
                limits.plan === 'free' ? 'bg-secondary' : 'bg-primary/20 text-primary'
              )}>
                {limits.plan}
              </span>
            </div>

            <div className="space-y-3">
              <UsageBar 
                label="Chat" 
                used={limits.limits.chatRequests.used} 
                limit={limits.limits.chatRequests.limit}
              />
              <UsageBar 
                label="Code Gen" 
                used={limits.limits.codeGenerations.used} 
                limit={limits.limits.codeGenerations.limit}
              />
              <UsageBar 
                label="API Calls" 
                used={limits.limits.apiCalls.used} 
                limit={limits.limits.apiCalls.limit}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
              Resets {new Date(limits.limits.chatRequests.resetAt).toLocaleDateString()}
            </div>

            {limits.plan === 'free' && (
              <button className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                <Crown className="w-4 h-4" />
                Upgrade for More
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full display
  return (
    <div className={cn("p-4 bg-card rounded-xl border border-border", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-medium">API Usage</span>
        </div>
        <span className={cn("text-xs px-2 py-1 rounded capitalize font-medium",
          limits.plan === 'free' ? 'bg-secondary' : 'bg-primary/20 text-primary'
        )}>
          {limits.plan} Plan
        </span>
      </div>

      <div className="space-y-4">
        <UsageBar 
          label="Chat Requests" 
          used={limits.limits.chatRequests.used} 
          limit={limits.limits.chatRequests.limit}
          showPercentage
        />
        <UsageBar 
          label="Code Generations" 
          used={limits.limits.codeGenerations.used} 
          limit={limits.limits.codeGenerations.limit}
          showPercentage
        />
        <UsageBar 
          label="Total API Calls" 
          used={limits.limits.apiCalls.used} 
          limit={limits.limits.apiCalls.limit}
          showPercentage
        />
      </div>

      {isNearLimit && (
        <div className={cn(
          "flex items-center gap-2 mt-4 p-3 rounded-lg text-sm",
          isAtLimit ? "bg-red-500/20 text-red-500" : "bg-yellow-500/20 text-yellow-500"
        )}>
          <AlertTriangle className="w-4 h-4" />
          {isAtLimit 
            ? "You've reached your limit. Upgrade for more."
            : "You're approaching your usage limit."
          }
        </div>
      )}

      {limits.plan === 'free' && (
        <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity">
          <TrendingUp className="w-4 h-4" />
          Upgrade to Pro
        </button>
      )}
    </div>
  );
};

// Usage Bar Component
const UsageBar: React.FC<{
  label: string;
  used: number;
  limit: number;
  showPercentage?: boolean;
}> = ({ label, used, limit, showPercentage }) => {
  const percentage = Math.min(100, (used / limit) * 100);
  
  const getBarColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {limit}
          {showPercentage && (
            <span className="text-muted-foreground ml-1">({Math.round(percentage)}%)</span>
          )}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default RateLimitIndicator;
