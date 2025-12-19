import React from 'react';
import { Zap, Clock, DollarSign, CheckCircle } from 'lucide-react';
import type { AIProviderAnalytics } from '../../types';

interface AIProviderStatsProps {
  analytics: AIProviderAnalytics;
}

export const AIProviderStats: React.FC<AIProviderStatsProps> = ({ analytics }) => {
  const { providers } = analytics;

  if (!providers || Object.keys(providers).length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No AI usage data available
      </div>
    );
  }

  const providerColors: Record<string, { bg: string; text: string; icon: string }> = {
    claude: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: '🤖' },
    grok: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: '⚡' }
  };

  const totalRequests = Object.values(providers).reduce((sum, p) => sum + p.total_requests, 0);
  const totalCost = Object.values(providers).reduce((sum, p) => sum + p.total_cost_usd, 0);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Total Requests</div>
          <div className="text-xl font-bold text-white">{totalRequests.toLocaleString()}</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="text-gray-400 text-xs mb-1">Est. Cost</div>
          <div className="text-xl font-bold text-white">${totalCost.toFixed(2)}</div>
        </div>
      </div>

      {/* Provider Cards */}
      {Object.entries(providers).map(([provider, stats]) => {
        const colors = providerColors[provider] || { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: '🔧' };
        const usagePercent = totalRequests > 0 ? (stats.total_requests / totalRequests) * 100 : 0;

        return (
          <div key={provider} className={`rounded-lg p-4 ${colors.bg} border border-gray-700`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{colors.icon}</span>
                <span className={`font-semibold capitalize ${colors.text}`}>{provider}</span>
              </div>
              <span className="text-gray-400 text-sm">{usagePercent.toFixed(1)}% of total</span>
            </div>

            {/* Usage Progress Bar */}
            <div className="h-2 bg-gray-700 rounded-full mb-3 overflow-hidden">
              <div
                className={`h-full ${provider === 'claude' ? 'bg-orange-500' : 'bg-blue-500'} rounded-full transition-all duration-500`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{stats.total_requests.toLocaleString()} requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">{stats.avg_response_time_ms.toFixed(0)}ms avg</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-gray-300">{stats.success_rate.toFixed(1)}% success</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-gray-300">${stats.total_cost_usd.toFixed(2)}</span>
              </div>
            </div>

            {/* Token Usage */}
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Input: {(stats.total_input_tokens / 1000).toFixed(1)}k tokens</span>
                <span>Output: {(stats.total_output_tokens / 1000).toFixed(1)}k tokens</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
