import React, { useState } from 'react';
import { 
  Plus, 
  User, 
  Calendar, 
  CheckSquare,
  GripVertical
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  assignee_name?: string;
  assignee_id?: string;
  story_points?: number;
  due_date?: string;
  labels: Array<{ id: string; name: string; color: string }>;
  checklist: Array<{ id: string; text: string; completed: boolean }>;
  order: number;
}

interface KanbanBoardProps {
  tasks: Record<string, Task[]>;
  onTaskClick: (task: Task) => void;
  onTaskMove: (taskId: string, newStatus: string, newOrder: number) => void;
  onCreateTask: (status: string) => void;
}

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-500' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-500' },
  { id: 'in_review', title: 'In Review', color: 'bg-purple-500' },
  { id: 'done', title: 'Done', color: 'bg-green-500' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-100',
  high: 'text-orange-600 bg-orange-100',
  medium: 'text-yellow-600 bg-yellow-100',
  low: 'text-green-600 bg-green-100',
};

const TYPE_ICONS: Record<string, string> = {
  feature: '✨',
  bug: '🐛',
  improvement: '💡',
  tech_debt: '🔧',
  research: '🔬',
  documentation: '📝',
  design: '🎨',
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onTaskClick,
  onTaskMove,
  onCreateTask,
}) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    
    if (draggedTask && draggedTask.status !== columnId) {
      const columnTasks = tasks[columnId] || [];
      onTaskMove(draggedTask.id, columnId, columnTasks.length);
    }
    
    setDraggedTask(null);
  };

  const getChecklistProgress = (checklist: Task['checklist']) => {
    if (!checklist || checklist.length === 0) return null;
    const completed = checklist.filter(item => item.completed).length;
    return { completed, total: checklist.length };
  };

  return (
    <div className="h-full flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(column => {
        const columnTasks = tasks[column.id] || [];
        const isOver = dragOverColumn === column.id;
        
        return (
          <div
            key={column.id}
            className={`flex-shrink-0 w-80 flex flex-col rounded-lg bg-gray-100 dark:bg-gray-800 ${
              isOver ? 'ring-2 ring-blue-500' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {column.title}
                </h3>
                <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              <button
                onClick={() => onCreateTask(column.id)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            {/* Tasks */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columnTasks.map(task => {
                const checklistProgress = getChecklistProgress(task.checklist);
                
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task)}
                    onClick={() => onTaskClick(task)}
                    className={`bg-white dark:bg-gray-900 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow ${
                      draggedTask?.id === task.id ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Task Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span title={task.type}>{TYPE_ICONS[task.type] || '📋'}</span>
                        <span className="text-xs text-gray-500">{task.id}</span>
                      </div>
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Title */}
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                      {task.title}
                    </h4>
                    
                    {/* Labels */}
                    {task.labels.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {task.labels.slice(0, 3).map(label => (
                          <span
                            key={label.id}
                            className="px-1.5 py-0.5 text-xs rounded"
                            style={{ backgroundColor: label.color + '30', color: label.color }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {task.labels.length > 3 && (
                          <span className="text-xs text-gray-500">+{task.labels.length - 3}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        {/* Priority */}
                        <span className={`px-1.5 py-0.5 text-xs rounded ${PRIORITY_COLORS[task.priority]}`}>
                          {task.priority}
                        </span>
                        
                        {/* Story Points */}
                        {task.story_points && (
                          <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {task.story_points}pts
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Checklist Progress */}
                        {checklistProgress && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CheckSquare className="w-3 h-3" />
                            <span>{checklistProgress.completed}/{checklistProgress.total}</span>
                          </div>
                        )}
                        
                        {/* Due Date */}
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        
                        {/* Assignee */}
                        {task.assignee_name ? (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center" title={task.assignee_name}>
                            <span className="text-xs text-white font-medium">
                              {task.assignee_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <div className="w-6 h-6 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Empty State */}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No tasks</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanBoard;
