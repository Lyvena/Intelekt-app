import React, { useState } from 'react';
import {
  GitFork,
  Globe,
  Lock,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  Star,
  Eye,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface PublicProject {
  id: string;
  name: string;
  description: string;
  author: {
    id: string;
    name: string;
  };
  techStack: string[];
  stars: number;
  forks: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  thumbnail?: string;
}

interface ProjectForkModalProps {
  project: PublicProject;
  onClose: () => void;
  onForked?: (newProjectId: string) => void;
}

// Fork modal
export const ProjectForkModal: React.FC<ProjectForkModalProps> = ({
  project,
  onClose,
  onForked,
}) => {
  const { user } = useAuth();
  const { setProjects, projects } = useStore();
  const [newName, setNewName] = useState(`${project.name}-fork`);
  const [isPrivate, setIsPrivate] = useState(true);
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFork = async () => {
    if (!user || !newName.trim()) return;

    setIsForking(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${project.id}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          is_private: isPrivate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fork project');
      }

      const forkedProject = await response.json();
      
      // Add to local projects
      setProjects([...projects, forkedProject]);
      
      setSuccess(true);
      onForked?.(forkedProject.id);

      // Close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fork project');
    } finally {
      setIsForking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-gradient-to-r from-primary/10 to-purple-500/10">
          <div className="p-2 bg-primary/20 rounded-xl">
            <GitFork className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Fork Project</h2>
            <p className="text-xs text-muted-foreground">
              Create your own copy of {project.name}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg">Project Forked!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your copy is ready to use
              </p>
            </div>
          ) : (
            <>
              {/* Original project info */}
              <div className="p-4 bg-secondary/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                    <GitFork className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground">
                      by {project.author.name}
                    </p>
                  </div>
                </div>
                {project.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {project.stars}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    {project.forks}
                  </span>
                  {project.techStack.length > 0 && (
                    <span>{project.techStack.slice(0, 2).join(', ')}</span>
                  )}
                </div>
              </div>

              {/* New project name */}
              <div>
                <label className="text-sm font-medium">New project name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-lg"
                  placeholder="my-awesome-project"
                />
              </div>

              {/* Visibility */}
              <div>
                <label className="text-sm font-medium">Visibility</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setIsPrivate(true)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                      isPrivate
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Private</p>
                      <p className="text-xs text-muted-foreground">Only you can see</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsPrivate(false)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                      !isPrivate
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    <div className="text-left">
                      <p className="text-sm font-medium">Public</p>
                      <p className="text-xs text-muted-foreground">Anyone can see</p>
                    </div>
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/20 text-destructive rounded-lg text-sm">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-secondary/30">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm hover:bg-secondary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFork}
              disabled={isForking || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isForking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Forking...
                </>
              ) : (
                <>
                  <GitFork className="w-4 h-4" />
                  Fork Project
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Public projects browser
export const PublicProjectsBrowser: React.FC<{ className?: string }> = ({ className }) => {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState<PublicProject | null>(null);

  React.useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/public`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Failed to load public projects:', error);
    }
    setIsLoading(false);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.techStack.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Explore Projects</h2>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full px-4 py-2 bg-secondary border border-border rounded-lg"
        />
      </div>

      {/* Projects grid */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No public projects found</p>
            <p className="text-sm mt-1">Be the first to share!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onFork={() => setSelectedProject(project)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fork modal */}
      {selectedProject && (
        <ProjectForkModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

// Project card
const ProjectCard: React.FC<{
  project: PublicProject;
  onFork: () => void;
}> = ({ project, onFork }) => {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
      {/* Thumbnail */}
      {project.thumbnail ? (
        <img
          src={project.thumbnail}
          alt={project.name}
          className="w-full h-32 object-cover"
        />
      ) : (
        <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
          <Globe className="w-12 h-12 text-primary/50" />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground">by {project.author.name}</p>
        
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Tech stack */}
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {project.techStack.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 bg-secondary rounded text-xs"
              >
                {tech}
              </span>
            ))}
            {project.techStack.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                +{project.techStack.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {project.stars}
          </span>
          <span className="flex items-center gap-1">
            <GitFork className="w-3 h-3" />
            {project.forks}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {project.views}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onFork}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <GitFork className="w-4 h-4" />
            Fork
          </button>
          <button
            className="px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            title="View project"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Share project button
export const ShareProjectButton: React.FC<{
  projectId: string;
  className?: string;
}> = ({ projectId, className }) => {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareProject = async () => {
    setIsSharing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/share`, {
        method: 'POST',
      });
      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.share_url);
      }
    } catch (error) {
      console.error('Failed to share project:', error);
    }
    setIsSharing(false);
  };

  const copyUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (shareUrl) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="flex-1 px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm"
        />
        <button
          onClick={copyUrl}
          className="p-2 bg-primary text-primary-foreground rounded-lg"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={shareProject}
      disabled={isSharing}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50",
        className
      )}
    >
      {isSharing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Globe className="w-4 h-4" />
      )}
      Make Public
    </button>
  );
};

export default PublicProjectsBrowser;
