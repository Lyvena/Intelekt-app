import React from 'react';
import { Brain, Plus, Folder, Download, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { projectsAPI } from '../../services/api';
import type { Project, AIProvider } from '../../types';
import { cn, formatDate, downloadBlob } from '../../lib/utils';

export const Sidebar: React.FC = () => {
  const {
    projects,
    currentProject,
    setCurrentProject,
    removeProject,
    aiProvider,
    setAIProvider,
    setShowNewProjectModal,
    sidebarCollapsed,
    setSidebarCollapsed,
    setMessages,
  } = useStore();

  const handleSelectProject = async (project: Project) => {
    setCurrentProject(project);
    
    // Load project conversation history from backend
    try {
      const response = await projectsAPI.get(project.id);
      // If the project has stored messages, load them
      if (response && 'messages' in response) {
        setMessages(project.id, (response as Project & { messages?: any[] }).messages || []);
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleExportProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    try {
      const blob = await projectsAPI.export(projectId);
      const project = projects.find((p) => p.id === projectId);
      downloadBlob(blob, `${project?.name || 'project'}.zip`);
    } catch (error) {
      console.error('Failed to export project:', error);
      alert('Failed to export project');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectsAPI.delete(projectId);
      removeProject(projectId);
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project');
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-16 border-r border-border bg-card flex flex-col items-center py-4">
        <Brain className="w-8 h-8 text-primary mb-4" />
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="p-2 hover:bg-accent rounded-lg"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="mt-4 p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          title="New Project"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Intelekt</h1>
          </div>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1 hover:bg-accent rounded"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet</p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-colors group',
                  currentProject?.id === project.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border hover:bg-accent'
                )}
                onClick={() => handleSelectProject(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="font-medium truncate">{project.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {project.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {project.tech_stack}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(project.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleExportProject(e, project.id)}
                      className="p-1 hover:bg-secondary rounded"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Provider Selector */}
      <div className="p-4 border-t border-border">
        <label className="text-sm font-medium mb-2 block">AI Provider</label>
        <select
          value={aiProvider}
          onChange={(e) => setAIProvider(e.target.value as AIProvider)}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="claude">Claude (Anthropic)</option>
          <option value="grok">Grok (xAI)</option>
        </select>
      </div>
    </div>
  );
};
