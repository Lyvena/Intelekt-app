import React from 'react';
import { CheckCircle, ArrowRight, Lightbulb, Users, DollarSign, Wrench, Rocket, Target } from 'lucide-react';

interface FrameworkProgressProps {
  currentStep: number;
  currentPhase: string;
  completedSteps: number;
  totalSteps: number;
  progressPercentage: number;
  readyForDevelopment: boolean;
  phasesCompleted: Record<string, boolean>;
  onPhaseClick?: (phase: string) => void;
}

const PHASES = [
  { id: 'customer', name: 'Customer', icon: Users, steps: [1, 2, 3, 4, 5], color: 'blue' },
  { id: 'value', name: 'Value', icon: Lightbulb, steps: [6, 7, 8, 9], color: 'purple' },
  { id: 'acquisition', name: 'Acquisition', icon: Target, steps: [10, 11, 12, 13, 14], color: 'green' },
  { id: 'monetization', name: 'Money', icon: DollarSign, steps: [15, 16, 17], color: 'yellow' },
  { id: 'building', name: 'Build', icon: Wrench, steps: [18, 19, 20], color: 'orange' },
  { id: 'scaling', name: 'Scale', icon: Rocket, steps: [21, 22, 23, 24], color: 'red' },
];

export const FrameworkProgress: React.FC<FrameworkProgressProps> = ({
  currentStep,
  currentPhase,
  completedSteps,
  totalSteps,
  progressPercentage,
  readyForDevelopment,
  phasesCompleted,
  onPhaseClick,
}) => {
  const getPhaseStatus = (phase: typeof PHASES[0]) => {
    if (phasesCompleted[phase.id]) return 'completed';
    if (currentPhase === phase.id) return 'current';
    return 'pending';
  };

  const getPhaseColor = (_phase: typeof PHASES[0], status: string) => {
    if (status === 'completed') return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    if (status === 'current') return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500';
    return 'text-gray-400 bg-gray-100 dark:bg-gray-800';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            MIT 24-Step Framework
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Disciplined Entrepreneurship
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {progressPercentage}%
          </div>
          <div className="text-xs text-gray-500">
            {completedSteps}/{totalSteps} steps
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Phase Pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PHASES.map((phase) => {
          const status = getPhaseStatus(phase);
          const Icon = phase.icon;
          return (
            <button
              key={phase.id}
              onClick={() => onPhaseClick?.(phase.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${getPhaseColor(phase, status)} hover:opacity-80`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{phase.name}</span>
              {status === 'completed' && <CheckCircle className="w-3.5 h-3.5" />}
            </button>
          );
        })}
      </div>

      {/* Current Step Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {currentStep}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Step {currentStep} of {totalSteps}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 capitalize">
              {currentPhase} Phase
            </div>
          </div>
          {!readyForDevelopment && (
            <ArrowRight className="w-5 h-5 text-blue-500" />
          )}
        </div>
      </div>

      {/* Ready for Development Badge */}
      {readyForDevelopment && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Ready for Development! 🚀
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameworkProgress;
