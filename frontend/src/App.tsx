import { useEffect, useState, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useStore, usePreviewFiles } from './store/useStore';
import { projectsAPI, chatAPI } from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { ChatPanel } from './components/chat/ChatPanel';
import { FileExplorer } from './components/editor/FileExplorer';
import { CollaborativeEditor } from './components/editor/CollaborativeEditor';
import { NewProjectModal } from './components/modals/NewProjectModal';
import { LivePreview } from './components/preview/LivePreview';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { DependenciesPanel } from './components/dependencies/DependenciesPanel';
import { ExportPanel } from './components/export/ExportPanel';
import { GitPanel } from './components/git/GitPanel';
import { Terminal, Package, Download, GitBranch } from 'lucide-react';

type BottomPanelType = 'none' | 'terminal' | 'dependencies' | 'export' | 'git';

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
                <Panel defaultSize={60} minSize={30}>
                  <PanelGroup direction="horizontal">
                    {/* File Explorer */}
                    <Panel defaultSize={25} minSize={15} maxSize={40}>
                      <div className="h-full border-r border-border bg-card">
                        <FileExplorer />
                      </div>
                    </Panel>

                    <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

                    {/* Code Editor with Collaboration */}
                    <Panel defaultSize={75} minSize={40}>
                      <CollaborativeEditor />
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </Panel>

            {/* Bottom Panel (when open) */}
            {bottomPanel !== 'none' && (
              <>
                <PanelResizeHandle className="h-1 bg-border hover:bg-primary/50 transition-colors cursor-row-resize" />
                <Panel defaultSize={30} minSize={15} maxSize={50}>
                  <div className="h-full border-t border-border">
                    {bottomPanel === 'terminal' && <TerminalPanel />}
                    {bottomPanel === 'dependencies' && <DependenciesPanel />}
                    {bottomPanel === 'export' && <ExportPanel />}
                    {bottomPanel === 'git' && <GitPanel />}
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
          <div className="h-10 border-t border-border bg-card flex items-center px-2 gap-1">
            <button
              onClick={() => toggleBottomPanel('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                bottomPanel === 'terminal' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Terminal"
            >
              <Terminal className="w-4 h-4" />
              Terminal
            </button>
            <button
              onClick={() => toggleBottomPanel('dependencies')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                bottomPanel === 'dependencies' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Dependencies"
            >
              <Package className="w-4 h-4" />
              Deps
            </button>
            <button
              onClick={() => toggleBottomPanel('git')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                bottomPanel === 'git' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Git"
            >
              <GitBranch className="w-4 h-4" />
              Git
            </button>
            <button
              onClick={() => toggleBottomPanel('export')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                bottomPanel === 'export' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
              title="Export"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewProjectModal />

      {/* Live Preview */}
      {showPreview && (
        <LivePreview
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
