import React from 'react';
import { 
  Sparkles, 
  Plus, 
  Folder, 
  Download, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Moon,
  Sun,
  Monitor,
  Lightbulb,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { projectsAPI } from '../../services/api';
import type { Project, AIProvider, ChatMessage } from '../../types';
import { cn, formatDate, downloadBlob } from '../../lib/utils';
import { UsageDisplay } from '../usage';

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
  
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  const handleSelectProject = async (project: Project) => {
    setCurrentProject(project);
    
    // Load project conversation history from backend
    try {
      const response = await projectsAPI.get(project.id);
      // If the project has stored messages, load them
      if (response && typeof response === 'object' && 'messages' in response) {
        const messages = (response as Project & { messages?: unknown[] }).messages;
        const chatMessages = Array.isArray(messages)
          ? messages.filter(
              (m): m is ChatMessage =>
                !!m &&
                typeof m === 'object' &&
                'role' in m &&
                'content' in m
            )
          : [];
        setMessages(project.id, chatMessages);
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
      <div className="w-16 border-r border-border/50 bg-gradient-to-b from-card to-background flex flex-col items-center py-4 gap-2">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        
        {/* Expand */}
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="mt-2 p-2.5 hover:bg-accent rounded-xl transition-all hover:scale-105"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        
        {/* New Project */}
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="mt-auto p-2.5 btn-gradient rounded-xl shadow-lg shadow-primary/20"
          title="New Project"
        >
          <Plus className="w-5 h-5" />
        </button>
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 hover:bg-accent rounded-xl transition-all"
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 border-r border-border/50 bg-gradient-to-b from-card to-background flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Intelekt</h1>
              <p className="text-xs text-muted-foreground">AI Code Builder</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-2 hover:bg-accent rounded-lg transition-all hover:scale-105"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowNewProjectModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-gradient rounded-xl font-medium shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your Projects</h2>
        {projects.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-secondary/50 flex items-center justify-center">
              <Folder className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Create your first project to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className={cn(
                  'p-3.5 rounded-xl cursor-pointer transition-all duration-200 group hover-lift slide-in',
                  currentProject?.id === project.id
                    ? 'bg-primary/10 border-2 border-primary/50 shadow-md shadow-primary/10'
                    : 'bg-secondary/30 border border-transparent hover:bg-secondary/60 hover:border-border/50'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleSelectProject(project)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        currentProject?.id === project.id
                          ? "bg-primary/20"
                          : "bg-secondary"
                      )}>
                        <Folder className={cn(
                          "w-4 h-4",
                          currentProject?.id === project.id ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate text-sm">{project.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 pl-10">
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                        {project.tech_stack}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(project.updated_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
                    <button
                      onClick={(e) => handleExportProject(e, project.id)}
                      className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
                      title="Export"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
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

      {/* Footer */}
      <div className="p-4 border-t border-border/50 space-y-3">
        {/* Usage Display */}
        <UsageDisplay compact={false} showUpgrade={true} />
        
        {/* AI Provider Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            AI Model
          </label>
          <select
            value={aiProvider}
            onChange={(e) => setAIProvider(e.target.value as AIProvider)}
            className="w-full px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          >
            <option value="claude">Claude 3.5 Sonnet</option>
            <option value="grok">Grok 2</option>
          </select>
        </div>
        
        {/* Feature Request Link */}
        <a
          href="https://intelekt.canny.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 bg-secondary/30 hover:bg-secondary/50 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all group"
        >
          <Lightbulb className="w-4 h-4 text-amber-500 group-hover:text-amber-400 transition-colors" />
          <span>Request a Feature</span>
        </a>
        
        {/* Theme Selector */}
        <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl">
          <button
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              theme === 'light' ? 'bg-background shadow-sm' : 'hover:bg-secondary/50'
            }`}
            title="Light mode"
          >
            <Sun className="w-3.5 h-3.5" />
            Light
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              theme === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-secondary/50'
            }`}
            title="Dark mode"
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              theme === 'system' ? 'bg-background shadow-sm' : 'hover:bg-secondary/50'
            }`}
            title="System preference"
          >
            <Monitor className="w-3.5 h-3.5" />
            Auto
          </button>
        </div>
      </div>
    </div>
  );
};
