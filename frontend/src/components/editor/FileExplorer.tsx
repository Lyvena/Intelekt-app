import React, { useEffect, useState, useCallback } from 'react';
import { 
  File, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown,
  RefreshCw 
} from 'lucide-react';
import { useStore, useCurrentProjectFiles } from '../../store/useStore';
import { projectsAPI } from '../../services/api';
import { cn } from '../../lib/utils';
import type { ProjectFile } from '../../types';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconColors: Record<string, string> = {
    ts: 'text-blue-500',
    tsx: 'text-blue-400',
    js: 'text-yellow-500',
    jsx: 'text-yellow-400',
    py: 'text-green-500',
    json: 'text-orange-400',
    md: 'text-gray-400',
    css: 'text-pink-500',
    html: 'text-red-500',
    mojo: 'text-purple-500',
  };
  return iconColors[ext || ''] || 'text-gray-400';
};

const buildFileTree = (files: ProjectFile[]): FileNode[] => {
  const root: FileNode[] = [];
  const pathMap = new Map<string, FileNode>();

  files.forEach((file) => {
    const parts = file.path.split('/').filter(Boolean);
    let currentLevel = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = index === parts.length - 1;

      let node = pathMap.get(currentPath);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        pathMap.set(currentPath, node);
        currentLevel.push(node);
      }

      if (!isFile) {
        currentLevel = node.children!;
      }
    });
  });

  // Sort: folders first, then files alphabetically
  const sortNodes = (nodes: FileNode[]): FileNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };

  return sortNodes(root);
};

interface TreeNodeProps {
  node: FileNode;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  expandedFolders,
  toggleFolder,
  selectedPath,
  onSelectFile,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPath === node.path;

  if (node.type === 'folder') {
    return (
      <div>
        <div
          className={cn(
            'flex items-center gap-1 py-1 px-2 hover:bg-accent rounded cursor-pointer',
            isSelected && 'bg-accent'
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => toggleFolder(node.path)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          )}
          <span className="text-sm truncate">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 py-1 px-2 hover:bg-accent rounded cursor-pointer',
        isSelected && 'bg-primary/10 border-l-2 border-primary'
      )}
      style={{ paddingLeft: `${depth * 12 + 24}px` }}
      onClick={() => onSelectFile(node.path)}
    >
      <File className={cn('w-4 h-4 flex-shrink-0', getFileIcon(node.name))} />
      <span className="text-sm truncate">{node.name}</span>
    </div>
  );
};

export const FileExplorer: React.FC = () => {
  const { currentProject, setProjectFiles, currentFile, setCurrentFile } = useStore();
  const files = useCurrentProjectFiles();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      const response = await projectsAPI.getFiles(currentProject.id);
      setProjectFiles(currentProject.id, response.files);
      
      // Expand root folders by default
      const rootFolders = new Set<string>();
      response.files.forEach((file) => {
        const firstFolder = file.path.split('/')[0];
        if (firstFolder && file.path.includes('/')) {
          rootFolders.add(firstFolder);
        }
      });
      setExpandedFolders(rootFolders);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }, [currentProject, setProjectFiles]);

  useEffect(() => {
    if (currentProject) {
      loadFiles();
    }
  }, [currentProject, loadFiles]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectFile = async (path: string) => {
    if (!currentProject) return;

    try {
      const file = await projectsAPI.getFile(currentProject.id, path);
      setCurrentFile(file);
    } catch (error) {
      console.error('Failed to load file:', error);
    }
  };

  if (!currentProject) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Select a project to view files</p>
      </div>
    );
  }

  const fileTree = buildFileTree(files);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Files</h3>
        <button
          onClick={loadFiles}
          disabled={loading}
          className="p-1 hover:bg-accent rounded"
          title="Refresh files"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4">No files yet</p>
        ) : (
          fileTree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedPath={currentFile?.path || null}
              onSelectFile={handleSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
};
