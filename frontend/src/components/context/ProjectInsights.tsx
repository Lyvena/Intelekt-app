import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  FileCode,
  Layers,
  GitBranch,
  Zap,
  Package,
  Code2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { contextAPI } from '../../services/api';
import { cn } from '../../lib/utils';

interface FileInfo {
  path: string;
  language: string;
  lines: number;
  size: number;
  components: string[];
  functions: string[];
  classes: string[];
  imports: string[];
}

interface CodebaseIndex {
  success: boolean;
  indexed: boolean;
  project_id: string;
  total_files: number;
  total_lines: number;
  tech_stack: Record<string, string>;
  patterns: string[];
  entry_points: string[];
  files: FileInfo[];
  dependencies: Record<string, string[]>;
  indexed_at: string;
}

interface ProjectInsightsProps {
  projectId: string;
  className?: string;
}

const LANGUAGE_ICONS: Record<string, string> = {
  'python': '🐍',
  'javascript': '📜',
  'javascript-react': '⚛️',
  'typescript': '💙',
  'typescript-react': '⚛️',
  'html': '🌐',
  'css': '🎨',
  'json': '📋',
  'markdown': '📝',
  'mojo': '🔥',
};

export const ProjectInsights: React.FC<ProjectInsightsProps> = ({ projectId, className }) => {
  const [index, setIndex] = useState<CodebaseIndex | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'tech']));

  const fetchIndex = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await contextAPI.getCodebaseIndex(projectId);
      setIndex(data as CodebaseIndex);
    } catch (err) {
      setError('Failed to index project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIndex();
  }, [fetchIndex]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const Section: React.FC<{
    id: string;
    title: string;
    icon: React.ReactNode;
    badge?: string | number;
    children: React.ReactNode;
  }> = ({ id, title, icon, badge, children }) => {
    const isExpanded = expandedSections.has(id);
    
    return (
      <div className="border-b border-border/50 last:border-b-0">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-primary">{icon}</span>
          <span className="font-medium text-sm flex-1">{title}</span>
          {badge !== undefined && (
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {badge}
            </span>
          )}
        </button>
        {isExpanded && (
          <div className="px-4 pb-3 slide-in">
            {children}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Indexing codebase...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center p-8 text-destructive", className)}>
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (!index || !index.indexed) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
        <Brain className="w-12 h-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No files to analyze yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Create files to see AI insights
        </p>
      </div>
    );
  }

  return (
    <div className={cn("bg-card rounded-xl border border-border/50 overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Project Understanding</h3>
              <p className="text-xs text-muted-foreground">
                What the AI knows about your project
              </p>
            </div>
          </div>
          <button
            onClick={fetchIndex}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Refresh index"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border/50">
        {/* Overview */}
        <Section id="overview" title="Overview" icon={<Layers className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <FileCode className="w-3.5 h-3.5" />
                <span className="text-xs">Files</span>
              </div>
              <p className="text-lg font-bold">{index.total_files}</p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Code2 className="w-3.5 h-3.5" />
                <span className="text-xs">Lines</span>
              </div>
              <p className="text-lg font-bold">{index.total_lines.toLocaleString()}</p>
            </div>
          </div>
          
          {index.entry_points.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1.5">Entry Points</p>
              <div className="flex flex-wrap gap-1.5">
                {index.entry_points.map((ep) => (
                  <span
                    key={ep}
                    className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md font-mono"
                  >
                    {ep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Tech Stack */}
        <Section 
          id="tech" 
          title="Tech Stack" 
          icon={<Zap className="w-4 h-4" />}
          badge={Object.keys(index.tech_stack).length}
        >
          {Object.keys(index.tech_stack).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(index.tech_stack).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
                >
                  <span className="text-xs text-muted-foreground capitalize">{key}</span>
                  <span className="text-sm font-medium text-primary">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No tech stack detected</p>
          )}
        </Section>

        {/* Patterns */}
        <Section 
          id="patterns" 
          title="Detected Patterns" 
          icon={<Brain className="w-4 h-4" />}
          badge={index.patterns.length}
        >
          {index.patterns.length > 0 ? (
            <div className="space-y-1.5">
              {index.patterns.map((pattern, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{pattern}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No patterns detected yet</p>
          )}
        </Section>

        {/* Files */}
        <Section 
          id="files" 
          title="File Details" 
          icon={<Package className="w-4 h-4" />}
          badge={index.files.length}
        >
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {index.files.map((file) => (
              <div
                key={file.path}
                className="p-2 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{LANGUAGE_ICONS[file.language] || '📄'}</span>
                  <span className="text-xs font-mono truncate flex-1">{file.path}</span>
                  <span className="text-xs text-muted-foreground">{file.lines} lines</span>
                </div>
                
                {/* Components */}
                {file.components.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {file.components.map((comp) => (
                      <span
                        key={comp}
                        className="text-xs px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Functions */}
                {file.functions.length > 0 && file.components.length === 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {file.functions.slice(0, 3).map((func) => (
                      <span
                        key={func}
                        className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded font-mono"
                      >
                        {func}()
                      </span>
                    ))}
                    {file.functions.length > 3 && (
                      <span className="text-xs text-muted-foreground">
                        +{file.functions.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Dependencies */}
        {Object.keys(index.dependencies).length > 0 && (
          <Section 
            id="deps" 
            title="File Dependencies" 
            icon={<GitBranch className="w-4 h-4" />}
            badge={Object.keys(index.dependencies).length}
          >
            <div className="space-y-2 text-xs">
              {Object.entries(index.dependencies).slice(0, 5).map(([file, deps]) => (
                <div key={file} className="p-2 bg-secondary/30 rounded-lg">
                  <p className="font-mono text-muted-foreground truncate">{file}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-muted-foreground">→</span>
                    {deps.map((dep) => (
                      <span key={dep} className="px-1.5 py-0.5 bg-secondary rounded text-xs truncate">
                        {dep.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-secondary/20 text-xs text-muted-foreground text-center">
        Indexed at {new Date(index.indexed_at).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ProjectInsights;
