import React, { useState, useEffect } from 'react';
import { collaborationService, type UserPresence } from '../../services/collaboration';
import { cn } from '../../lib/utils';

interface CollaboratorCursorsProps {
  editorRef?: React.RefObject<HTMLDivElement>;
  lineHeight?: number;
  charWidth?: number;
}

// Individual cursor component
const CursorWidget: React.FC<{
  user: UserPresence;
  lineHeight: number;
  charWidth: number;
}> = ({ user, lineHeight, charWidth }) => {
  const [isNameVisible, setIsNameVisible] = useState(true);

  // Hide name after 3 seconds of inactivity
  useEffect(() => {
    const timer = setTimeout(() => setIsNameVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [user.cursor]);

  // Show name on cursor movement
  useEffect(() => {
    setIsNameVisible(true);
  }, [user.cursor?.lineNumber, user.cursor?.column]);

  if (!user.cursor) return null;

  const top = (user.cursor.lineNumber - 1) * lineHeight;
  const left = (user.cursor.column - 1) * charWidth;

  return (
    <div
      className="absolute pointer-events-none z-50 transition-all duration-75"
      style={{ top, left }}
    >
      {/* Cursor line */}
      <div
        className="w-0.5 animate-pulse"
        style={{
          height: lineHeight,
          backgroundColor: user.color,
        }}
      />

      {/* Selection highlight */}
      {user.cursor.selection && (
        <SelectionHighlight
          selection={user.cursor.selection}
          color={user.color}
          lineHeight={lineHeight}
          charWidth={charWidth}
        />
      )}

      {/* User name label */}
      {isNameVisible && (
        <div
          className="absolute -top-5 left-0 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-lg animate-in fade-in slide-in-from-bottom-1"
          style={{ backgroundColor: user.color }}
        >
          {user.name}
          {user.isTyping && (
            <span className="ml-1 opacity-75">typing...</span>
          )}
        </div>
      )}
    </div>
  );
};

// Selection highlight component
const SelectionHighlight: React.FC<{
  selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  color: string;
  lineHeight: number;
  charWidth: number;
}> = ({ selection, color, lineHeight, charWidth }) => {
  const lines = [];
  
  for (let line = selection.startLineNumber; line <= selection.endLineNumber; line++) {
    const isFirstLine = line === selection.startLineNumber;
    const isLastLine = line === selection.endLineNumber;
    
    const startCol = isFirstLine ? selection.startColumn : 1;
    const endCol = isLastLine ? selection.endColumn : 100; // Approximate line length
    
    const top = (line - selection.startLineNumber) * lineHeight;
    const left = (startCol - 1) * charWidth;
    const width = (endCol - startCol) * charWidth;

    lines.push(
      <div
        key={line}
        className="absolute opacity-20"
        style={{
          top,
          left,
          width: Math.max(width, charWidth),
          height: lineHeight,
          backgroundColor: color,
        }}
      />
    );
  }

  return <>{lines}</>;
};

// Main component
export const CollaboratorCursors: React.FC<CollaboratorCursorsProps> = ({
  lineHeight = 20,
  charWidth = 8,
}) => {
  const [users, setUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    const unsubscribe = collaborationService.subscribe((state) => {
      // Filter out current user
      const otherUsers = state.users.filter(
        (u) => u.id !== collaborationService.getCurrentUser().id
      );
      setUsers(otherUsers);
    });

    return unsubscribe;
  }, []);

  if (users.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {users.map((user) => (
        <CursorWidget
          key={user.id}
          user={user}
          lineHeight={lineHeight}
          charWidth={charWidth}
        />
      ))}
    </div>
  );
};

// Collaborator avatars bar
export const CollaboratorBar: React.FC<{ className?: string }> = ({ className }) => {
  const [users, setUsers] = useState<UserPresence[]>([]);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    const unsubscribe = collaborationService.subscribe((state) => {
      setUsers(state.users);
    });
    return unsubscribe;
  }, []);

  if (users.length <= 1) return null;

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setShowList(!showList)}
        className="flex items-center -space-x-2 hover:opacity-80 transition-opacity"
      >
        {users.slice(0, 5).map((user) => (
          <div
            key={user.id}
            className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white relative"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
            {user.isTyping && (
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-background animate-pulse" />
            )}
          </div>
        ))}
        {users.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-xs font-medium">
            +{users.length - 5}
          </div>
        )}
      </button>

      {/* Dropdown list */}
      {showList && (
        <div className="absolute top-full right-0 mt-2 w-64 p-2 bg-card border border-border rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
          <p className="px-2 py-1 text-xs text-muted-foreground font-medium">
            {users.length} collaborator{users.length !== 1 ? 's' : ''} online
          </p>
          <div className="mt-1 space-y-1">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name}
                    {user.id === collaborationService.getCurrentUser().id && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </p>
                  {user.cursor && (
                    <p className="text-xs text-muted-foreground">
                      Line {user.cursor.lineNumber}
                    </p>
                  )}
                </div>
                {user.isTyping && (
                  <span className="text-xs text-green-500">typing...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorCursors;
