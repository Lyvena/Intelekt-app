import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Github,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileArchive,
  ExternalLink,
  Lock,
  Unlock,
  FileCode,
  FileText,
} from 'lucide-react';
import { exportAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface ProjectStats {
  total_files: number;
  total_lines: number;
  total_size_bytes: number;
  file_types: Record<string, number>;
  largest_file: string | null;
  largest_file_size: number;
}

export const ExportPanel: React.FC = () => {
  const { currentProject } = useStore();
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // GitHub export form
  const [showGitHubForm, setShowGitHubForm] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [repoDescription, setRepoDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [repoUrl, setRepoUrl] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!currentProject?.id) return;
    
    setLoading(true);
    try {
      const result = await exportAPI.getStats(currentProject.id);
      setStats(result);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadStats();
    // Set default repo name from project
    if (currentProject?.name) {
      setRepoName(currentProject.name.toLowerCase().replace(/\s+/g, '-'));
    }
  }, [loadStats, currentProject?.name]);

  const handleDownload = async () => {
    if (!currentProject?.id) return;
    
    setDownloading(true);
    setError(null);
    
    try {
      const blobUrl = await exportAPI.downloadProject(currentProject.id);
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${currentProject.name || currentProject.id}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
      
      setSuccess('Project downloaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to download project');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleGitHubExport = async () => {
    if (!currentProject?.id || !repoName || !githubToken) return;
    
    setExporting(true);
    setError(null);
    setRepoUrl(null);
    
    try {
      const result = await exportAPI.exportToGitHub(
        currentProject.id,
        repoName,
        githubToken,
        repoDescription,
        isPrivate
      );
      
      if (result.success) {
        setRepoUrl(result.repo_url);
        setSuccess('Successfully exported to GitHub!');
        setShowGitHubForm(false);
      } else {
        setError(result.message);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export to GitHub';
      setError(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center bg-card text-muted-foreground">
        <div className="text-center">
          <Download className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a project to export</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Export Project</h3>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 text-green-500 rounded-lg text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}
        {repoUrl && (
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-lg text-sm hover:bg-blue-500/20 transition-colors"
          >
            <Github className="w-4 h-4" />
            View on GitHub
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        )}

        {/* Project Stats */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : stats && (
          <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium">Project Statistics</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-muted-foreground" />
                <span>{stats.total_files} files</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span>{stats.total_lines.toLocaleString()} lines</span>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <FileArchive className="w-4 h-4 text-muted-foreground" />
                <span>{formatBytes(stats.total_size_bytes)}</span>
              </div>
            </div>
            
            {/* File Types */}
            {Object.keys(stats.file_types).length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2">File Types</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.file_types).map(([ext, count]) => (
                    <span
                      key={ext}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
                    >
                      {ext} ({count})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Download ZIP */}
        <div className="space-y-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Download as ZIP
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Downloads all project files with README and .gitignore
          </p>
        </div>

        {/* GitHub Export */}
        <div className="space-y-2">
          {!showGitHubForm ? (
            <button
              onClick={() => setShowGitHubForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Github className="w-5 h-5" />
              Export to GitHub
            </button>
          ) : (
            <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Github className="w-4 h-4" />
                  Export to GitHub
                </h4>
                <button
                  onClick={() => setShowGitHubForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
              
              {/* Repository Name */}
              <div>
                <label className="text-xs text-muted-foreground">Repository Name</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="my-project"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-xs text-muted-foreground">Description (optional)</label>
                <input
                  type="text"
                  value={repoDescription}
                  onChange={(e) => setRepoDescription(e.target.value)}
                  placeholder="Created with Intelekt AI"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              
              {/* GitHub Token */}
              <div>
                <label className="text-xs text-muted-foreground">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Requires 'repo' scope. <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Create token</a>
                </p>
              </div>
              
              {/* Visibility */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    !isPrivate
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent"
                  )}
                >
                  <Unlock className="w-4 h-4" />
                  Public
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    isPrivate
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent"
                  )}
                >
                  <Lock className="w-4 h-4" />
                  Private
                </button>
              </div>
              
              {/* Export Button */}
              <button
                onClick={handleGitHubExport}
                disabled={exporting || !repoName || !githubToken}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Github className="w-4 h-4" />
                )}
                Create Repository
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
