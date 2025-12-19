import React from 'react';
import { Undo2, Redo2, History } from 'lucide-react';
import { useStore, useCanUndo, useCanRedo, useFileHistoryInfo } from '../../store/useStore';
import { cn } from '../../lib/utils';

interface UndoRedoToolbarProps {
  projectId: string | undefined;
  className?: string;
}

export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({ projectId, className }) => {
  const { undo, redo } = useStore();
  const canUndo = useCanUndo(projectId);
  const canRedo = useCanRedo(projectId);
  const historyInfo = useFileHistoryInfo(projectId);

  if (!projectId) return null;

  const handleUndo = () => {
    if (canUndo) {
      undo(projectId);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      redo(projectId);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Undo Button */}
      <button
        onClick={handleUndo}
        disabled={!canUndo}
        className={cn(
          "p-2 rounded-lg transition-all flex items-center gap-1.5",
          canUndo 
            ? "hover:bg-secondary text-foreground" 
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        title={canUndo ? `Undo: ${historyInfo.description}` : "Nothing to undo"}
      >
        <Undo2 className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Undo</span>
      </button>

      {/* Redo Button */}
      <button
        onClick={handleRedo}
        disabled={!canRedo}
        className={cn(
          "p-2 rounded-lg transition-all flex items-center gap-1.5",
          canRedo 
            ? "hover:bg-secondary text-foreground" 
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        title={canRedo ? "Redo" : "Nothing to redo"}
      >
        <Redo2 className="w-4 h-4" />
        <span className="text-xs hidden sm:inline">Redo</span>
      </button>

      {/* History Info */}
      {historyInfo.total > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
          <History className="w-3.5 h-3.5" />
          <span>{historyInfo.current}/{historyInfo.total}</span>
        </div>
      )}
    </div>
  );
};

export default UndoRedoToolbar;
