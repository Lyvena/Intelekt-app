import React, { useState } from 'react';
import { 
  History, 
  RotateCcw, 
  ChevronRight, 
  Pin, 
  Clock, 
  FileCode, 
  Check,
  X,
  Undo2,
  Redo2,
  AlertCircle,
} from 'lucide-react';
import { useStore, useCanUndo, useCanRedo, useFileHistoryInfo } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface VersionHistoryPanelProps {
  className?: string;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({ className }) => {
  const { 
    currentProject, 
    fileHistory, 
    fileHistoryIndex, 
    undo, 
    redo, 
    rollbackTo,
    createCheckpoint,
  } = useStore();
  
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const projectId = currentProject?.id;
  const canUndo = useCanUndo(projectId);
  const canRedo = useCanRedo(projectId);
  const historyInfo = useFileHistoryInfo(projectId);
  
  const history = projectId ? fileHistory[projectId] || [] : [];
  const currentIndex = projectId ? fileHistoryIndex[projectId] ?? -1 : -1;

  const handleUndo = () => {
    if (projectId && canUndo) {
      undo(projectId);
    }
  };

  const handleRedo = () => {
    if (projectId && canRedo) {
      redo(projectId);
    }
  };

  const handleRollback = (index: number) => {
    if (projectId && index !== currentIndex) {
      rollbackTo(projectId, index);
    }
  };

  const handleCreateCheckpoint = () => {
    if (projectId && checkpointName.trim()) {
      createCheckpoint(projectId, checkpointName.trim());
      setCheckpointName('');
      setIsCreatingCheckpoint(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const isCheckpoint = (description: string) => description.startsWith('📌');

  if (!currentProject) {
    return (
      <div className={cn("empty-state", className)}>
        <History className="empty-state-icon" />
        <p className="empty-state-title">No Project Selected</p>
        <p className="empty-state-description">Select a project to view its version history</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-card/50 backdrop-blur-sm panel-appear", className)}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">
          <div className="p-1.5 rounded-md bg-primary/10">
            <History className="w-4 h-4 text-primary" />
          </div>
          <span>Version History</span>
          {history.length > 0 && (
            <span className="status-badge status-badge-info">
              {historyInfo.current}/{historyInfo.total}
            </span>
          )}
        </div>
        
        {/* Quick undo/redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={cn(
              "p-1.5 rounded transition-colors",
              canUndo ? "hover:bg-accent text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={cn(
              "p-1.5 rounded transition-colors",
              canRedo ? "hover:bg-accent text-foreground" : "text-muted-foreground/40 cursor-not-allowed"
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Create Checkpoint */}
      <div className="px-3 py-2 border-b border-border">
        {isCreatingCheckpoint ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCheckpoint();
                if (e.key === 'Escape') setIsCreatingCheckpoint(false);
              }}
              placeholder="Checkpoint name..."
              className="flex-1 px-2 py-1 text-xs bg-secondary rounded border border-border focus:border-primary focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleCreateCheckpoint}
              disabled={!checkpointName.trim()}
              className="p-1 hover:bg-accent rounded text-green-500 disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsCreatingCheckpoint(false)}
              className="p-1 hover:bg-accent rounded text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreatingCheckpoint(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
          >
            <Pin className="w-3.5 h-3.5" />
            Create Checkpoint
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-auto">
        {history.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No history yet</p>
            <p className="text-xs mt-1 opacity-70">Changes will appear here</p>
          </div>
        ) : (
          <div className="py-1">
            {[...history].reverse().map((entry, reversedIndex) => {
              const actualIndex = history.length - 1 - reversedIndex;
              const isCurrent = actualIndex === currentIndex;
              const isCheckpointEntry = isCheckpoint(entry.description);
              const isExpanded = expandedIndex === actualIndex;
              
              return (
                <div
                  key={`${entry.timestamp}-${actualIndex}`}
                  className={cn(
                    "group px-3 py-2 border-l-2 transition-colors cursor-pointer",
                    isCurrent 
                      ? "bg-primary/10 border-l-primary" 
                      : "border-l-transparent hover:bg-accent/50",
                    isCheckpointEntry && "bg-yellow-500/5"
                  )}
                  onClick={() => handleRollback(actualIndex)}
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <div className={cn(
                      "mt-0.5 p-1 rounded",
                      isCheckpointEntry ? "bg-yellow-500/20 text-yellow-500" : "bg-secondary text-muted-foreground"
                    )}>
                      {isCheckpointEntry ? (
                        <Pin className="w-3 h-3" />
                      ) : (
                        <FileCode className="w-3 h-3" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium truncate",
                          isCurrent && "text-primary"
                        )}>
                          {isCheckpointEntry 
                            ? entry.description.replace('📌 ', '') 
                            : entry.description || 'Code change'
                          }
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5">
                        <Clock className="w-3 h-3 text-muted-foreground/70" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(entry.timestamp)}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          • {entry.files.length} files
                        </span>
                      </div>
                    </div>
                    
                    {/* Rollback button */}
                    {!isCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRollback(actualIndex);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded text-muted-foreground transition-opacity"
                        title="Rollback to this version"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    {/* Expand button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedIndex(isExpanded ? null : actualIndex);
                      }}
                      className="p-1 hover:bg-accent rounded text-muted-foreground"
                    >
                      <ChevronRight className={cn(
                        "w-3.5 h-3.5 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    </button>
                  </div>
                  
                  {/* Expanded file list */}
                  {isExpanded && (
                    <div className="mt-2 ml-7 space-y-1">
                      {entry.files.map((file) => (
                        <div
                          key={file.path}
                          className="flex items-center gap-2 text-[10px] text-muted-foreground py-0.5 px-2 bg-secondary/50 rounded"
                        >
                          <FileCode className="w-3 h-3" />
                          <span className="truncate">{file.path}</span>
                          <span className="text-muted-foreground/50 ml-auto">
                            {file.content.split('\n').length} lines
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with tips */}
      <div className="px-3 py-2 border-t border-border bg-secondary/30">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Tip: Create checkpoints before major changes</span>
          <div className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 bg-secondary rounded">⌘Z</kbd>
            <span>undo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryPanel;
