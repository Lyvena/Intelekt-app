import React, { useCallback, useRef, useState, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { Save, X, Play, Undo2, Redo2, Users, Wifi, WifiOff } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { collaborationService, type User, type CollaborationState } from '../../services/collaboration';
import type { editor } from 'monaco-editor';
import * as Y from 'yjs';

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    mojo: 'python',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    sql: 'sql',
    sh: 'shell',
    bash: 'shell',
  };
  return languageMap[ext || ''] || 'plaintext';
};

// User avatar component
const UserAvatar: React.FC<{ user: User; isCurrentUser?: boolean }> = ({ user, isCurrentUser }) => (
  <div
    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
    style={{ backgroundColor: user.color }}
    title={`${user.name}${isCurrentUser ? ' (you)' : ''}`}
  >
    {user.name.charAt(0).toUpperCase()}
  </div>
);

export const CollaborativeEditor: React.FC = () => {
  const { currentProject, currentFile, setCurrentFile, updateFileContent, setShowPreview } = useStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [collabState, setCollabState] = useState<CollaborationState>(collaborationService.getState());
  const [isCollabEnabled, setIsCollabEnabled] = useState(false);

  // Subscribe to collaboration state changes
  useEffect(() => {
    const unsubscribe = collaborationService.subscribe(setCollabState);
    return () => {
      unsubscribe();
      collaborationService.leaveSession();
    };
  }, []);

  // Join collaboration session when file changes
  useEffect(() => {
    if (currentProject && currentFile && isCollabEnabled) {
      const yText = collaborationService.joinSession(currentProject.id, currentFile.path);
      yTextRef.current = yText;

      // Initialize with current content if empty
      if (yText.length === 0 && currentFile.content) {
        yText.insert(0, currentFile.content);
      }
    }

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [currentProject?.id, currentFile?.path, isCollabEnabled]);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    
    // If collaboration is enabled, set up binding
    if (isCollabEnabled && yTextRef.current && collaborationService.getDoc()) {
      const awareness = collaborationService.getAwareness();
      
      if (awareness) {
        bindingRef.current = new MonacoBinding(
          yTextRef.current,
          editor.getModel()!,
          new Set([editor]),
          awareness
        );
      }
    }

    // Track undo/redo availability
    const model = editor.getModel();
    if (model) {
      const updateUndoRedo = () => {
        setCanUndo(model.getAlternativeVersionId() > 1);
        setCanRedo(false);
      };
      model.onDidChangeContent(updateUndoRedo);
    }
  }, [isCollabEnabled]);

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (currentProject && currentFile && value !== undefined) {
        updateFileContent(currentProject.id, currentFile.path, value);
      }
    },
    [currentProject, currentFile, updateFileContent]
  );

  const handleUndo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'undo', null);
    editorRef.current?.focus();
  }, []);

  const handleRedo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'redo', null);
    editorRef.current?.focus();
  }, []);

  const handleSave = useCallback(() => {
    console.log('Saving file:', currentFile?.path);
  }, [currentFile]);

  const handleClose = useCallback(() => {
    setCurrentFile(null);
  }, [setCurrentFile]);

  const handleRunPreview = useCallback(() => {
    setShowPreview(true);
  }, [setShowPreview]);

  const toggleCollaboration = useCallback(() => {
    if (isCollabEnabled) {
      collaborationService.leaveSession();
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    }
    setIsCollabEnabled(!isCollabEnabled);
  }, [isCollabEnabled]);

  const currentUser = collaborationService.getCurrentUser();
  const otherUsers = collabState.users.filter(u => u.id !== currentUser.id);

  if (!currentFile) {
    return (
      <div className="h-full flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No file selected</p>
          <p className="text-sm">Select a file from the explorer to edit</p>
        </div>
      </div>
    );
  }

  const language = getLanguageFromPath(currentFile.path);

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{currentFile.path}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-secondary rounded">
            {language}
          </span>
          
          {/* Collaboration status */}
          {isCollabEnabled && (
            <div className="flex items-center gap-1 ml-2">
              {collabState.connected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {collabState.connected ? 'Live' : 'Connecting...'}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Active users */}
          {isCollabEnabled && collabState.users.length > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex -space-x-1">
                <UserAvatar user={currentUser} isCurrentUser />
                {otherUsers.slice(0, 3).map((user) => (
                  <UserAvatar key={user.id} user={user} />
                ))}
                {otherUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">
                    +{otherUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collaboration toggle */}
          <button
            onClick={toggleCollaboration}
            className={`p-1.5 rounded transition-colors ${
              isCollabEnabled 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-accent'
            }`}
            title={isCollabEnabled ? 'Disable collaboration' : 'Enable collaboration'}
          >
            <Users className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1.5 hover:bg-accent rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1.5 hover:bg-accent rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <button
            onClick={handleRunPreview}
            className="p-1.5 hover:bg-accent rounded text-green-500"
            title="Run preview"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="p-1.5 hover:bg-accent rounded"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-accent rounded"
            title="Close file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={currentFile.content}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            bracketPairColorization: {
              enabled: true,
            },
          }}
        />
      </div>
    </div>
  );
};
