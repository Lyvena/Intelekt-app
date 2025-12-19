import React, { useState, useEffect } from 'react';
import {
  Coins,
  TrendingUp,
  Clock,
  MessageSquare,
  Code,
  Wrench,
  BookOpen,
  Bug,
  ChevronDown,
  ChevronRight,
  Trash2,
  BarChart3,
  Zap,
} from 'lucide-react';
import { usageTracker, type ProjectUsage, type AIInteraction, type TokenUsage } from '../../services/usageTracker';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface UsagePanelProps {
  className?: string;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  chat: MessageSquare,
  code_generation: Code,
  error_fix: Wrench,
  explanation: BookOpen,
  debug: Bug,
};

const TYPE_COLORS: Record<string, string> = {
  chat: 'text-blue-400 bg-blue-500/20',
  code_generation: 'text-green-400 bg-green-500/20',
  error_fix: 'text-orange-400 bg-orange-500/20',
  explanation: 'text-purple-400 bg-purple-500/20',
  debug: 'text-red-400 bg-red-500/20',
};

export const UsagePanel: React.FC<UsagePanelProps> = ({ className }) => {
  const { currentProject } = useStore();
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [view, setView] = useState<'overview' | 'history'>('overview');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!currentProject) {
      setUsage(null);
      return;
    }

    const unsubscribe = usageTracker.subscribe(currentProject.id, setUsage);
    return unsubscribe;
  }, [currentProject]);

  const clearHistory = () => {
    if (currentProject && confirm('Clear all usage history for this project?')) {
      usageTracker.clearProjectUsage(currentProject.id);
    }
  };

  if (!currentProject) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground", className)}>
        <p className="text-sm">Select a project to view usage</p>
      </div>
    );
  }

  const totalUsage = usageTracker.getTotalUsage();

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">AI Usage</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('overview')}
            className={cn(
              "px-3 py-1 text-xs rounded-lg transition-colors",
              view === 'overview' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setView('history')}
            className={cn(
              "px-3 py-1 text-xs rounded-lg transition-colors",
              view === 'history' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            History
          </button>
          {usage && usage.history.length > 0 && (
            <button
              onClick={clearHistory}
              className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors text-destructive"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {view === 'overview' ? (
          <OverviewView usage={usage} totalUsage={totalUsage} />
        ) : (
          <HistoryView 
            history={usage?.history || []} 
            expandedItem={expandedItem}
            setExpandedItem={setExpandedItem}
          />
        )}
      </div>
    </div>
  );
};

// Overview View Component
const OverviewView: React.FC<{ usage: ProjectUsage | null; totalUsage: TokenUsage }> = ({ usage, totalUsage }) => {
  return (
    <div className="p-4 space-y-6">
      {/* Cost Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">Project Cost</span>
          </div>
          <p className="text-2xl font-bold text-yellow-500">
            {usageTracker.formatCost(usage?.totalCost || 0)}
          </p>
        </div>
        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Total Tokens</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {usageTracker.formatTokens((usage?.totalInputTokens || 0) + (usage?.totalOutputTokens || 0))}
          </p>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="p-4 bg-card rounded-xl border border-border">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Token Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Input Tokens</span>
            <span className="text-sm font-medium">{usageTracker.formatTokens(usage?.totalInputTokens || 0)}</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ 
                width: `${usage ? (usage.totalInputTokens / (usage.totalInputTokens + usage.totalOutputTokens)) * 100 : 0}%` 
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Output Tokens</span>
            <span className="text-sm font-medium">{usageTracker.formatTokens(usage?.totalOutputTokens || 0)}</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ 
                width: `${usage ? (usage.totalOutputTokens / (usage.totalInputTokens + usage.totalOutputTokens)) * 100 : 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Usage by Type */}
      {usage && Object.keys(usage.byType).length > 0 && (
        <div className="p-4 bg-card rounded-xl border border-border">
          <h3 className="text-sm font-medium mb-3">Usage by Type</h3>
          <div className="space-y-2">
            {Object.entries(usage.byType).map(([type, typeUsage]) => {
              const Icon = TYPE_ICONS[type] || MessageSquare;
              const colorClass = TYPE_COLORS[type] || 'text-gray-400 bg-gray-500/20';
              return (
                <div key={type} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded", colorClass)}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{usageTracker.formatTokens(typeUsage.totalTokens)}</p>
                    <p className="text-xs text-muted-foreground">{usageTracker.formatCost(typeUsage.estimatedCost)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Provider Breakdown */}
      {usage && Object.keys(usage.byProvider).length > 0 && (
        <div className="p-4 bg-card rounded-xl border border-border">
          <h3 className="text-sm font-medium mb-3">Usage by Provider</h3>
          <div className="space-y-2">
            {Object.entries(usage.byProvider).map(([provider, providerUsage]) => (
              <div key={provider} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                <span className="text-sm capitalize font-medium">{provider}</span>
                <div className="text-right">
                  <p className="text-sm font-medium">{usageTracker.formatTokens(providerUsage.totalTokens)}</p>
                  <p className="text-xs text-muted-foreground">{usageTracker.formatCost(providerUsage.estimatedCost)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-time stats */}
      <div className="p-4 bg-secondary/30 rounded-xl border border-border">
        <h3 className="text-sm font-medium mb-2 text-muted-foreground">All Projects Total</h3>
        <div className="flex items-center justify-between">
          <span className="text-sm">Total Cost</span>
          <span className="font-bold text-yellow-500">{usageTracker.formatCost(totalUsage.estimatedCost)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm">Total Tokens</span>
          <span className="font-medium">{usageTracker.formatTokens(totalUsage.totalTokens)}</span>
        </div>
      </div>

      {/* Empty state */}
      {(!usage || usage.totalInteractions === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No AI usage recorded yet</p>
          <p className="text-xs mt-1">Start chatting to track token usage</p>
        </div>
      )}
    </div>
  );
};

// History View Component
const HistoryView: React.FC<{
  history: AIInteraction[];
  expandedItem: string | null;
  setExpandedItem: (id: string | null) => void;
}> = ({ history, expandedItem, setExpandedItem }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <Clock className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">No interactions yet</p>
        <p className="text-xs mt-1">AI interactions will appear here</p>
      </div>
    );
  }

  // Group by date
  const groupedHistory = history.reduce((acc, item) => {
    const date = new Date(item.timestamp).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, AIInteraction[]>);

  return (
    <div className="p-4 space-y-4">
      {Object.entries(groupedHistory).reverse().map(([date, items]) => (
        <div key={date}>
          <h3 className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
            {date}
          </h3>
          <div className="space-y-2">
            {items.reverse().map((item) => {
              const Icon = TYPE_ICONS[item.type] || MessageSquare;
              const colorClass = TYPE_COLORS[item.type] || 'text-gray-400 bg-gray-500/20';
              const isExpanded = expandedItem === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/30 transition-colors"
                  >
                    <div className={cn("p-2 rounded-lg", colorClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.prompt.slice(0, 50)}...
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span className="capitalize">{item.provider}</span>
                        <span>•</span>
                        <span>{usageTracker.formatTokens(item.usage.totalTokens)} tokens</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-500">
                        {usageTracker.formatCost(item.usage.estimatedCost)}
                      </p>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border p-3 space-y-3 bg-secondary/20">
                      {/* Token details */}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Input</p>
                          <p className="text-sm font-medium">{usageTracker.formatTokens(item.usage.inputTokens)}</p>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Output</p>
                          <p className="text-sm font-medium">{usageTracker.formatTokens(item.usage.outputTokens)}</p>
                        </div>
                        <div className="p-2 bg-background rounded-lg">
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="text-sm font-medium">{(item.duration / 1000).toFixed(1)}s</p>
                        </div>
                      </div>

                      {/* Prompt */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Prompt</p>
                        <p className="text-sm bg-background p-2 rounded-lg max-h-24 overflow-auto">
                          {item.prompt.slice(0, 300)}{item.prompt.length > 300 ? '...' : ''}
                        </p>
                      </div>

                      {/* Response preview */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Response</p>
                        <p className="text-sm bg-background p-2 rounded-lg max-h-24 overflow-auto">
                          {item.response.slice(0, 300)}{item.response.length > 300 ? '...' : ''}
                        </p>
                      </div>

                      {/* Metadata */}
                      {item.metadata && (
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          {item.metadata.filesGenerated && (
                            <span>{item.metadata.filesGenerated} files generated</span>
                          )}
                          {item.metadata.filesModified && (
                            <span>{item.metadata.filesModified} files modified</span>
                          )}
                          {item.metadata.linesOfCode && (
                            <span>{item.metadata.linesOfCode} lines of code</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UsagePanel;
