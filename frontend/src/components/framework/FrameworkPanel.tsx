import React, { useState, useEffect, useCallback } from 'react';
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
  AlertCircle
} from 'lucide-react';

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

const normalizeStep = (step: any): StepData => {
  const number = step?.number ?? step?.step_number ?? 0;
  return {
    number,
    name: step?.name ?? '',
    phase: step?.phase ?? 'customer',
    description: step?.description ?? '',
    key_questions: Array.isArray(step?.key_questions) ? step.key_questions : [],
    deliverables: Array.isArray(step?.deliverables) ? step.deliverables : [],
    status: step?.status ?? 'not_started',
    user_responses: step?.user_responses ?? {},
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
        setIsInitialized(true);
        setFrameworkState({
          currentStep: progress.current_step,
          currentPhase: progress.current_phase,
          completedSteps: progress.completed_steps,
          totalSteps: progress.total_steps,
          progressPercentage: progress.progress_percentage,
          readyForDevelopment: progress.ready_for_development,
          phasesCompleted: progress.phases_completed,
        });
        
        // Get current step data
        const { step } = await frameworkAPI.getCurrentStep(projectId);
        setCurrentStepData(normalizeStep(step));
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
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Initializing MIT 24-Step Framework...</span>
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
              <FrameworkStepPanel
                step={currentStepData}
                onComplete={handleCompleteStep}
                onSkip={handleSkipStep}
                onPrevious={handlePreviousStep}
                isFirstStep={currentStepData.number === 1}
                isLastStep={currentStepData.number === 24}
                canComplete={canComplete}
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
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
