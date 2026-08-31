'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskModal } from '@/components/tasks/TaskModal';
import { EmptyState } from '@/components/common/EmptyState';
import { AIAssistantWidget } from '@/components/ai/AIAssistantWidget';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { Task, Category, Goal } from '@/lib/types';

const LOCAL_STORAGE_TASKS_KEY = 'productivity_app_cached_tasks_v1';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    // 1. Instant load from localStorage
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    } catch (e) {
      console.error('LocalStorage read error:', e);
    }

    // 2. Fetch fresh data from backend API
    fetchTasksData();
  }, []);

  const saveTasksState = (newTasks: Task[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(newTasks));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  };

  const fetchTasksData = async () => {
    try {
      const [tasksRes, catRes, goalRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/categories'),
        fetch('/api/goals'),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        const fetchedTasks = data.tasks || [];
        saveTasksState(fetchedTasks);
      }
      if (catRes.ok) setCategories((await catRes.json()).categories || []);
      if (goalRes.ok) setGoals((await goalRes.json()).goals || []);
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    saveTasksState(updated);

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasksData();
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = t.subtasks?.map((st) => (st.id === subtaskId ? { ...st, completed } : st)) || [];
      return { ...t, subtasks };
    });
    saveTasksState(updated);

    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, completed }),
      });
      fetchTasksData();
    } catch (err) {
      console.error('Toggle subtask error:', err);
    }
  };

  const handleToggleFocus = async (taskId: string, isFocus: boolean) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, is_focus_today: isFocus } : t));
    saveTasksState(updated);

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_focus_today: isFocus }),
      });
      fetchTasksData();
    } catch (err) {
      console.error('Toggle focus error:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveTasksState(updated);

    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      const isEdit = Boolean(taskData.id);
      const url = isEdit ? `/api/tasks/${taskData.id}` : '/api/tasks';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          if (isEdit) {
            saveTasksState(tasks.map((t) => (t.id === data.task.id ? data.task : t)));
          } else {
            saveTasksState([data.task, ...tasks]);
          }
        }
        fetchTasksData();
      }
    } catch (err) {
      console.error('Save task error:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedCategory !== 'all' && t.category_id !== selectedCategory) return false;
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-blue-400" /> Tasks & Study Planner
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Organize study tasks by subjects, set priorities, and break down goals.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="postponed">Postponed</option>
            </select>
          </div>
        </div>

        {/* Task List */}
        {filteredTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onUpdateStatus={handleUpdateStatus}
                onToggleSubtask={handleToggleSubtask}
                onToggleFocus={handleToggleFocus}
                onDelete={handleDeleteTask}
                onEdit={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CheckSquare}
            title="No tasks match your filters"
            description="Create a task for your study areas or clear your active filters."
            actionText="Create New Task"
            onAction={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
          />
        )}
      </div>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        categories={categories}
        goals={goals}
        initialTask={editingTask}
      />

      <AIAssistantWidget />
    </AppLayout>
  );
}
