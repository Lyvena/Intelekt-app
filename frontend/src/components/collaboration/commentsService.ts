const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
import type { CodeComment } from './CodeComments';

export class CommentsService {
  private comments: Map<string, CodeComment[]> = new Map();
  private listeners: Set<(comments: CodeComment[]) => void> = new Set();

  async loadComments(projectId: string, filePath: string): Promise<CodeComment[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/comments/${projectId}?file=${encodeURIComponent(filePath)}`
      );
      if (!response.ok) throw new Error('Failed to load comments');
      const comments = await response.json();
      const key = `${projectId}:${filePath}`;
      this.comments.set(key, comments);
      this.notify(comments);
      return comments;
    } catch (error) {
      console.error('Failed to load comments:', error);
      return [];
    }
  }

  async addComment(
    projectId: string,
    filePath: string,
    lineNumber: number,
    content: string,
    author: { id: string; name: string; color: string },
    parentId?: string
  ): Promise<CodeComment | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          line_number: lineNumber,
          content,
          author,
          parent_id: parentId,
        }),
      });
      if (!response.ok) throw new Error('Failed to add comment');
      const comment = await response.json();
      
      const key = `${projectId}:${filePath}`;
      const existing = this.comments.get(key) || [];
      if (parentId) {
        const parent = existing.find(c => c.id === parentId);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        existing.push(comment);
      }
      this.comments.set(key, existing);
      this.notify(existing);
      
      return comment;
    } catch (error) {
      console.error('Failed to add comment:', error);
      return null;
    }
  }

  async resolveComment(projectId: string, filePath: string, commentId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/comments/${projectId}/${commentId}/resolve`,
        { method: 'POST' }
      );
      if (!response.ok) throw new Error('Failed to resolve comment');
      
      const key = `${projectId}:${filePath}`;
      const existing = this.comments.get(key) || [];
      const comment = existing.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
      }
      this.comments.set(key, existing);
      this.notify(existing);
      
      return true;
    } catch (error) {
      console.error('Failed to resolve comment:', error);
      return false;
    }
  }

  async deleteComment(projectId: string, filePath: string, commentId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/comments/${projectId}/${commentId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete comment');
      
      const key = `${projectId}:${filePath}`;
      const existing = this.comments.get(key) || [];
      this.comments.set(key, existing.filter(c => c.id !== commentId));
      this.notify(this.comments.get(key) || []);
      
      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return false;
    }
  }

  getComments(projectId: string, filePath: string): CodeComment[] {
    const key = `${projectId}:${filePath}`;
    return this.comments.get(key) || [];
  }

  subscribe(listener: (comments: CodeComment[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(comments: CodeComment[]) {
    this.listeners.forEach(l => l(comments));
  }
}

export const commentsService = new CommentsService();
