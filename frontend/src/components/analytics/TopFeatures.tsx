import React from 'react';
import { TrendingUp } from 'lucide-react';

interface Feature {
  name: string;
  usage: number;
}

interface TopFeaturesProps {
  features: Feature[];
}

const featureIcons: Record<string, string> = {
  chat: '💬',
  code_generation: '💻',
  framework: '📊',
  export: '📦',
  deployment: '🚀',
  github: '🐙',
  preview: '👁️',
  terminal: '⌨️',
  git: '📝',
  dependencies: '📦',
  context: '🧠',
  collaboration: '👥',
  project: '📁',
  auth: '🔐'
};

const featureColors: Record<string, string> = {
  chat: 'from-blue-500 to-blue-600',
  code_generation: 'from-purple-500 to-purple-600',
  framework: 'from-green-500 to-green-600',
  export: 'from-orange-500 to-orange-600',
  deployment: 'from-pink-500 to-pink-600',
  github: 'from-gray-500 to-gray-600',
  preview: 'from-cyan-500 to-cyan-600',
  terminal: 'from-yellow-500 to-yellow-600',
  git: 'from-red-500 to-red-600',
  dependencies: 'from-indigo-500 to-indigo-600',
  context: 'from-emerald-500 to-emerald-600',
  collaboration: 'from-violet-500 to-violet-600',
  project: 'from-teal-500 to-teal-600',
  auth: 'from-rose-500 to-rose-600'
};

export const TopFeatures: React.FC<TopFeaturesProps> = ({ features }) => {
  if (!features || features.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No feature usage data available
      </div>
    );
  }

  const maxUsage = Math.max(...features.map(f => f.usage), 1);
  const totalUsage = features.reduce((sum, f) => sum + f.usage, 0);

  return (
    <div className="space-y-3">
      {features.slice(0, 8).map((feature, index) => {
        const percentage = (feature.usage / maxUsage) * 100;
        const sharePercent = (feature.usage / totalUsage) * 100;
        const icon = featureIcons[feature.name.toLowerCase()] || '⚡';
        const gradient = featureColors[feature.name.toLowerCase()] || 'from-indigo-500 to-indigo-600';

        return (
          <div key={feature.name} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{icon}</span>
                <span className="text-gray-300 text-sm capitalize">
                  {feature.name.replace(/_/g, ' ')}
                </span>
                {index === 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Top
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">
                  {sharePercent.toFixed(1)}%
                </span>
                <span className="text-white font-medium text-sm">
                  {feature.usage.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-500 group-hover:opacity-80`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}

      {features.length > 8 && (
        <div className="text-center text-gray-500 text-sm pt-2">
          +{features.length - 8} more features
        </div>
      )}
    </div>
  );
};
