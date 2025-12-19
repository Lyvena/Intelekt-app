import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ChatMessage, AIProvider, ProjectFile } from '../types';
import type { GenerationStage } from '../components/chat/GenerationProgress';

// File history for undo/redo
interface FileHistoryEntry {
  files: ProjectFile[];
  timestamp: number;
  description: string;
}

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
  generationStage: GenerationStage;
  generationMessage: string;
  setMessages: (projectId: string, messages: ChatMessage[]) => void;
  addMessage: (projectId: string, message: ChatMessage) => void;
  setIsLoading: (loading: boolean) => void;
  setStreamingMessage: (message: string) => void;
  appendStreamingMessage: (chunk: string) => void;
  clearStreamingMessage: () => void;
  setGenerationStage: (stage: GenerationStage, message?: string) => void;
  
  // AI Settings
  aiProvider: AIProvider;
  setAIProvider: (provider: AIProvider) => void;
  
  // Files
  projectFiles: Record<string, ProjectFile[]>; // keyed by project ID
  currentFile: ProjectFile | null;
  fileHistory: Record<string, FileHistoryEntry[]>; // keyed by project ID
  fileHistoryIndex: Record<string, number>; // current position in history
  setProjectFiles: (projectId: string, files: ProjectFile[]) => void;
  setCurrentFile: (file: ProjectFile | null) => void;
  updateFileContent: (projectId: string, filePath: string, content: string) => void;
  pushFileHistory: (projectId: string, description: string) => void;
  undo: (projectId: string) => void;
  redo: (projectId: string) => void;
  
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
      generationStage: 'idle',
      generationMessage: '',
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
      setGenerationStage: (stage, message = '') => set({ generationStage: stage, generationMessage: message }),
      
      // AI Settings
      aiProvider: 'claude',
      setAIProvider: (provider) => set({ aiProvider: provider }),
      
      // Files
      projectFiles: {},
      currentFile: null,
      fileHistory: {},
      fileHistoryIndex: {},
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
      pushFileHistory: (projectId, description) => set((state) => {
        const currentFiles = state.projectFiles[projectId] || [];
        const currentHistory = state.fileHistory[projectId] || [];
        const currentIndex = state.fileHistoryIndex[projectId] ?? -1;
        
        // Truncate any future history if we're not at the end
        const newHistory = currentHistory.slice(0, currentIndex + 1);
        
        // Add new entry
        newHistory.push({
          files: JSON.parse(JSON.stringify(currentFiles)), // Deep copy
          timestamp: Date.now(),
          description,
        });
        
        // Keep only last 50 entries
        const trimmedHistory = newHistory.slice(-50);
        
        return {
          fileHistory: { ...state.fileHistory, [projectId]: trimmedHistory },
          fileHistoryIndex: { ...state.fileHistoryIndex, [projectId]: trimmedHistory.length - 1 },
        };
      }),
      undo: (projectId) => set((state) => {
        const history = state.fileHistory[projectId] || [];
        const currentIndex = state.fileHistoryIndex[projectId] ?? -1;
        
        if (currentIndex <= 0) return state;
        
        const newIndex = currentIndex - 1;
        const previousState = history[newIndex];
        
        return {
          projectFiles: { ...state.projectFiles, [projectId]: previousState.files },
          fileHistoryIndex: { ...state.fileHistoryIndex, [projectId]: newIndex },
        };
      }),
      redo: (projectId) => set((state) => {
        const history = state.fileHistory[projectId] || [];
        const currentIndex = state.fileHistoryIndex[projectId] ?? -1;
        
        if (currentIndex >= history.length - 1) return state;
        
        const newIndex = currentIndex + 1;
        const nextState = history[newIndex];
        
        return {
          projectFiles: { ...state.projectFiles, [projectId]: nextState.files },
          fileHistoryIndex: { ...state.fileHistoryIndex, [projectId]: newIndex },
        };
      }),
      
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

// Undo/Redo selectors
export const useCanUndo = (projectId: string | undefined): boolean => {
  const fileHistoryIndex = useStore((state) => state.fileHistoryIndex);
  if (!projectId) return false;
  const currentIndex = fileHistoryIndex[projectId] ?? -1;
  return currentIndex > 0;
};

export const useCanRedo = (projectId: string | undefined): boolean => {
  const fileHistory = useStore((state) => state.fileHistory);
  const fileHistoryIndex = useStore((state) => state.fileHistoryIndex);
  if (!projectId) return false;
  const history = fileHistory[projectId] || [];
  const currentIndex = fileHistoryIndex[projectId] ?? -1;
  return currentIndex < history.length - 1;
};

export const useFileHistoryInfo = (projectId: string | undefined) => {
  const fileHistory = useStore((state) => state.fileHistory);
  const fileHistoryIndex = useStore((state) => state.fileHistoryIndex);
  if (!projectId) return { current: 0, total: 0, description: '' };
  const history = fileHistory[projectId] || [];
  const currentIndex = fileHistoryIndex[projectId] ?? -1;
  const currentEntry = history[currentIndex];
  return {
    current: currentIndex + 1,
    total: history.length,
    description: currentEntry?.description || '',
  };
};
