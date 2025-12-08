import React, { useEffect, useState, useCallback } from 'react';
import { 
  Package, 
  RefreshCw, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileJson,
  FileText,
  Sparkles
} from 'lucide-react';
import { dependenciesAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface DependencyAnalysis {
  project_type: string;
  python_dependencies: string[];
  javascript_dependencies: string[];
  has_package_json: boolean;
  has_requirements_txt: boolean;
  recommendations: {
    required: string[];
    recommended: string[];
    optional: string[];
  };
}

export const DependenciesPanel: React.FC = () => {
  const { currentProject } = useStore();
  const [analysis, setAnalysis] = useState<DependencyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const analyzeProject = useCallback(async () => {
    if (!currentProject?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await dependenciesAPI.analyzeProject(currentProject.id);
      setAnalysis(result);
    } catch (err) {
      setError('Failed to analyze dependencies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  const generateDependencyFiles = async () => {
    if (!currentProject?.id) return;
    
    setGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await dependenciesAPI.generateForProject(currentProject.id);
      
      if (result.saved_files.length > 0) {
        setSuccess(`Generated: ${result.saved_files.join(', ')}`);
      } else if (result.generated_files.length > 0) {
        setSuccess('Dependency files already exist');
      } else {
        setSuccess('No dependencies to generate');
      }
      
      // Refresh analysis
      await analyzeProject();
    } catch (err) {
      setError('Failed to generate dependency files');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (currentProject?.id) {
      analyzeProject();
    }
  }, [currentProject?.id, analyzeProject]);

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a project to view dependencies</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Dependencies</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={analyzeProject}
            disabled={loading}
            className="p-1.5 hover:bg-accent rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={generateDependencyFiles}
            disabled={generating || loading}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            title="Generate dependency files"
          >
            {generating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            Generate
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-2 bg-red-500/10 text-red-500 rounded text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-2 bg-green-500/10 text-green-500 rounded text-sm">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : analysis ? (
          <>
            {/* Project Type */}
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">Project Type</div>
              <div className="font-medium capitalize">{analysis.project_type}</div>
            </div>

            {/* Dependency Files Status */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Dependency Files</div>
              <div className="flex gap-2">
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  analysis.has_package_json 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-secondary text-muted-foreground"
                )}>
                  <FileJson className="w-4 h-4" />
                  package.json
                  {analysis.has_package_json && <CheckCircle className="w-3 h-3" />}
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                  analysis.has_requirements_txt 
                    ? "bg-green-500/10 text-green-500" 
                    : "bg-secondary text-muted-foreground"
                )}>
                  <FileText className="w-4 h-4" />
                  requirements.txt
                  {analysis.has_requirements_txt && <CheckCircle className="w-3 h-3" />}
                </div>
              </div>
            </div>

            {/* Python Dependencies */}
            {analysis.python_dependencies.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <span className="text-yellow-500">🐍</span>
                  Python ({analysis.python_dependencies.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.python_dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="px-2 py-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded text-xs"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* JavaScript Dependencies */}
            {analysis.javascript_dependencies.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <span className="text-yellow-400">⚡</span>
                  JavaScript ({analysis.javascript_dependencies.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.javascript_dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {(analysis.recommendations.required.length > 0 ||
              analysis.recommendations.recommended.length > 0) && (
              <div className="space-y-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Recommendations
                </div>
                
                {analysis.recommendations.required.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Required</div>
                    <div className="flex flex-wrap gap-1">
                      {analysis.recommendations.required.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {analysis.recommendations.recommended.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Recommended</div>
                    <div className="flex flex-wrap gap-1">
                      {analysis.recommendations.recommended.map((dep) => (
                        <span
                          key={dep}
                          className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                        >
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {analysis.python_dependencies.length === 0 && 
             analysis.javascript_dependencies.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No dependencies detected</p>
                <p className="text-xs mt-1">Start building your app to detect dependencies</p>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
