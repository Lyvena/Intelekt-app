import React, { useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Save, X, Play } from 'lucide-react';
import { useStore } from '../../store/useStore';

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    mojo: 'python', // Use Python highlighting for Mojo
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

export const CodeEditor: React.FC = () => {
  const { currentProject, currentFile, setCurrentFile, updateFileContent, setShowPreview } = useStore();

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (currentProject && currentFile && value !== undefined) {
        updateFileContent(currentProject.id, currentFile.path, value);
      }
    },
    [currentProject, currentFile, updateFileContent]
  );

  const handleSave = useCallback(() => {
    // TODO: Implement save to backend
    console.log('Saving file:', currentFile?.path);
  }, [currentFile]);

  const handleClose = useCallback(() => {
    setCurrentFile(null);
  }, [setCurrentFile]);

  const handleRunPreview = useCallback(() => {
    setShowPreview(true);
  }, [setShowPreview]);

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
        </div>
        <div className="flex items-center gap-1">
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
