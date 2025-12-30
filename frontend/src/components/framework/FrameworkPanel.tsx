import React, { useState, useEffect, useCallback, useRef } from 'react';
import { frameworkAPI } from '../../services/api';
import { FrameworkProgress } from './FrameworkProgress';
import { FrameworkStepPanel } from './FrameworkStepPanel';
import { 
  Sparkles, 
  Code, 
  FileText, 
  Download,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FastForward,
} from 'lucide-react';
import { useAnalytics } from '../analytics/useAnalytics';

interface FrameworkPanelProps {
  projectId: string;
  idea: string;
  onStartDevelopment: () => void;
  onExportDocument: (document: string) => void;
}

interface FrameworkState {
  currentStep: number;
  currentPhase: string;
  completedSteps: number;
  totalSteps: number;
  progressPercentage: number;
  readyForDevelopment: boolean;
  phasesCompleted: Record<string, boolean>;
}

interface StepData {
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

const STEP_GUIDANCE: Record<number, { tips?: string[]; examples?: string[] }> = {
  1: {
    tips: [
      'List at least 5 segments; be specific (e.g., “solo React devs shipping client MVPs”).',
      'Consider urgency (need), access (channels), and budget.',
    ],
    examples: ['Indie devs delivering client MVPs', 'Bootcamp grads freelancing', 'Small agencies (2-5 ppl) doing prototypes'],
  },
  2: {
    tips: ['Pick one segment with highest urgency + easiest reach.', 'State why this is the beachhead in 1-2 lines.'],
    examples: ['Beachhead: solo/indie developers with 2-5 active clients needing faster MVP delivery.'],
  },
  5: {
    tips: ['Name the persona and describe a day-in-the-life.', 'Highlight pains, goals, and “hire moment.”'],
    examples: ['Alex, 28, freelance dev shipping MVPs monthly; pain: context switching and slow ramp-up.'],
  },
  7: {
    tips: ['List must-have vs. nice-to-have features.', 'Explicitly exclude out-of-scope items.'],
    examples: ['Must: chat builder, framework guidance, live preview, export; Nice: team sharing; Out: mobile app.'],
  },
  8: {
    tips: ['Quantify time/cost savings clearly.', 'Compare against status quo.'],
    examples: ['70% faster delivery; 60% cost reduction vs. manual builds.'],
  },
  21: {
    tips: ['Define MVP scope, success metrics, and test users.', 'Keep timeline/budget tight.'],
    examples: ['MVP: guided framework + code preview + export; Success: 70% completion, <2s preview; Testers: 20 indie devs.'],
  },
};

const normalizeStep = (step: Partial<StepData> & { step_number?: number; user_responses?: Record<string, string> }): StepData => {
  const number = step?.number ?? step?.step_number ?? 0;
  const safeResponses: Record<string, string> = {};
  if (step?.user_responses) {
    Object.entries(step.user_responses).forEach(([k, v]) => {
      safeResponses[k] = typeof v === 'string' ? v : JSON.stringify(v ?? '');
    });
  }
  return {
    number,
    name: step?.name ?? '',
    phase: step?.phase ?? 'customer',
    description: step?.description ?? '',
    key_questions: Array.isArray(step?.key_questions) ? step.key_questions : [],
    deliverables: Array.isArray(step?.deliverables) ? step.deliverables : [],
    status: step?.status ?? 'not_started',
    user_responses: safeResponses,
    ai_analysis: step?.ai_analysis ?? null,
  };
};

export const FrameworkPanel: React.FC<FrameworkPanelProps> = ({
  projectId,
  idea,
  onStartDevelopment,
  onExportDocument,
}) => {
  const [, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameworkState, setFrameworkState] = useState<FrameworkState | null>(null);
  const [currentStepData, setCurrentStepData] = useState<StepData | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [canComplete, setCanComplete] = useState(false);
  const [lastAiAnalysis, setLastAiAnalysis] = useState<string>('');
  const [isQuickActionLoading, setIsQuickActionLoading] = useState(false);
  const { trackEvent } = useAnalytics();
  const frameworkStartRef = useRef<number>(Date.now());
  const firstExportTrackedRef = useRef(false);
  const readyTrackedRef = useRef(false);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'helpful' | 'not_helpful'>('idle');
  const [isBugOpen, setIsBugOpen] = useState(false);
  const [bugText, setBugText] = useState('');

  // Track time-to-ready-for-dev
  useEffect(() => {
    if (frameworkState?.readyForDevelopment && !readyTrackedRef.current) {
      const timeToReadySec = Math.round((Date.now() - frameworkStartRef.current) / 1000);
      trackEvent('framework', 'ready_for_development', undefined, timeToReadySec, {
        projectId,
        idea,
        completed_steps: frameworkState.completedSteps,
        progress_percentage: frameworkState.progressPercentage,
      });
      readyTrackedRef.current = true;
    }
  }, [frameworkState?.readyForDevelopment, frameworkState?.completedSteps, frameworkState?.progressPercentage, idea, projectId, trackEvent]);

  const initializeFramework = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await frameworkAPI.initialize(projectId, idea);
      
      if (result.success) {
        setIsInitialized(true);
        setCurrentStepData(normalizeStep(result.step_details));
        
        // Fetch initial progress
        const progress = await frameworkAPI.getProgress(projectId);
        setFrameworkState({
          currentStep: progress.current_step,
          currentPhase: progress.current_phase,
          completedSteps: progress.completed_steps,
          totalSteps: progress.total_steps,
          progressPercentage: progress.progress_percentage,
          readyForDevelopment: progress.ready_for_development,
          phasesCompleted: progress.phases_completed,
        });
      }
    } catch (err) {
      console.error('Failed to initialize framework:', err);
      setError('Failed to initialize framework. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, idea]);

  const loadFrameworkState = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Try to get existing session
      const { session, progress } = await frameworkAPI.getSession(projectId);
      
      if (session) {
        setCurrentStepData(normalizeStep(session.step as StepData));
        setFrameworkState((prev) => prev ? {
          ...prev,
          currentStep: progress.current_step,
          currentPhase: progress.current_phase,
          completedSteps: progress.completed_steps,
          totalSteps: progress.total_steps,
          progressPercentage: progress.progress_percentage,
          readyForDevelopment: progress.ready_for_development,
          phasesCompleted: progress.phases_completed,
        } : {
          currentStep: progress.current_step,
          currentPhase: progress.current_phase,
          completedSteps: progress.completed_steps,
          totalSteps: progress.total_steps,
          progressPercentage: progress.progress_percentage,
          readyForDevelopment: progress.ready_for_development,
          phasesCompleted: progress.phases_completed,
        });
      } else {
        // No session exists, initialize new one
        await initializeFramework();
      }
    } catch (err) {
      // Session doesn't exist, initialize
      await initializeFramework();
    } finally {
      setIsLoading(false);
    }
  }, [projectId, initializeFramework]);

  useEffect(() => {
    if (projectId && idea) {
      loadFrameworkState();
    }
  }, [projectId, idea, loadFrameworkState]);

  const handleCompleteStep = async () => {
    if (!currentStepData || !frameworkState) return;
    
    try {
      setIsLoading(true);
      
      const result = await frameworkAPI.completeStep(
        projectId,
        currentStepData.number,
        currentStepData.user_responses || {},
        lastAiAnalysis || 'Step completed via conversation'
      );
      
      if (result.success) {
        const timeSinceStartSec = Math.round((Date.now() - frameworkStartRef.current) / 1000);
        trackEvent('framework', 'complete_step', `step_${currentStepData.number}`, timeSinceStartSec, {
          projectId,
          idea,
          step: currentStepData.number,
          phase: currentStepData.phase,
        });
        if (result.progress) {
          setFrameworkState((prev) => {
            const previous = prev;
            return {
              currentStep: result.progress.current_step,
              currentPhase: previous?.currentPhase ?? 'customer',
              completedSteps: result.progress.completed_steps,
              totalSteps: result.progress.total_steps,
              progressPercentage: result.progress.progress_percentage,
              readyForDevelopment: result.progress.ready_for_development,
              phasesCompleted: previous?.phasesCompleted ?? {},
            };
          });
        }
        
        if (result.framework_completed) {
          // Framework complete!
          setCurrentStepData(null);
        } else if (result.next_step) {
          setCurrentStepData(normalizeStep(result.next_step));
        }
        
        setCanComplete(false);
        setLastAiAnalysis('');
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
      setError('Failed to complete step. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipStep = async () => {
    if (!currentStepData || !frameworkState) return;
    
    try {
      setIsLoading(true);
      
      const result = await frameworkAPI.skipStep(projectId, currentStepData.number);
      
      if (result.success) {
        if (result.progress) {
          setFrameworkState((prev) => {
            const previous = prev;
            return {
              currentStep: result.progress.current_step,
              currentPhase: previous?.currentPhase ?? 'customer',
              completedSteps: result.progress.completed_steps,
              totalSteps: result.progress.total_steps,
              progressPercentage: result.progress.progress_percentage,
              readyForDevelopment: result.progress.ready_for_development,
              phasesCompleted: previous?.phasesCompleted ?? {},
            };
          });
        }
        
        if (result.next_step) {
          setCurrentStepData(normalizeStep(result.next_step));
        } else {
          setCurrentStepData(null);
        }
      }
    } catch (err) {
      console.error('Failed to skip step:', err);
      setError('Failed to skip step. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousStep = async () => {
    if (!currentStepData || currentStepData.number <= 1) return;
    
    try {
      const { step } = await frameworkAPI.getStepDetails(projectId, currentStepData.number - 1);
      setCurrentStepData(normalizeStep(step));
    } catch (err) {
      console.error('Failed to go to previous step:', err);
    }
  };

  const handleExportDocument = async () => {
    try {
      const { document } = await frameworkAPI.exportDocument(projectId);
      onExportDocument(document);
      const now = Date.now();
      const timeToExportSec = Math.round((now - frameworkStartRef.current) / 1000);
      if (!firstExportTrackedRef.current) {
        trackEvent('framework', 'first_export', `step_${currentStepData?.number ?? 'unknown'}`, timeToExportSec, {
          projectId,
          idea,
          current_step: currentStepData?.number,
          ready_for_dev: frameworkState?.readyForDevelopment,
        });
        firstExportTrackedRef.current = true;
      } else {
        trackEvent('framework', 'export_document', `step_${currentStepData?.number ?? 'unknown'}`, undefined, {
          projectId,
          idea,
          current_step: currentStepData?.number,
        });
      }
    } catch (err) {
      console.error('Failed to export document:', err);
      setError('Failed to export framework document.');
    }
  };

  const handleStartDevelopment = async () => {
    try {
      const result = await frameworkAPI.canDevelop(projectId);
      
      if (result.can_start) {
        onStartDevelopment();
      } else {
        setError(`Cannot start development: ${result.reason}. Missing steps: ${result.missing_steps?.join(', ')}`);
      }
    } catch (err) {
      console.error('Failed to check development readiness:', err);
      onStartDevelopment(); // Allow anyway
    }
  };

  const handleInitializeSample = async () => {
    try {
      setIsQuickActionLoading(true);
      setError(null);
      const result = await frameworkAPI.initializeSample(projectId, idea);
      setIsInitialized(true);
      const progress = await frameworkAPI.getProgress(projectId);
      setFrameworkState({
        currentStep: progress.current_step,
        currentPhase: progress.current_phase,
        completedSteps: progress.completed_steps,
        totalSteps: progress.total_steps,
        progressPercentage: progress.progress_percentage,
        readyForDevelopment: progress.ready_for_development,
        phasesCompleted: progress.phases_completed,
      });
      setCurrentStepData(normalizeStep(result.step_details));
      setCanComplete(false);
      setLastAiAnalysis(result.step_details?.ai_analysis || '');
    } catch (err) {
      console.error('Failed to initialize sample framework:', err);
      setError('Failed to initialize sample framework.');
    } finally {
      setIsQuickActionLoading(false);
    }
  };

  const handleFastTrack = async () => {
    try {
      setIsQuickActionLoading(true);
      setError(null);
      const result = await frameworkAPI.fastTrack(projectId, idea);
      setIsInitialized(true);
      const progress = result.progress || await frameworkAPI.getProgress(projectId);
      setFrameworkState({
        currentStep: progress.current_step,
        currentPhase: progress.current_phase,
        completedSteps: progress.completed_steps,
        totalSteps: progress.total_steps,
        progressPercentage: progress.progress_percentage,
        readyForDevelopment: progress.ready_for_development,
        phasesCompleted: progress.phases_completed,
      });
      setCurrentStepData(normalizeStep(result.step_details));
      setCanComplete(false);
      setLastAiAnalysis(result.step_details?.ai_analysis || '');
    } catch (err) {
      console.error('Failed to fast-track framework:', err);
      setError('Failed to fast-track framework.');
    } finally {
      setIsQuickActionLoading(false);
    }
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackState(helpful ? 'helpful' : 'not_helpful');
    trackEvent('feedback', 'framework_helpfulness', helpful ? 'helpful' : 'not_helpful', undefined, {
      projectId,
      idea,
      step: currentStepData?.number,
      ready_for_dev: frameworkState?.readyForDevelopment,
    });
  };

  const submitBug = () => {
    if (!bugText.trim()) {
      setIsBugOpen(false);
      return;
    }
    trackEvent('feedback', 'bug_report', 'framework_panel', undefined, {
      projectId,
      idea,
      step: currentStepData?.number,
      ready_for_dev: frameworkState?.readyForDevelopment,
      message: bugText.trim(),
    });
    setBugText('');
    setIsBugOpen(false);
  };

  // Method to update analysis from chat
  const updateAnalysis = (analysis: string) => {
    setLastAiAnalysis(analysis);
    setCanComplete(true);
  };

  // Expose method for parent component
  useEffect(() => {
    (window as Window & { updateFrameworkAnalysis?: (analysis: string) => void }).updateFrameworkAnalysis = updateAnalysis;
    return () => {
      delete (window as Window & { updateFrameworkAnalysis?: (analysis: string) => void }).updateFrameworkAnalysis;
    };
  }, []);

  if (isLoading && !frameworkState) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Initializing MIT 24-Step Framework...</span>
        </div>

        {/* Feedback & bug report */}
        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Was this step helpful?</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleFeedback(true)}
                className={`px-3 py-1.5 rounded-lg border text-sm ${feedbackState === 'helpful' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                👍 Helpful
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className={`px-3 py-1.5 rounded-lg border text-sm ${feedbackState === 'not_helpful' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                👎 Not really
              </button>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <button
              onClick={() => setIsBugOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              🐞 Report a bug or issue
            </button>
          </div>
          {isBugOpen && (
            <div className="flex flex-col gap-2">
              <textarea
                value={bugText}
                onChange={(e) => setBugText(e.target.value)}
                rows={3}
                placeholder="What went wrong? Include expected vs actual and any step/context."
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setBugText('');
                    setIsBugOpen(false);
                  }}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBug}
                  className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={!bugText.trim()}
                >
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Progress Panel */}
      {frameworkState && (
        <FrameworkProgress
          currentStep={frameworkState.currentStep}
          currentPhase={frameworkState.currentPhase}
          completedSteps={frameworkState.completedSteps}
          totalSteps={frameworkState.totalSteps}
          progressPercentage={frameworkState.progressPercentage}
          readyForDevelopment={frameworkState.readyForDevelopment}
          phasesCompleted={frameworkState.phasesCompleted}
        />
      )}

      {/* Current Step Panel (Collapsible) */}
      {currentStepData && (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Current Step Details
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {isExpanded && (
            <div className="border-x border-b border-gray-200 dark:border-gray-700 rounded-b-lg overflow-hidden">
              {STEP_GUIDANCE[currentStepData.number] && (
                <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Guidance available for this step.</span>
                </div>
              )}
              <FrameworkStepPanel
                step={currentStepData}
                onComplete={handleCompleteStep}
                onSkip={handleSkipStep}
                onPrevious={handlePreviousStep}
                isFirstStep={currentStepData.number === 1}
                isLastStep={currentStepData.number === 24}
                canComplete={canComplete}
                tips={STEP_GUIDANCE[currentStepData.number]?.tips}
                examples={STEP_GUIDANCE[currentStepData.number]?.examples}
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleInitializeSample}
          disabled={isQuickActionLoading || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Sample project
        </button>
        <button
          onClick={handleFastTrack}
          disabled={isQuickActionLoading || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-sm"
        >
          <FastForward className="w-4 h-4" />
          Fast-track (skip to build)
        </button>

        {frameworkState?.readyForDevelopment && (
          <button
            onClick={handleStartDevelopment}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Code className="w-4 h-4" />
            Start Development
          </button>
        )}
        
        {frameworkState && frameworkState.completedSteps > 0 && (
          <button
            onClick={handleExportDocument}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export Analysis
          </button>
        )}
        
        {!frameworkState?.readyForDevelopment && frameworkState && frameworkState.completedSteps >= 6 && (
          <button
            onClick={handleStartDevelopment}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            Skip to Development
          </button>
        )}
      </div>

      {/* Framework Complete Message */}
      {frameworkState?.readyForDevelopment && !currentStepData && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Framework Analysis Complete!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You've successfully completed the MIT 24-Step Disciplined Entrepreneurship analysis.
              Your idea is now well-defined and ready for development.
            </p>
            <button
              onClick={handleStartDevelopment}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 transition-all font-medium"
            >
              <Code className="w-5 h-5" />
              Start Building Your Product
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrameworkPanel;
