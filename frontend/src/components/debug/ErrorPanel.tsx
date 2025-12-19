import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Wrench,
  ChevronDown,
  ChevronRight,
  FileCode,
  Sparkles,
  Check,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { autoDebugger, type CodeError, type DebugSession } from '../../services/autoDebugger';
import { useStore, useCurrentProjectFiles } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface ErrorPanelProps {
  onFixApplied?: (files: Array<{ path: string; content: string }>) => void;
  className?: string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ onFixApplied, className }) => {
  const { currentProject, setProjectFiles } = useStore();
  const files = useCurrentProjectFiles();
  
  const [session, setSession] = useState<DebugSession | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [recentlyFixed, setRecentlyFixed] = useState<Set<string>>(new Set());

  // Subscribe to debug session updates
  useEffect(() => {
    const unsubscribe = autoDebugger.subscribe(setSession);
    return unsubscribe;
  }, []);

  // Analyze files when they change
  useEffect(() => {
    if (currentProject && files.length > 0) {
      autoDebugger.scheduleAnalysis(currentProject.id, files);
    }
  }, [currentProject, files]);

  // Manually trigger analysis
  const refreshAnalysis = useCallback(() => {
    if (currentProject && files.length > 0) {
      autoDebugger.analyzeFiles(currentProject.id, files);
    }
  }, [currentProject, files]);

  // Apply a single fix
  const applyFix = useCallback((errorId: string) => {
    if (!currentProject) return;

    const result = autoDebugger.applyFix(currentProject.id, errorId, files);
    if (result) {
      setProjectFiles(currentProject.id, result);
      onFixApplied?.(result);
      
      // Show fixed indicator
      setRecentlyFixed(prev => new Set([...prev, errorId]));
      setTimeout(() => {
        setRecentlyFixed(prev => {
          const next = new Set(prev);
          next.delete(errorId);
          return next;
        });
      }, 2000);
    }
  }, [currentProject, files, setProjectFiles, onFixApplied]);

  // Apply all fixes
  const applyAllFixes = useCallback(async () => {
    if (!currentProject) return;

    setIsAutoFixing(true);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = autoDebugger.applyAllFixes(currentProject.id, files);
    setProjectFiles(currentProject.id, result);
    onFixApplied?.(result);

    setIsAutoFixing(false);
  }, [currentProject, files, setProjectFiles, onFixApplied]);

  // Toggle file expansion
  const toggleFile = (file: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  // Group errors by file
  const errorsByFile = React.useMemo(() => {
    if (!session) return new Map<string, CodeError[]>();
    
    const grouped = new Map<string, CodeError[]>();
    const allErrors = [...session.errors, ...session.warnings];
    
    for (const error of allErrors) {
      const existing = grouped.get(error.file) || [];
      existing.push(error);
      grouped.set(error.file, existing);
    }
    
    return grouped;
  }, [session]);

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  // Get category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'syntax':
        return 'bg-red-500/20 text-red-400';
      case 'runtime':
        return 'bg-orange-500/20 text-orange-400';
      case 'type':
        return 'bg-purple-500/20 text-purple-400';
      case 'lint':
        return 'bg-blue-500/20 text-blue-400';
      case 'logic':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'style':
        return 'bg-cyan-500/20 text-cyan-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const totalErrors = session?.errors.length || 0;
  const totalWarnings = session?.warnings.length || 0;
  const fixableCount = [...(session?.errors || []), ...(session?.warnings || [])].filter(e => e.autoFixable).length;

  if (!currentProject) {
    return (
      <div className={cn("flex items-center justify-center p-4 text-muted-foreground", className)}>
        <p className="text-sm">Select a project to see diagnostics</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-semibold">Auto Debug</span>
          
          {/* Error counts */}
          <div className="flex items-center gap-2 ml-2">
            {totalErrors > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                <AlertCircle className="w-3 h-3" />
                {totalErrors}
              </span>
            )}
            {totalWarnings > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                {totalWarnings}
              </span>
            )}
            {totalErrors === 0 && totalWarnings === 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                <Check className="w-3 h-3" />
                No issues
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-fix all button */}
          {fixableCount > 0 && (
            <button
              onClick={applyAllFixes}
              disabled={isAutoFixing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isAutoFixing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Fix All ({fixableCount})
                </>
              )}
            </button>
          )}

          {/* Refresh button */}
          <button
            onClick={refreshAnalysis}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
            title="Re-analyze files"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error list */}
      <div className="flex-1 overflow-auto">
        {errorsByFile.size === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Check className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-sm font-medium">All clear!</p>
            <p className="text-xs mt-1">No errors or warnings detected</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Array.from(errorsByFile.entries()).map(([file, errors]) => (
              <div key={file} className="bg-card">
                {/* File header */}
                <button
                  onClick={() => toggleFile(file)}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-secondary/50 transition-colors"
                >
                  {expandedFiles.has(file) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <FileCode className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium truncate">{file}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {errors.length} issue{errors.length !== 1 ? 's' : ''}
                  </span>
                </button>

                {/* Errors for this file */}
                {expandedFiles.has(file) && (
                  <div className="border-t border-border">
                    {errors.map((error) => (
                      <div
                        key={error.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors border-l-2",
                          error.severity === 'error' ? 'border-l-red-500' : 
                          error.severity === 'warning' ? 'border-l-yellow-500' : 'border-l-blue-500',
                          recentlyFixed.has(error.id) && 'bg-green-500/10'
                        )}
                      >
                        {/* Severity icon */}
                        <div className="mt-0.5">
                          {recentlyFixed.has(error.id) ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            getSeverityIcon(error.severity)
                          )}
                        </div>

                        {/* Error details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm">{error.message}</span>
                            <span className={cn("px-1.5 py-0.5 rounded text-xs", getCategoryColor(error.category))}>
                              {error.category}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Line {error.line}, Column {error.column}
                            {error.code && <span className="ml-2">({error.code})</span>}
                          </div>
                          {error.suggestion && (
                            <p className="text-xs text-blue-400 mt-1">{error.suggestion}</p>
                          )}
                        </div>

                        {/* Fix button */}
                        {error.autoFixable && error.fix && !recentlyFixed.has(error.id) && (
                          <button
                            onClick={() => applyFix(error.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded text-xs transition-colors"
                            title={error.fix.description}
                          >
                            <Wrench className="w-3 h-3" />
                            Fix
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      {session && (
        <div className="px-4 py-2 border-t border-border bg-secondary/30 text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>
              {session.fixedCount > 0 && `${session.fixedCount} fixed • `}
              Last analyzed: {new Date(session.lastAnalyzed).toLocaleTimeString()}
            </span>
            <span>{files.length} files scanned</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorPanel;
