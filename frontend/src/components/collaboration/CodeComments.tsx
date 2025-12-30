import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  MoreVertical,
  Trash2,
  Check,
  Reply,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { commentsService } from './commentsService';

export interface CodeComment {
  id: string;
  projectId: string;
  filePath: string;
  lineNumber: number;
  endLineNumber?: number;
  content: string;
  author: {
    id: string;
    name: string;
    color: string;
  };
  createdAt: string;
  updatedAt?: string;
  resolved: boolean;
  replies: CodeComment[];
}

interface CodeCommentsProps {
  filePath: string;
  className?: string;
}

// Main Comments Panel
export const CodeCommentsPanel: React.FC<CodeCommentsProps> = ({ filePath, className }) => {
  const { currentProject } = useStore();
  const { user } = useAuth();
  const [comments, setComments] = useState<CodeComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [newComment, setNewComment] = useState({ line: 0, content: '', isOpen: false });

  useEffect(() => {
    if (!currentProject) return;
    
    setIsLoading(true);
    commentsService.loadComments(currentProject.id, filePath).then(() => {
      setIsLoading(false);
    });

    const unsubscribe = commentsService.subscribe(setComments);
    return unsubscribe;
  }, [currentProject, filePath]);

  const handleAddComment = async () => {
    if (!currentProject || !user || !newComment.content.trim()) return;

    await commentsService.addComment(
      currentProject.id,
      filePath,
      newComment.line,
      newComment.content,
      {
        id: user.id || 'anonymous',
        name: (user as { name?: string }).name || user.email || 'Anonymous',
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      }
    );

    setNewComment({ line: 0, content: '', isOpen: false });
  };

  const filteredComments = showResolved
    ? comments
    : comments.filter(c => !c.resolved);

  const unresolvedCount = comments.filter(c => !c.resolved).length;

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="font-semibold">Comments</span>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
              {unresolvedCount}
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded"
          />
          <span className="text-muted-foreground">Show resolved</span>
        </label>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Add comments by clicking on line numbers</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              projectId={currentProject?.id || ''}
              filePath={filePath}
              currentUserId={user?.id}
            />
          ))
        )}
      </div>

      {/* Add comment form */}
      {newComment.isOpen && (
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Comment on line {newComment.line}</span>
            <button
              onClick={() => setNewComment({ line: 0, content: '', isOpen: false })}
              className="ml-auto p-1 hover:bg-secondary rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <textarea
            value={newComment.content}
            onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddComment}
              disabled={!newComment.content.trim()}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual comment card
const CommentCard: React.FC<{
  comment: CodeComment;
  projectId: string;
  filePath: string;
  currentUserId?: string;
  isReply?: boolean;
}> = ({ comment, projectId, filePath, currentUserId, isReply }) => {
  const [showReplies, setShowReplies] = useState(true);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();

  const handleReply = async () => {
    if (!replyContent.trim() || !user) return;

    await commentsService.addComment(
      projectId,
      filePath,
      comment.lineNumber,
      replyContent,
      {
        id: user.id || 'anonymous',
        name: (user as { name?: string }).name || user.email || 'Anonymous',
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
      },
      comment.id
    );

    setReplyContent('');
    setIsReplying(false);
  };

  const handleResolve = () => {
    commentsService.resolveComment(projectId, filePath, comment.id);
  };

  const handleDelete = () => {
    if (confirm('Delete this comment?')) {
      commentsService.deleteComment(projectId, filePath, comment.id);
    }
  };

  const isOwner = currentUserId === comment.author.id;

  return (
    <div className={cn(
      "bg-card rounded-xl border",
      comment.resolved ? "border-green-500/30 opacity-60" : "border-border",
      isReply && "ml-6 mt-2"
    )}>
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: comment.author.color }}
          >
            {comment.author.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                Line {comment.lineNumber}
              </span>
              {comment.resolved && (
                <span className="flex items-center gap-1 text-xs text-green-500">
                  <Check className="w-3 h-3" />
                  Resolved
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(comment.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-secondary rounded"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded-lg shadow-lg z-10">
                {!comment.resolved && (
                  <button
                    onClick={handleResolve}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary text-left"
                  >
                    <Check className="w-4 h-4" />
                    Resolve
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/20 text-destructive text-left"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>

        {/* Actions */}
        {!isReply && !comment.resolved && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
            {comment.replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {showReplies ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Reply form */}
      {isReplying && (
        <div className="px-3 pb-3">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => setIsReplying(false)}
              className="px-3 py-1 text-xs hover:bg-secondary rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleReply}
              disabled={!replyContent.trim()}
              className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Replies */}
      {showReplies && comment.replies.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              projectId={projectId}
              filePath={filePath}
              currentUserId={currentUserId}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Line gutter comment indicator
export const CommentGutterIndicator: React.FC<{
  lineNumber: number;
  hasComments: boolean;
  commentCount: number;
  onClick: () => void;
}> = ({ hasComments, commentCount, onClick }) => {
  if (!hasComments) return null;

  return (
    <button
      onClick={onClick}
      className="absolute right-0 w-6 h-6 flex items-center justify-center text-primary hover:bg-primary/20 rounded transition-colors"
      title={`${commentCount} comment${commentCount !== 1 ? 's' : ''}`}
    >
      <MessageSquare className="w-3.5 h-3.5" />
      {commentCount > 1 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground rounded-full text-[10px] flex items-center justify-center">
          {commentCount}
        </span>
      )}
    </button>
  );
};

export default CodeCommentsPanel;
