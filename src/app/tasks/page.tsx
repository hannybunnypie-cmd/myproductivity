'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskModal } from '@/components/tasks/TaskModal';
import { EmptyState } from '@/components/common/EmptyState';
import { AIAssistantWidget } from '@/components/ai/AIAssistantWidget';
import { CheckSquare, Plus, Search } from 'lucide-react';
import { Task, Category, Goal } from '@/lib/types';
import { getLocalStore, setLocalStore } from '@/lib/storage';

export default function TasksPage() {
  const [userEmail, setUserEmail] = useState<string>('hannybunnpie@gmail.com');
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
    // 1. Initial auth check
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.email) {
          setUserEmail(data.user.email);
          const cached = getLocalStore<Task[]>(data.user.email, 'tasks', []);
          if (cached.length > 0) setTasks(cached);
        }
      })
      .catch(() => {});

    // 2. Load from localStorage
    const saved = getLocalStore<Task[]>(userEmail, 'tasks', []);
    if (saved.length > 0) {
      setTasks(saved);
    }

    // 3. Fetch fresh data from API
    fetchTasksData();
  }, [userEmail]);

  const saveAndSyncTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    setLocalStore(userEmail, 'tasks', newTasks);
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
        const apiTasks: Task[] = data.tasks || [];

        // Merge API tasks with local tasks by ID
        const localTasks = getLocalStore<Task[]>(userEmail, 'tasks', []);
        const taskMap = new Map<string, Task>();

        localTasks.forEach((t) => taskMap.set(t.id, t));
        apiTasks.forEach((t) => taskMap.set(t.id, t));

        const merged = Array.from(taskMap.values());
        saveAndSyncTasks(merged);
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
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            status: newStatus,
            completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
          }
        : t
    );
    saveAndSyncTasks(updated);

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    const updated = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const subtasks = t.subtasks?.map((st) => (st.id === subtaskId ? { ...st, completed } : st)) || [];
      const allDone = subtasks.length > 0 && subtasks.every((s) => s.completed);
      return {
        ...t,
        subtasks,
        status: allDone ? ('completed' as const) : t.status,
      };
    });
    saveAndSyncTasks(updated);

    try {
      await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtaskId, completed }),
      });
    } catch (err) {
      console.error('Toggle subtask error:', err);
    }
  };

  const handleToggleFocus = async (taskId: string, isFocus: boolean) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, is_focus_today: isFocus } : t));
    saveAndSyncTasks(updated);

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_focus_today: isFocus }),
      });
    } catch (err) {
      console.error('Toggle focus error:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    saveAndSyncTasks(updated);

    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete task error:', err);
    }
  };

  const handleSaveTask = async (taskData: any) => {
    const isEdit = Boolean(taskData.id);
    const taskId = taskData.id || 't_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const createdAt = new Date().toISOString();

    const catObj = categories.find((c) => c.id === taskData.category_id);

    const formattedTask: Task = {
      id: taskId,
      user_id: userEmail,
      title: taskData.title,
      description: taskData.description || '',
      category_id: taskData.category_id || null,
      category_name: catObj?.name,
      category_color: catObj?.color,
      goal_id: taskData.goal_id || null,
      priority: taskData.priority || 'medium',
      due_date: taskData.due_date || new Date().toISOString().split('T')[0],
      estimated_duration_mins: Number(taskData.estimated_duration_mins || 30),
      actual_duration_mins: 0,
      status: 'not_started',
      is_focus_today: Boolean(taskData.is_focus_today),
      recurring_rule: taskData.recurring_rule || 'none',
      tags: taskData.tags || [],
      notes: taskData.notes || '',
      created_at: createdAt,
      completed_at: null,
      subtasks: (taskData.subtasks || []).map((stTitle: string, idx: number) => ({
        id: `st_${taskId}_${idx}`,
        task_id: taskId,
        user_id: userEmail,
        title: typeof stTitle === 'string' ? stTitle : (stTitle as any).title,
        completed: false,
        created_at: createdAt,
      })),
    };

    if (isEdit) {
      saveAndSyncTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...formattedTask } : t)));
    } else {
      saveAndSyncTasks([formattedTask, ...tasks]);
    }

    try {
      const url = isEdit ? `/api/tasks/${taskId}` : '/api/tasks';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.task) {
          const mergedWithBackend = tasks.map((t) => (t.id === data.task.id ? data.task : t));
          if (!isEdit && !tasks.some((t) => t.id === data.task.id)) {
            mergedWithBackend.unshift(data.task);
          }
          saveAndSyncTasks(mergedWithBackend);
        }
      }
    } catch (err) {
      console.error('Save task API error:', err);
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
