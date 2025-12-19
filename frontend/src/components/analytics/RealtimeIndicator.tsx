import React from 'react';
import { Activity, Users, Zap } from 'lucide-react';
import type { RealtimeMetrics } from '../../types';

interface RealtimeIndicatorProps {
  metrics: RealtimeMetrics;
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ metrics }) => {
  const { active_sessions, recent_events, active_users, timestamp } = metrics;
  
  const time = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Live Indicator */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-green-400 font-medium text-sm">LIVE</span>
          </div>

          {/* Active Sessions */}
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span className="text-gray-400 text-sm">Sessions:</span>
            <span className="text-white font-semibold">{active_sessions}</span>
          </div>

          {/* Active Users */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400 text-sm">Users:</span>
            <span className="text-white font-semibold">{active_users}</span>
          </div>

          {/* Recent Events */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-gray-400 text-sm">Events (5m):</span>
            <span className="text-white font-semibold">{recent_events}</span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-gray-500 text-xs">
          Last updated: {time}
        </div>
      </div>
    </div>
  );
};
