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
          <PanelGroup direction="horizontal" className="flex-1">
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
        ) : (
          <ChatPanel />
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
        />
      )}
    </div>
  );
}

export default App;
