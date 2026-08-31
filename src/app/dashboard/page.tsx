'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OnboardingModal } from '@/components/dashboard/OnboardingModal';
import { TaskCard } from '@/components/tasks/TaskCard';
import { TaskModal } from '@/components/tasks/TaskModal';
import { EmptyState } from '@/components/common/EmptyState';
import { AIAssistantWidget } from '@/components/ai/AIAssistantWidget';
import {
  CheckSquare,
  Flame,
  Plus,
  Star,
  Timer,
  Repeat,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Task, Category, Goal, Habit } from '@/lib/types';
import { getLocalStore, setLocalStore } from '@/lib/storage';
import Link from 'next/link';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userEmail, setUserEmail] = useState<string>('hannybunnpie@gmail.com');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    // 1. Initial auth check
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setUserEmail(data.user.email);
          const cached = getLocalStore<Task[]>(data.user.email, 'tasks', []);
          if (cached.length > 0) setTasks(cached);
          if (data.preferences && !data.preferences.onboarded) {
            setShowOnboarding(true);
          }
        }
      })
      .catch(() => {});

    // 2. Load from localStorage
    const saved = getLocalStore<Task[]>(userEmail, 'tasks', []);
    if (saved.length > 0) {
      setTasks(saved);
    }

    // 3. Fetch fresh dashboard data
    fetchDashboardData();
  }, [userEmail]);

  const saveAndSyncTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    setLocalStore(userEmail, 'tasks', newTasks);
  };

  const fetchDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [tasksRes, catRes, goalRes, habitRes, analyticsRes] = await Promise.all([
        fetch(`/api/tasks?date=${todayStr}`),
        fetch('/api/categories'),
        fetch('/api/goals'),
        fetch('/api/habits'),
        fetch('/api/analytics?timeframe=30'),
      ]);

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const apiTasks: Task[] = tasksData.tasks || [];

        // Merge API tasks with local tasks by ID so no tasks are lost
        const localTasks = getLocalStore<Task[]>(userEmail, 'tasks', []);
        const taskMap = new Map<string, Task>();

        localTasks.forEach((t) => taskMap.set(t.id, t));
        apiTasks.forEach((t) => taskMap.set(t.id, t));

        const merged = Array.from(taskMap.values());
        saveAndSyncTasks(merged);
      }

      if (catRes.ok) setCategories((await catRes.json()).categories || []);
      if (goalRes.ok) setGoals((await goalRes.json()).goals || []);
      if (habitRes.ok) setHabits((await habitRes.json()).habits || []);
      if (analyticsRes.ok) setAnalytics((await analyticsRes.json()).summary);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
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
      fetchDashboardData();
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
      fetchDashboardData();
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
      fetchDashboardData();
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

  const handleToggleHabit = async (habitId: string) => {
    try {
      const res = await fetch('/api/habits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId }),
      });
      if (res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Toggle habit error:', err);
    }
  };

  const getMotivationalMessage = () => {
    const streak = analytics?.streakInfo?.currentStreak || 0;
    const score = analytics?.dailyScore;

    if (streak >= 7) return "Your consistency is becoming a solid habit!";
    if (score !== null && score >= 80) return "Outstanding productivity today! Keep building momentum.";
    if (score !== null && score >= 50) return "Great focus today. Finish your remaining focus items!";
    if (tasks.length === 0) return "Let's build your first productive day. Add a task to start!";
    return "Focus on small wins today. One task at a time!";
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const focusTasks = tasks.filter((t) => t.is_focus_today);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const completionPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <AppLayout>
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          fetchDashboardData();
        }}
      />

      <div className="space-y-8 animate-in fade-in">
        {/* Top Header Card */}
        <div className="p-6 lg:p-8 rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-800/30 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
                {currentDateFormatted}
              </p>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100">
                Good morning, {user?.name || 'Friend'}!
              </h2>
              <p className="text-sm text-slate-300 mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{getMotivationalMessage()}</span>
              </p>
            </div>

            {/* Quick Metrics Header Stats */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Streak Badge */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[100px]">
                <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-lg">
                  <Flame className="w-5 h-5 fill-amber-400" />
                  {analytics?.streakInfo?.currentStreak || 0}d
                </div>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Streak</p>
              </div>

              {/* Productivity Score */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[120px]">
                {analytics?.dailyScore !== null && analytics?.dailyScore !== undefined ? (
                  <div className="text-blue-400 font-bold text-lg">
                    {analytics.dailyScore}<span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                ) : (
                  <div className="text-slate-400 font-semibold text-xs py-1">
                    No data yet
                  </div>
                )}
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Productivity Score</p>
              </div>

              {/* Completion Rate */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center min-w-[100px]">
                <div className="text-emerald-400 font-bold text-lg">
                  {completionPercent}%
                </div>
                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">Tasks Done</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Today's Focus (Smart Morning Planning) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Today's Focus
            </h3>
            <span className="text-xs text-slate-400">
              {focusTasks.length} / 3 priority items
            </span>
          </div>

          {focusTasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {focusTasks.map((t) => (
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
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 text-xs text-slate-400 flex items-center justify-between">
              <span>Select 1–3 key tasks to feature in Today's Focus to keep your morning clear.</span>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Pick Focus Task
              </button>
            </div>
          )}
        </div>

        {/* Main Content Grid: Today's Tasks + Sidebar Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns: Today's Tasks List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-400" /> Today's Tasks
              </h3>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition"
              >
                <Plus className="w-4 h-4" /> Add Task
              </button>
            </div>

            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={handleUpdateStatus}
                    onToggleSubtask={handleToggleSubtask}
                    onToggleFocus={handleToggleFocus}
                    onDelete={handleDeleteTask}
                    onEdit={(t) => {
                      setEditingTask(t);
                      setIsTaskModalOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CheckSquare}
                title="You don't have anything planned yet"
                description="Add your first task and let's get started on a productive day."
                actionText="Add First Task"
                onAction={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
              />
            )}
          </div>

          {/* Right Column: Habits & Quick Pomodoro Launcher */}
          <div className="space-y-6">
            {/* Habits Widget */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-emerald-400" /> Today's Habits
                </h4>
                <Link href="/habits" className="text-xs text-blue-400 hover:underline font-medium">
                  Manage
                </Link>
              </div>

              {habits.length > 0 ? (
                <div className="space-y-2">
                  {habits.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => handleToggleHabit(h.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                        h.completed_today
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <span className="text-xs font-medium">{h.name}</span>
                      <CheckCircle2
                        className={`w-4 h-4 ${
                          h.completed_today ? 'text-emerald-400 fill-emerald-400/20' : 'text-slate-600'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-xs text-slate-400 mb-3">No habits created yet.</p>
                  <Link
                    href="/habits"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
                  >
                    Create Habit
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Pomodoro Card */}
            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-800/30 rounded-3xl p-5 shadow-xl space-y-3 text-center">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 mx-auto flex items-center justify-center">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Ready to Focus?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Launch a 25-minute distraction-free Pomodoro session.
                </p>
              </div>
              <Link
                href="/focus"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition"
              >
                Open Focus Mode
              </Link>
            </div>
          </div>
        </div>
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
