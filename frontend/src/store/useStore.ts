import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ChatMessage, AIProvider, ProjectFile } from '../types';

interface AppState {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: string) => void;
  
  // Chat
  messages: Record<string, ChatMessage[]>; // keyed by project ID
  isLoading: boolean;
  streamingMessage: string;
  setMessages: (projectId: string, messages: ChatMessage[]) => void;
  addMessage: (projectId: string, message: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  setStreamingMessage: (message: string) => void;
  appendStreamingMessage: (chunk: string) => void;
  clearStreamingMessage: () => void;
  
  // AI Settings
  aiProvider: AIProvider;
  setAIProvider: (provider: AIProvider) => void;
  
  // Files
  projectFiles: Record<string, ProjectFile[]>; // keyed by project ID
  currentFile: ProjectFile | null;
  setProjectFiles: (projectId: string, files: ProjectFile[]) => void;
  setCurrentFile: (file: ProjectFile | null) => void;
  updateFileContent: (projectId: string, filePath: string, content: string) => void;
  
  // UI State
  showNewProjectModal: boolean;
  showPreview: boolean;
  sidebarCollapsed: boolean;
  setShowNewProjectModal: (show: boolean) => void;
  setShowPreview: (show: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // Projects
      projects: [],
      currentProject: null,
      setProjects: (projects) => set({ projects }),
      setCurrentProject: (project) => set({ currentProject: project }),
      addProject: (project) => set((state) => ({ 
        projects: [project, ...state.projects] 
      })),
      removeProject: (projectId) => set((state) => ({
        projects: state.projects.filter((p) => p.id !== projectId),
        currentProject: state.currentProject?.id === projectId ? null : state.currentProject,
      })),
      
      // Chat
      messages: {},
      isLoading: false,
      streamingMessage: '',
      setMessages: (projectId, messages) => set((state) => ({
        messages: { ...state.messages, [projectId]: messages }
      })),
      addMessage: (projectId, message) => set((state) => ({
        messages: {
          ...state.messages,
          [projectId]: [...(state.messages[projectId] || []), message]
        }
      })),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setStreamingMessage: (message) => set({ streamingMessage: message }),
      appendStreamingMessage: (chunk) => set((state) => ({
        streamingMessage: state.streamingMessage + chunk
      })),
      clearStreamingMessage: () => set({ streamingMessage: '' }),
      
      // AI Settings
      aiProvider: 'claude',
      setAIProvider: (provider) => set({ aiProvider: provider }),
      
      // Files
      projectFiles: {},
      currentFile: null,
      setProjectFiles: (projectId, files) => set((state) => ({
        projectFiles: { ...state.projectFiles, [projectId]: files }
      })),
      setCurrentFile: (file) => set({ currentFile: file }),
      updateFileContent: (projectId, filePath, content) => set((state) => ({
        projectFiles: {
          ...state.projectFiles,
          [projectId]: (state.projectFiles[projectId] || []).map((f) =>
            f.path === filePath ? { ...f, content } : f
          )
        }
      })),
      
      // UI State
      showNewProjectModal: false,
      showPreview: false,
      sidebarCollapsed: false,
      setShowNewProjectModal: (show) => set({ showNewProjectModal: show }),
      setShowPreview: (show) => set({ showPreview: show }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'intelekt-storage',
      partialize: (state) => ({
        aiProvider: state.aiProvider,
        messages: state.messages,
      }),
    }
  )
);

// Selectors for convenience
export const useCurrentProjectMessages = () => {
  const currentProject = useStore((state) => state.currentProject);
  const messages = useStore((state) => state.messages);
  return currentProject ? messages[currentProject.id] || [] : [];
};

export const useCurrentProjectFiles = () => {
  const currentProject = useStore((state) => state.currentProject);
  const projectFiles = useStore((state) => state.projectFiles);
  return currentProject ? projectFiles[currentProject.id] || [] : [];
};

// Get files as a Record for preview
export const usePreviewFiles = (): Record<string, string> => {
  const files = useCurrentProjectFiles();
  return files.reduce((acc, file) => {
    acc[file.path] = file.content;
    return acc;
  }, {} as Record<string, string>);
};
