import { useEffect, useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useStore, usePreviewFiles } from './store/useStore';
import { projectsAPI, chatAPI } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { FileExplorer } from './components/editor/FileExplorer';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { DependenciesPanel } from './components/dependencies/DependenciesPanel';
import { ExportPanel } from './components/export/ExportPanel';
import { Terminal, Package, Download, GitBranch, Eye, EyeOff, Bug, Coins, History } from 'lucide-react';
import { UndoRedoToolbar } from './components/editor/UndoRedoToolbar';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { AIDebugButton, ErrorPanel } from './components/debug';
import { UsagePanel } from './components/usage';
import { VersionHistoryPanel } from './components/history';
import {
  CollaborativeEditorWithSuspense,
  LivePreviewWithSuspense,
  InlinePreviewPanelWithSuspense,
  TerminalPanelWithSuspense,
  GitPanelWithSuspense,
} from './components/LazyComponents';

type BottomPanelType = 'none' | 'terminal' | 'dependencies' | 'export' | 'git' | 'debug' | 'usage' | 'history';

function App() {
  const { 
    setProjects, 
    currentProject, 
    showPreview, 
    setShowPreview,
    setProjectFiles,
    projectFiles,
    aiProvider,
  } = useStore();
  
  const previewFiles = usePreviewFiles();
  const [isFixingErrors, setIsFixingErrors] = useState(false);
  const [bottomPanel, setBottomPanel] = useState<BottomPanelType>('none');
  const [showInlinePreview, setShowInlinePreview] = useState(true);

  const toggleBottomPanel = (panel: BottomPanelType) => {
    setBottomPanel(bottomPanel === panel ? 'none' : panel);
  };

  // Handle error fixing from preview
  const handleFixErrors = useCallback(async (errors: string[], files: Record<string, string>) => {
    if (!currentProject) return;
    
    setIsFixingErrors(true);
    try {
      const result = await chatAPI.fixErrors({
        errors,
        files,
        ai_provider: aiProvider,
        project_id: currentProject.id,
      });
      
      if (result.success && result.fixed_files.length > 0) {
        // Update project files with fixes
        const existingFiles = projectFiles[currentProject.id] || [];
        const updatedFiles = [...existingFiles];
        
        for (const fixedFile of result.fixed_files) {
          const existingIndex = updatedFiles.findIndex(f => f.path === fixedFile.path);
          if (existingIndex >= 0) {
            updatedFiles[existingIndex] = { path: fixedFile.path, content: fixedFile.content };
          } else {
            updatedFiles.push({ path: fixedFile.path, content: fixedFile.content });
          }
        }
        
        setProjectFiles(currentProject.id, updatedFiles);
        console.log('🔧 Errors fixed:', result.summary);
      } else if (result.cannot_fix) {
        console.warn('Could not fix errors:', result.explanation);
      }
    } catch (error) {
      console.error('Failed to fix errors:', error);
    } finally {
      setIsFixingErrors(false);
    }
  }, [currentProject, aiProvider, projectFiles, setProjectFiles]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsAPI.list();
        setProjects(data);
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    };
    loadProjects();
  }, [setProjects]);


  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentProject ? (
          <PanelGroup direction="vertical" className="flex-1">
            {/* Top Section: Chat + Editor */}
            <Panel defaultSize={bottomPanel !== 'none' ? 70 : 100} minSize={40}>
              <PanelGroup direction="horizontal" className="h-full">
                {/* Chat Panel */}
                <Panel defaultSize={40} minSize={30}>
                  <ChatPanel />
                </Panel>

                <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

                {/* Editor Section */}
                <Panel defaultSize={showInlinePreview ? 35 : 60} minSize={25}>
                  <PanelGroup direction="horizontal">
                    {/* File Explorer */}
                    <Panel defaultSize={30} minSize={15} maxSize={45}>
                      <div className="h-full border-r border-border bg-card">
                        <FileExplorer />
                      </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

                    {/* Code Editor with Collaboration */}
                    <Panel defaultSize={70} minSize={40}>
                      <CollaborativeEditorWithSuspense />
                    </Panel>
                  </PanelGroup>
                </Panel>

                {/* Inline Preview Panel */}
                {showInlinePreview && (
                  <>
                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />
                    <Panel defaultSize={25} minSize={20} maxSize={50}>
                      <InlinePreviewPanelWithSuspense
                        files={previewFiles}
                        onFixError={handleFixErrors}
                        isFixing={isFixingErrors}
                        onOpenFullPreview={() => setShowPreview(true)}
                      />
                    </Panel>
                  </>
                )}
              </PanelGroup>
            </Panel>

            {/* Bottom Panel (when open) */}
            {bottomPanel !== 'none' && (
              <>
                <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />
                <Panel defaultSize={30} minSize={15} maxSize={50}>
                  <div className="h-full border-t border-border">
                    {bottomPanel === 'terminal' && <TerminalPanelWithSuspense />}
                    {bottomPanel === 'dependencies' && <DependenciesPanel />}
                    {bottomPanel === 'export' && <ExportPanel />}
                    {bottomPanel === 'git' && <GitPanelWithSuspense />}
                    {bottomPanel === 'debug' && <ErrorPanel />}
                    {bottomPanel === 'usage' && <UsagePanel />}
                    {bottomPanel === 'history' && <VersionHistoryPanel />}
                  </div>
                </Panel>
              </>
            )}
          </PanelGroup>
        ) : (
          <ChatPanel />
        )}

        {/* Bottom Toolbar */}
        {currentProject && (
          <div className="h-14 border-t border-border/30 bg-gradient-to-r from-card via-card/95 to-card flex items-center px-4 gap-2 backdrop-blur-sm">
            {/* Left side - Panel toggles */}
            <div className="action-group">
              {[
                { id: 'terminal', icon: Terminal, label: 'Terminal' },
                { id: 'dependencies', icon: Package, label: 'Deps' },
                { id: 'git', icon: GitBranch, label: 'Git' },
                { id: 'export', icon: Download, label: 'Export' },
                { id: 'debug', icon: Bug, label: 'Debug' },
                { id: 'usage', icon: Coins, label: 'Usage' },
                { id: 'history', icon: History, label: 'History' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => toggleBottomPanel(id as BottomPanelType)}
                  className={`toolbar-btn ${
                    bottomPanel === id ? 'toolbar-btn-active' : 'toolbar-btn-inactive'
                  }`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="separator-dot mx-1" />

            {/* Preview Toggle */}
            <div className="action-group">
              <button
                onClick={() => setShowInlinePreview(!showInlinePreview)}
                className={`toolbar-btn ${
                  showInlinePreview 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-600/30' 
                    : 'toolbar-btn-inactive'
                }`}
                title={showInlinePreview ? "Hide Preview" : "Show Preview"}
              >
                {showInlinePreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="hidden lg:inline">Preview</span>
              </button>
            </div>

            {/* AI Debug Button */}
            <div className="ml-1">
              <AIDebugButton />
            </div>

            {/* Undo/Redo */}
            <div className="action-group ml-1">
              <UndoRedoToolbar projectId={currentProject?.id} />
            </div>
            
            {/* Right side - Status */}
            <div className="ml-auto flex items-center gap-4">
              <OfflineIndicator />
              <div className="live-indicator">
                <span className="font-medium">Ready</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewProjectModal />

      {/* Live Preview */}
      {showPreview && (
        <LivePreviewWithSuspense
          files={previewFiles}
          onClose={() => setShowPreview(false)}
          onFixError={handleFixErrors}
          isFixing={isFixingErrors}
          projectName={currentProject?.name || 'my-app'}
        />
      )}
    </div>
  );
}

export default App;
