import React from 'react';
import { FileCode, ChevronDown, ChevronUp, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { RelevantFile } from '../../services/smartContext';

interface SmartContextIndicatorProps {
  relevantFiles: RelevantFile[];
  onRemoveFile: (path: string) => void;
  className?: string;
}

export const SmartContextIndicator: React.FC<SmartContextIndicatorProps> = ({
  relevantFiles,
  onRemoveFile,
  className,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (relevantFiles.length === 0) return null;

  return (
    <div className={cn("bg-secondary/30 border border-border/50 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm">
          <FileCode className="w-4 h-4 text-primary" />
          <span className="font-medium">Smart Context</span>
          <span className="text-muted-foreground">
            ({relevantFiles.length} file{relevantFiles.length !== 1 ? 's' : ''} included)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            These files will be included in the AI context based on your message
          </p>
          <div className="flex flex-wrap gap-2">
            {relevantFiles.map(({ file, reason }) => (
              <div
                key={file.path}
                className="group flex items-center gap-1.5 px-2 py-1 bg-background rounded-lg text-xs border border-border/50"
                title={reason}
              >
                <FileCode className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono">{file.path}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.path);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity"
                  title="Remove from context"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartContextIndicator;
