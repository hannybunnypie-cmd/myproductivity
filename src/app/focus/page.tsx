'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PomodoroTimer } from '@/components/focus/PomodoroTimer';
import { Timer } from 'lucide-react';
import { Task } from '@/lib/types';

export default function FocusPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) setTasks((await res.json()).tasks || []);
    } catch (err) {
      console.error('Fetch tasks for Pomodoro error:', err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center justify-center gap-2">
            <Timer className="w-6 h-6 text-blue-400" /> Focus & Pomodoro Sessions
          </h1>
          <p className="text-xs text-slate-400">
            Work in timed intervals to optimize concentration and retain peak energy.
          </p>
        </div>

        <PomodoroTimer tasks={tasks} onSessionComplete={() => fetchTasks()} />
      </div>
    </AppLayout>
  );
}
