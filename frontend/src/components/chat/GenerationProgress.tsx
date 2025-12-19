import React from 'react';
import { 
  Brain, 
  FileCode, 
  CheckCircle2, 
  Loader2,
  Sparkles,
  Search,
  Wand2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type GenerationStage = 
  | 'idle'
  | 'analyzing'
  | 'planning'
  | 'generating'
  | 'validating'
  | 'complete'
  | 'error';

interface GenerationProgressProps {
  stage: GenerationStage;
  message?: string;
}

const STAGES = [
  { id: 'analyzing', label: 'Analyzing', icon: Search, description: 'Understanding your request' },
  { id: 'planning', label: 'Planning', icon: Brain, description: 'Designing the solution' },
  { id: 'generating', label: 'Generating', icon: FileCode, description: 'Writing the code' },
  { id: 'validating', label: 'Validating', icon: Wand2, description: 'Checking for errors' },
];

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ stage, message }) => {
  if (stage === 'idle') return null;

  const currentIndex = STAGES.findIndex(s => s.id === stage);
  const isComplete = stage === 'complete';
  const isError = stage === 'error';

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4 slide-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          isComplete ? "bg-green-500/10" : isError ? "bg-red-500/10" : "bg-primary/10"
        )}>
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : isError ? (
            <Sparkles className="w-5 h-5 text-red-500" />
          ) : (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          )}
        </div>
        <div>
          <h4 className="font-semibold text-sm">
            {isComplete ? 'Generation Complete' : isError ? 'Generation Failed' : 'Generating...'}
          </h4>
          <p className="text-xs text-muted-foreground">
            {message || (isComplete ? 'Your code is ready!' : 'AI is working on your request')}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      {!isComplete && !isError && (
        <div className="flex items-center gap-2">
          {STAGES.map((stageItem, index) => {
            const Icon = stageItem.icon;
            const isActive = stageItem.id === stage;
            const isPast = currentIndex > index;
            const isFuture = currentIndex < index;

            return (
              <React.Fragment key={stageItem.id}>
                <div className="flex flex-col items-center flex-1">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                    isActive && "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110",
                    isPast && "bg-green-500/10 text-green-500",
                    isFuture && "bg-secondary text-muted-foreground"
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={cn(
                    "text-xs mt-1.5 font-medium transition-colors",
                    isActive && "text-primary",
                    isPast && "text-green-500",
                    isFuture && "text-muted-foreground"
                  )}>
                    {stageItem.label}
                  </span>
                </div>
                {index < STAGES.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors duration-300 -mt-4",
                    isPast ? "bg-green-500" : "bg-border"
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Animated Progress Bar */}
      {!isComplete && !isError && (
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ 
              width: `${((currentIndex + 1) / STAGES.length) * 100}%`,
              animation: 'pulse 2s ease-in-out infinite'
            }}
          />
        </div>
      )}

      {/* Success Animation */}
      {isComplete && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">All steps completed successfully</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerationProgress;
