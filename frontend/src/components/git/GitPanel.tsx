import React, { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Plus,
  Minus,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileCode,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { gitAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface GitStatus {
  is_repo: boolean;
  branch?: string;
  staged: Array<{ path: string; status: string }>;
  unstaged: Array<{ path: string; status: string }>;
  untracked: string[];
  has_changes: boolean;
}

interface Commit {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  date: string;
}

interface Branch {
  name: string;
  is_current: boolean;
}

interface Diff {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  diff_content: string;
}

type TabType = 'changes' | 'history' | 'branches';

export const GitPanel: React.FC = () => {
  const { currentProject } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [diffs, setDiffs] = useState<Diff[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Commit form
  const [commitMessage, setCommitMessage] = useState('');
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  
  // New branch form
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');

  const loadStatus = useCallback(async () => {
    if (!currentProject?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await gitAPI.getStatus(currentProject.id);
      setStatus(result);
      
      if (result.is_repo && result.has_changes) {
        const diffResult = await gitAPI.getDiff(currentProject.id);
        setDiffs(diffResult.diffs);
      } else {
        setDiffs([]);
      }
    } catch (err) {
      setError('Failed to load git status');
    } finally {
      setLoading(false);
    }
  }, [currentProject?.id]);

  const loadHistory = useCallback(async () => {
    if (!currentProject?.id) return;
    
    try {
      const result = await gitAPI.getLog(currentProject.id, 30);
      setCommits(result.commits);
    } catch (err) {
      console.error('Failed to load commits:', err);
    }
  }, [currentProject?.id]);

  const loadBranches = useCallback(async () => {
    if (!currentProject?.id) return;
    
    try {
      const result = await gitAPI.getBranches(currentProject.id);
      setBranches(result.branches);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    loadStatus();
    loadHistory();
    loadBranches();
  }, [loadStatus, loadHistory, loadBranches]);

  const handleInit = async () => {
    if (!currentProject?.id) return;
    
    setLoading(true);
    try {
      const result = await gitAPI.init(currentProject.id);
      setSuccess(result.message);
      await loadStatus();
      await loadHistory();
    } catch (err) {
      setError('Failed to initialize repository');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!currentProject?.id || !commitMessage.trim()) return;
    
    setCommitting(true);
    setError(null);
    
    try {
      const result = await gitAPI.commit(currentProject.id, commitMessage);
      setSuccess(`Committed: ${result.commit_hash?.slice(0, 7)}`);
      setCommitMessage('');
      await loadStatus();
      await loadHistory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create commit');
    } finally {
      setCommitting(false);
    }
  };

  const handleDiscard = async () => {
    if (!currentProject?.id) return;
    
    if (!confirm('Discard all uncommitted changes?')) return;
    
    try {
      await gitAPI.discardChanges(currentProject.id);
      setSuccess('Changes discarded');
      await loadStatus();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to discard changes');
    }
  };

  const handleCreateBranch = async () => {
    if (!currentProject?.id || !newBranchName.trim()) return;
    
    try {
      await gitAPI.createBranch(currentProject.id, newBranchName);
      setSuccess(`Branch '${newBranchName}' created`);
      setNewBranchName('');
      setShowNewBranch(false);
      await loadBranches();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create branch');
    }
  };

  const handleCheckout = async (branchName: string) => {
    if (!currentProject?.id) return;
    
    try {
      await gitAPI.checkoutBranch(currentProject.id, branchName);
      setSuccess(`Switched to '${branchName}'`);
      await loadStatus();
      await loadBranches();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to switch branch');
    }
  };

  if (!currentProject) {
    return (
      <div className="h-full flex items-center justify-center bg-card text-muted-foreground">
        <div className="text-center">
          <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Select a project for version control</p>
        </div>
      </div>
    );
  }

  // Not a git repo yet
  if (status && !status.is_repo) {
    return (
      <div className="h-full flex flex-col bg-card">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <GitBranch className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Initialize Git Repository</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Track changes and create commits
              </p>
            </div>
            <button
              onClick={handleInit}
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Initialize Repository'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <span className="font-semibold">Git</span>
            {status?.branch && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                {status.branch}
              </span>
            )}
          </div>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="p-1.5 hover:bg-accent rounded transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['changes', 'history', 'branches'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-2 bg-red-500/10 text-red-500 rounded text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-2 bg-green-500/10 text-green-500 rounded text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'changes' && (
          <div className="space-y-4">
            {/* Commit Form */}
            {status?.has_changes && (
              <div className="space-y-2">
                <textarea
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Commit message..."
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCommit}
                    disabled={committing || !commitMessage.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
                  >
                    {committing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <GitCommit className="w-4 h-4" />
                    )}
                    Commit All
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 text-sm"
                    title="Discard all changes"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Changed Files */}
            {status?.has_changes ? (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Changes ({(status.staged?.length || 0) + (status.unstaged?.length || 0) + (status.untracked?.length || 0)})
                </h4>
                
                {/* Staged */}
                {status.staged?.map((file) => (
                  <div key={file.path} className="flex items-center gap-2 text-sm">
                    <Plus className="w-3 h-3 text-green-500" />
                    <FileCode className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.path}</span>
                    <span className="text-xs text-green-500">{file.status}</span>
                  </div>
                ))}
                
                {/* Unstaged */}
                {status.unstaged?.map((file) => (
                  <div key={file.path} className="flex items-center gap-2 text-sm">
                    <Minus className="w-3 h-3 text-yellow-500" />
                    <FileCode className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.path}</span>
                    <span className="text-xs text-yellow-500">{file.status}</span>
                  </div>
                ))}
                
                {/* Untracked */}
                {status.untracked?.map((file) => (
                  <div key={file} className="flex items-center gap-2 text-sm">
                    <Plus className="w-3 h-3 text-blue-500" />
                    <FileCode className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{file}</span>
                    <span className="text-xs text-blue-500">new</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No uncommitted changes</p>
              </div>
            )}

            {/* Diff View */}
            {diffs.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-muted-foreground">Diff</h4>
                {diffs.map((diff) => (
                  <div key={diff.path} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedDiff(expandedDiff === diff.path ? null : diff.path)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-secondary/50 hover:bg-secondary text-sm"
                    >
                      {expandedDiff === diff.path ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="flex-1 text-left truncate">{diff.path}</span>
                      <span className="text-green-500">+{diff.additions}</span>
                      <span className="text-red-500">-{diff.deletions}</span>
                    </button>
                    {expandedDiff === diff.path && (
                      <pre className="p-3 bg-background text-xs overflow-auto max-h-64 font-mono">
                        {diff.diff_content || 'No diff available'}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-2">
            {commits.length > 0 ? (
              commits.map((commit) => (
                <div
                  key={commit.hash}
                  className="flex items-start gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <GitCommit className="w-4 h-4 mt-1 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{commit.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <code className="px-1 py-0.5 bg-background rounded">{commit.short_hash}</code>
                      <span>•</span>
                      <span>{commit.date}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No commits yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'branches' && (
          <div className="space-y-4">
            {/* New Branch */}
            {showNewBranch ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Branch name..."
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim()}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewBranch(false)}
                  className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 text-sm"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBranch(true)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <GitPullRequest className="w-4 h-4" />
                New Branch
              </button>
            )}

            {/* Branch List */}
            <div className="space-y-1">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => !branch.is_current && handleCheckout(branch.name)}
                  disabled={branch.is_current}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                    branch.is_current
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-secondary"
                  )}
                >
                  <GitBranch className="w-4 h-4" />
                  <span className="flex-1 text-left">{branch.name}</span>
                  {branch.is_current && (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
