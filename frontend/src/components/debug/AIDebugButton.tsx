import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Check, Zap } from 'lucide-react';
import { useStore, useCurrentProjectFiles } from '../../store/useStore';
import { autoDebugger } from '../../services/autoDebugger';
import { cn } from '../../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AIDebugButtonProps {
  className?: string;
  onFixesApplied?: () => void;
}

interface AIFix {
  error_id: string;
  file: string;
  line: number;
  old_code: string;
  new_code: string;
  explanation: string;
}

interface AIDebugResponse {
  success: boolean;
  analysis: string;
  fixes: AIFix[];
  suggestions: string[];
}

export const AIDebugButton: React.FC<AIDebugButtonProps> = ({ className, onFixesApplied }) => {
  const { currentProject, setProjectFiles, aiProvider } = useStore();
  const files = useCurrentProjectFiles();
  
  const [isDebugging, setIsDebugging] = useState(false);
  const [result, setResult] = useState<AIDebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const runAIDebug = async () => {
    if (!currentProject || files.length === 0) return;

    setIsDebugging(true);
    setError(null);
    setResult(null);

    try {
      // Get current errors from auto-debugger
      const session = autoDebugger.getSession(currentProject.id);
      const errors = session ? [...session.errors, ...session.warnings] : [];

      if (errors.length === 0) {
        setResult({
          success: true,
          analysis: 'No errors found! Your code looks clean.',
          fixes: [],
          suggestions: ['Keep up the good work!'],
        });
        setShowResult(true);
        setIsDebugging(false);
        return;
      }

      // Prepare files as Record<string, string>
      const filesMap: Record<string, string> = {};
      for (const file of files) {
        filesMap[file.path] = file.content;
      }

      // Call AI debug endpoint
      const response = await fetch(`${API_BASE_URL}/api/chat/auto-debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errors: errors.map(e => ({
            id: e.id,
            file: e.file,
            line: e.line,
            column: e.column,
            message: e.message,
            severity: e.severity,
            category: e.category,
          })),
          files: filesMap,
          ai_provider: aiProvider,
          project_id: currentProject.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI debug response');
      }

      const data: AIDebugResponse = await response.json();
      setResult(data);
      setShowResult(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI debugging failed');
    } finally {
      setIsDebugging(false);
    }
  };

  const applyAIFixes = () => {
    if (!currentProject || !result?.fixes.length) return;

    const updatedFiles = [...files];

    for (const fix of result.fixes) {
      const fileIndex = updatedFiles.findIndex(f => f.path === fix.file);
      if (fileIndex === -1) continue;

      const file = updatedFiles[fileIndex];
      const newContent = file.content.replace(fix.old_code, fix.new_code);
      
      if (newContent !== file.content) {
        updatedFiles[fileIndex] = {
          ...file,
          content: newContent,
        };
      }
    }

    setProjectFiles(currentProject.id, updatedFiles);
    onFixesApplied?.();
    setShowResult(false);
    setResult(null);

    // Re-analyze after fixes
    setTimeout(() => {
      autoDebugger.analyzeFiles(currentProject.id, updatedFiles);
    }, 100);
  };

  const errorCount = autoDebugger.getErrorCount(currentProject?.id || '');
  const hasErrors = errorCount.errors > 0 || errorCount.warnings > 0;

  return (
    <>
      {/* AI Debug Button */}
      <button
        onClick={runAIDebug}
        disabled={isDebugging || !currentProject}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          hasErrors
            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
            : "bg-secondary hover:bg-secondary/80 text-muted-foreground",
          isDebugging && "opacity-75 cursor-wait",
          className
        )}
        title="Run AI-powered debugging"
      >
        {isDebugging ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            AI Debug
            {hasErrors && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {errorCount.errors + errorCount.warnings}
              </span>
            )}
          </>
        )}
      </button>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-red-500/90 text-white rounded-xl shadow-lg max-w-md animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">AI Debug Failed</p>
              <p className="text-sm opacity-90 mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-white/80 hover:text-white">×</button>
          </div>
        </div>
      )}

      {/* Result modal */}
      {showResult && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold">AI Debug Analysis</h2>
                  <p className="text-xs text-muted-foreground">
                    {result.fixes.length} fix{result.fixes.length !== 1 ? 'es' : ''} found
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResult(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="overflow-auto max-h-[60vh] p-6 space-y-4">
              {/* Analysis */}
              <div className="p-4 bg-secondary/50 rounded-xl">
                <h3 className="text-sm font-medium mb-2">Analysis</h3>
                <p className="text-sm text-muted-foreground">{result.analysis}</p>
              </div>

              {/* Fixes */}
              {result.fixes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Suggested Fixes</h3>
                  {result.fixes.map((fix, i) => (
                    <div key={i} className="p-4 bg-secondary/30 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-muted-foreground">{fix.file}:{fix.line}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-2">
                        <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                          <span className="text-red-400 text-[10px] uppercase tracking-wider">Remove</span>
                          <pre className="mt-1 text-red-300 whitespace-pre-wrap">{fix.old_code}</pre>
                        </div>
                        <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                          <span className="text-green-400 text-[10px] uppercase tracking-wider">Add</span>
                          <pre className="mt-1 text-green-300 whitespace-pre-wrap">{fix.new_code}</pre>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{fix.explanation}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <h3 className="text-sm font-medium mb-2 text-blue-400">Suggestions</h3>
                  <ul className="space-y-1">
                    {result.suggestions.map((suggestion, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30">
              <button
                onClick={() => setShowResult(false)}
                className="px-4 py-2 text-sm hover:bg-secondary rounded-lg transition-colors"
              >
                Close
              </button>
              {result.fixes.length > 0 && (
                <button
                  onClick={applyAIFixes}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  <Zap className="w-4 h-4" />
                  Apply All Fixes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIDebugButton;
