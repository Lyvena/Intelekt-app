import { useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useStore, usePreviewFiles } from './store/useStore';
import { projectsAPI } from './services/api';
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
  } = useStore();
  
  const previewFiles = usePreviewFiles();

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
        />
      )}
    </div>
  );
}

export default App;
