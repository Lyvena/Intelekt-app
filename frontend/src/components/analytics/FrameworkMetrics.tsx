import React from 'react';
import { Target, Clock, CheckCircle, BarChart2 } from 'lucide-react';
import type { FrameworkAnalytics } from '../../types';

interface FrameworkMetricsProps {
  analytics: FrameworkAnalytics;
}

export const FrameworkMetrics: React.FC<FrameworkMetricsProps> = ({ analytics }) => {
  const {
    total_started,
    total_completed,
    completion_rate,
    avg_completion_time_minutes,
    avg_phase_times,
    steps_completion_distribution
  } = analytics;

  const phases = [
    { name: 'Customer', key: 'customer', color: 'bg-blue-500' },
    { name: 'Value', key: 'value', color: 'bg-green-500' },
    { name: 'Acquisition', key: 'acquisition', color: 'bg-purple-500' },
    { name: 'Monetization', key: 'monetization', color: 'bg-orange-500' },
    { name: 'Building', key: 'building', color: 'bg-pink-500' },
    { name: 'Scaling', key: 'scaling', color: 'bg-cyan-500' }
  ];

  return (
    <div className="space-y-4">
      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Target className="w-3 h-3" />
            Started
          </div>
          <div className="text-xl font-bold text-white">{total_started}</div>
        </div>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </div>
          <div className="text-xl font-bold text-green-400">{total_completed}</div>
        </div>
      </div>

      {/* Completion Rate */}
      <div className="bg-gray-700/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300 text-sm">Completion Rate</span>
          <span className="text-white font-bold">{completion_rate.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(completion_rate, 100)}%` }}
          />
        </div>
      </div>

      {/* Avg Completion Time */}
      <div className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2 text-gray-300">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Avg. Completion Time</span>
        </div>
        <span className="text-white font-medium">
          {avg_completion_time_minutes > 60 
            ? `${(avg_completion_time_minutes / 60).toFixed(1)}h`
            : `${avg_completion_time_minutes.toFixed(0)}m`
          }
        </span>
      </div>

      {/* Phase Times */}
      {avg_phase_times && Object.keys(avg_phase_times).length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <BarChart2 className="w-3 h-3" />
            Time per Phase (avg)
          </div>
          <div className="space-y-2">
            {phases.map(phase => {
              const time = avg_phase_times[phase.key] || 0;
              const maxTime = Math.max(...Object.values(avg_phase_times), 1);
              const percent = (time / maxTime) * 100;

              return (
                <div key={phase.key} className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs w-20 truncate">{phase.name}</span>
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${phase.color} rounded-full transition-all duration-300`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-gray-500 text-xs w-12 text-right">
                    {time > 60 ? `${(time / 60).toFixed(1)}h` : `${time.toFixed(0)}m`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step Distribution Mini Chart */}
      {steps_completion_distribution && (
        <div>
          <div className="text-gray-400 text-xs mb-2">Steps Completion Distribution</div>
          <div className="flex items-end gap-px h-16">
            {Object.entries(steps_completion_distribution)
              .filter(([step]) => parseInt(step) > 0 && parseInt(step) <= 24)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([step, count]) => {
                const maxCount = Math.max(...Object.values(steps_completion_distribution).filter((_, i) => i > 0), 1);
                const height = (count / maxCount) * 100;
                
                return (
                  <div
                    key={step}
                    className="flex-1 bg-indigo-500/60 hover:bg-indigo-500 transition-colors rounded-t cursor-pointer group relative"
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`Step ${step}: ${count} users`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-gray-700 text-white text-xs rounded px-1.5 py-0.5 whitespace-nowrap">
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Step 1</span>
            <span>Step 24</span>
          </div>
        </div>
      )}
    </div>
  );
};
