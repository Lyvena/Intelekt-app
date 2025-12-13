import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  MessageSquare,
  CheckSquare,
  Plus,
  Trash2
} from 'lucide-react';

interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Comment {
  id: string;
  user_name: string;
  content: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assignee_name?: string;
  assignee_id?: string;
  reporter_name: string;
  story_points?: number;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  labels: TaskLabel[];
  checklist: ChecklistItem[];
  sprint_id?: string;
  milestone_id?: string;
}

interface TaskDetailPanelProps {
  task: Task;
  comments: Comment[];
  onClose: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onAddComment: (content: string) => void;
  onToggleChecklistItem: (itemId: string) => void;
  onAddChecklistItem: (text: string) => void;
  onDelete: () => void;
  teamMembers: Array<{ id: string; username: string; full_name?: string }>;
}

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS = ['backlog', 'todo', 'in_progress', 'in_review', 'testing', 'done'];
const TYPE_OPTIONS = ['feature', 'bug', 'improvement', 'tech_debt', 'research', 'documentation', 'design'];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  comments,
  onClose,
  onUpdate,
  onAddComment,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDelete,
  teamMembers,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(task.description);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  const handleTitleSave = () => {
    if (editedTitle.trim() !== task.title) {
      onUpdate({ title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = () => {
    if (editedDescription !== task.description) {
      onUpdate({ description: editedDescription });
    }
    setIsEditingDescription(false);
  };

  const handleCommentSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      onAddChecklistItem(newChecklistItem.trim());
      setNewChecklistItem('');
    }
  };

  const checklistProgress = task.checklist.length > 0
    ? Math.round((task.checklist.filter(i => i.completed).length / task.checklist.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{task.id}</span>
              <select
                value={task.type}
                onChange={(e) => onUpdate({ type: e.target.value })}
                className="text-sm bg-gray-100 dark:bg-gray-800 border-0 rounded px-2 py-1"
              >
                {TYPE_OPTIONS.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                className="w-full text-xl font-semibold bg-transparent border-b-2 border-blue-500 outline-none"
                autoFocus
              />
            ) : (
              <h2
                onClick={() => setIsEditingTitle(true)}
                className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 -mx-2 rounded"
              >
                {task.title}
              </h2>
            )}
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Status</label>
              <select
                value={task.status}
                onChange={(e) => onUpdate({ status: e.target.value })}
                className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Priority</label>
              <select
                value={task.priority}
                onChange={(e) => onUpdate({ priority: e.target.value })}
                className={`w-full border rounded px-3 py-2 text-sm ${PRIORITY_COLORS[task.priority]}`}
              >
                {PRIORITY_OPTIONS.map(priority => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div className="relative">
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Assignee</label>
              <button
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className="w-full flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-sm text-left"
              >
                <User className="w-4 h-4 text-gray-400" />
                <span>{task.assignee_name || 'Unassigned'}</span>
              </button>
              {showAssigneeDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                  <button
                    onClick={() => {
                      onUpdate({ assignee_id: undefined, assignee_name: undefined });
                      setShowAssigneeDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Unassigned
                  </button>
                  {teamMembers.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        onUpdate({ assignee_id: member.id, assignee_name: member.full_name || member.username });
                        setShowAssigneeDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {member.full_name || member.username}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Due Date</label>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={task.due_date ? task.due_date.split('T')[0] : ''}
                  onChange={(e) => onUpdate({ due_date: e.target.value })}
                  className="bg-transparent border-0 text-sm flex-1 outline-none"
                />
              </div>
            </div>

            {/* Story Points */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Story Points</label>
              <input
                type="number"
                value={task.story_points || ''}
                onChange={(e) => onUpdate({ story_points: parseInt(e.target.value) || undefined })}
                className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded px-3 py-2 text-sm"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Estimated Hours */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Est. Hours</label>
              <input
                type="number"
                value={task.estimated_hours || ''}
                onChange={(e) => onUpdate({ estimated_hours: parseFloat(e.target.value) || undefined })}
                className="w-full bg-gray-100 dark:bg-gray-800 border-0 rounded px-3 py-2 text-sm"
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Description</label>
            {isEditingDescription ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={handleDescriptionSave}
                className="w-full min-h-[120px] bg-gray-100 dark:bg-gray-800 border-0 rounded px-3 py-2 text-sm resize-none"
                autoFocus
              />
            ) : (
              <div
                onClick={() => setIsEditingDescription(true)}
                className="min-h-[80px] bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {task.description || <span className="text-gray-400">Add a description...</span>}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Checklist
              </label>
              {task.checklist.length > 0 && (
                <span className="text-xs text-gray-500">{checklistProgress}% complete</span>
              )}
            </div>
            
            {task.checklist.length > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${checklistProgress}%` }}
                />
              </div>
            )}
            
            <div className="space-y-2">
              {task.checklist.map(item => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => onToggleChecklistItem(item.id)}
                    className="rounded border-gray-300"
                  />
                  <span className={item.completed ? 'line-through text-gray-400' : ''}>
                    {item.text}
                  </span>
                </label>
              ))}
              
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                  placeholder="Add item..."
                  className="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </label>
            
            <div className="space-y-3 mb-3">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{comment.user_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{comment.content}</p>
                </div>
              ))}
            </div>
            
            <div className="flex items-start gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 border-0 rounded px-3 py-2 text-sm resize-none"
                rows={2}
              />
              <button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>

          {/* Activity Info */}
          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p>Created: {new Date(task.created_at).toLocaleString()} by {task.reporter_name}</p>
            <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailPanel;
