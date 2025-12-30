import React from 'react';
import { ChevronRight, ChevronLeft, SkipForward, CheckCircle, HelpCircle } from 'lucide-react';

interface FrameworkStep {
  number: number;
  name: string;
  phase: string;
  description: string;
  key_questions: string[];
  deliverables: string[];
  status: string;
  user_responses: Record<string, string>;
  ai_analysis: string | null;
}

interface FrameworkStepPanelProps {
  step: FrameworkStep;
  onComplete: () => void;
  onSkip: () => void;
  onPrevious?: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  canComplete: boolean;
  tips?: string[];
  examples?: string[];
}

export const FrameworkStepPanel: React.FC<FrameworkStepPanelProps> = ({
  step,
  onComplete,
  onSkip,
  onPrevious,
  isFirstStep,
  isLastStep,
  canComplete,
  tips = [],
  examples = [],
}) => {
  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      customer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      value: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      acquisition: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      monetization: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      building: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      scaling: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[phase] || 'bg-gray-100 text-gray-800';
  };

  const getPhaseName = (phase: string) => {
    const names: Record<string, string> = {
      customer: 'Who Is Your Customer?',
      value: 'What Can You Do For Them?',
      acquisition: 'How Do They Acquire Your Product?',
      monetization: 'How Do You Make Money?',
      building: 'How Do You Design & Build?',
      scaling: 'How Do You Scale?',
    };
    return names[phase] || phase;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Step Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{step.number}</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">{step.name}</h3>
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPhaseColor(step.phase)}`}>
                {getPhaseName(step.phase)}
              </span>
            </div>
          </div>
          {step.status === 'completed' && (
            <CheckCircle className="w-6 h-6 text-green-400" />
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4 space-y-4">
        {/* Description */}
        <p className="text-gray-700 dark:text-gray-300">{step.description}</p>

        {/* Quick tips */}
        {tips.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Quick tips
              </span>
            </div>
            <ul className="space-y-1.5">
              {tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <span className="text-amber-500 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Questions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Key Questions to Explore
            </span>
          </div>
          <ul className="space-y-1.5">
            {step.key_questions.map((question, idx) => (
              <li key={idx} className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Deliverables */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              Expected Deliverables
            </span>
          </div>
          <ul className="space-y-1">
            {step.deliverables.map((deliverable, idx) => (
              <li key={idx} className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span>{deliverable}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* AI Analysis (if completed) */}
        {step.ai_analysis && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
            <div className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
              Analysis Summary
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-400 whitespace-pre-wrap">
              {step.ai_analysis}
            </p>
          </div>
        )}

        {/* Examples */}
        {examples.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              Examples
            </div>
            <ul className="space-y-1.5">
              {examples.map((example, idx) => (
                <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Step Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={onPrevious}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}
          <button
            onClick={onSkip}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip Step
          </button>
        </div>
        <button
          onClick={onComplete}
          disabled={!canComplete}
          className={`flex items-center gap-1 px-4 py-1.5 text-sm font-medium rounded transition-colors ${
            canComplete
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLastStep ? 'Complete Framework' : 'Complete & Continue'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default FrameworkStepPanel;
