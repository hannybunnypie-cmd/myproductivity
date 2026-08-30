'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Clock,
  ChevronDown,
  ChevronUp,
  Star,
  Trash2,
  Edit2,
  Tag,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Task, Subtask } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (taskId: string, newStatus: Task['status']) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onToggleFocus: (taskId: string, isFocus: boolean) => void;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdateStatus,
  onToggleSubtask,
  onToggleFocus,
  onDelete,
  onEdit,
}) => {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = task.status === 'completed';

  const subtasks = task.subtasks || [];
  const completedSubtasksCount = subtasks.filter((s) => s.completed).length;
  const subtaskPercent = subtasks.length > 0 ? Math.round((completedSubtasksCount / subtasks.length) * 100) : 0;

  const priorityColors = {
    low: 'bg-slate-800 text-slate-300 border-slate-700',
    medium: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
    high: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
  };

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isCompleted
          ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox button */}
        <button
          onClick={() => onUpdateStatus(task.id, isCompleted ? 'not_started' : 'completed')}
          className="mt-0.5 text-slate-400 hover:text-blue-400 transition shrink-0"
        >
          {isCompleted ? (
            <CheckSquare className="w-5 h-5 text-blue-500 fill-blue-500/20" />
          ) : (
            <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
          )}
        </button>

        {/* Task Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4
              className={`text-sm font-semibold truncate ${
                isCompleted ? 'line-through text-slate-500' : 'text-slate-100'
              }`}
            >
              {task.title}
            </h4>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onToggleFocus(task.id, !task.is_focus_today)}
                className={`p-1 rounded-lg transition ${
                  task.is_focus_today ? 'text-amber-400 hover:bg-amber-950/40' : 'text-slate-600 hover:text-slate-400'
                }`}
                title={task.is_focus_today ? 'In Today Focus' : 'Add to Today Focus'}
              >
                <Star className={`w-4 h-4 ${task.is_focus_today ? 'fill-amber-400' : ''}`} />
              </button>

              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => onDelete(task.id)}
                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{task.description}</p>
          )}

          {/* Badges and metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
            {task.category_name && (
              <span
                className="px-2 py-0.5 rounded-full font-medium text-[11px]"
                style={{
                  backgroundColor: (task.category_color || '#3b82f6') + '20',
                  color: task.category_color || '#3b82f6',
                  borderColor: (task.category_color || '#3b82f6') + '40',
                }}
              >
                {task.category_name}
              </span>
            )}

            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${priorityColors[task.priority]}`}>
              {task.priority.toUpperCase()}
            </span>

            {task.due_date && (
              <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                <Calendar className="w-3 h-3" /> {task.due_date}
              </span>
            )}

            {task.estimated_duration_mins > 0 && (
              <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                <Clock className="w-3 h-3" /> {task.estimated_duration_mins}m
              </span>
            )}

            {subtasks.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium text-[11px] ml-auto"
              >
                <span>
                  Subtasks ({completedSubtasksCount}/{subtasks.length})
                </span>
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Subtask progress bar */}
          {subtasks.length > 0 && (
            <div className="w-full bg-slate-800 h-1 rounded-full mt-2.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${subtaskPercent}%` }}
              />
            </div>
          )}

          {/* Expandable subtasks checklist */}
          {expanded && subtasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 animate-in slide-in-from-top-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onToggleSubtask(task.id, st.id, !st.completed)}
                  className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1.5 hover:bg-slate-800/50 rounded-lg transition"
                >
                  {st.completed ? (
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={st.completed ? 'line-through text-slate-500' : ''}>{st.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
