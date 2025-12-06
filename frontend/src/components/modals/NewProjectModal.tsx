import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { projectsAPI } from '../../services/api';
import type { TechStack, ChatMessage } from '../../types';

export const NewProjectModal: React.FC = () => {
  const {
    showNewProjectModal,
    setShowNewProjectModal,
    addProject,
    setCurrentProject,
    setMessages,
    aiProvider,
  } = useStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [techStack, setTechStack] = useState<TechStack>('python');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const project = await projectsAPI.create({
        name: name.trim(),
        description: description.trim(),
        tech_stack: techStack,
        ai_provider: aiProvider,
      });

      addProject(project);
      setCurrentProject(project);

      // Add welcome message
      const welcomeMessage: ChatMessage = {
        role: 'assistant',
        content: `Great! I've created your new ${techStack} project "${name}". What would you like to build?`,
        timestamp: new Date().toISOString(),
      };
      setMessages(project.id, [welcomeMessage]);

      // Reset form and close modal
      setName('');
      setDescription('');
      setTechStack('python');
      setShowNewProjectModal(false);
    } catch (err) {
      console.error('Failed to create project:', err);
      setError('Failed to create project. Please check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShowNewProjectModal(false);
    setError('');
  };

  if (!showNewProjectModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Create New Project</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-accent rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Project Name <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Tech Stack</label>
            <select
              value={techStack}
              onChange={(e) => setTechStack(e.target.value as TechStack)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="mojo">Mojo (Priority 1)</option>
              <option value="python">Python (Priority 2)</option>
              <option value="javascript">JavaScript (Priority 3)</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
