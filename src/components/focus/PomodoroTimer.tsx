'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task, Category } from '@/lib/types';

interface PomodoroTimerProps {
  tasks?: Task[];
  categories?: Category[];
  onSessionComplete?: (mins: number, taskId?: string) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  tasks = [],
  categories = [],
  onSessionComplete,
}) => {
  const [workMins, setWorkMins] = useState<number>(25);
  const [shortBreakMins, setShortBreakMins] = useState<number>(5);
  const [longBreakMins, setLongBreakMins] = useState<number>(15);

  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [completedSessionsCount, setCompletedSessionsCount] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize initial time on mode or workMins change
  useEffect(() => {
    if (!isActive) {
      if (mode === 'work') setTimeLeft(workMins * 60);
      else if (mode === 'shortBreak') setTimeLeft(shortBreakMins * 60);
      else if (mode === 'longBreak') setTimeLeft(longBreakMins * 60);
    }
  }, [mode, workMins, shortBreakMins, longBreakMins]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerFinished();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, mode]);

  const playChimeSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  const handleTimerFinished = async () => {
    setIsActive(false);
    playChimeSound();

    if (mode === 'work') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      const completedDuration = workMins;
      setCompletedSessionsCount((c) => c + 1);

      // Record finished session in database
      try {
        const selectedTask = tasks.find((t) => t.id === selectedTaskId);
        await fetch('/api/pomodoro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: selectedTaskId || null,
            category_id: selectedTask?.category_id || null,
            duration_mins: completedDuration,
            completed: true,
          }),
        });

        if (onSessionComplete) {
          onSessionComplete(completedDuration, selectedTaskId);
        }
      } catch (err) {
        console.error('Failed to log finished Pomodoro:', err);
      }

      // Switch to break
      if ((completedSessionsCount + 1) % 4 === 0) {
        setMode('longBreak');
      } else {
        setMode('shortBreak');
      }
    } else {
      setMode('work');
    }
  };

  const handleReset = () => {
    setIsActive(false);
    if (mode === 'work') setTimeLeft(workMins * 60);
    else if (mode === 'shortBreak') setTimeLeft(shortBreakMins * 60);
    else if (mode === 'longBreak') setTimeLeft(longBreakMins * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalModeSeconds =
    mode === 'work' ? workMins * 60 : mode === 'shortBreak' ? shortBreakMins * 60 : longBreakMins * 60;
  const progressPercent = Math.round(((totalModeSeconds - timeLeft) / totalModeSeconds) * 100);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div
      className={`transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center'
          : 'bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl text-center'
      }`}
    >
      {/* Top Controls */}
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-2">
          {['work', 'shortBreak', 'longBreak'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setIsActive(false);
                setMode(m as any);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                mode === m
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {m === 'work' ? 'Focus (25m)' : m === 'shortBreak' ? 'Short Break (5m)' : 'Long Break (15m)'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title={isFullscreen ? 'Exit Focus Mode' : 'Distraction-Free Focus Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Task Selector */}
      <div className="max-w-md mx-auto mb-6">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Link to Task (Optional)
        </label>
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-none"
        >
          <option value="">No specific task selected</option>
          {tasks
            .filter((t) => t.status !== 'completed')
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} {t.category_name ? `(${t.category_name})` : ''}
              </option>
            ))}
        </select>
      </div>

      {/* Timer Circle / Counter */}
      <div className="relative my-8 inline-flex items-center justify-center">
        <div className="w-64 h-64 lg:w-72 lg:h-72 rounded-full border-8 border-slate-800 flex flex-col items-center justify-center relative overflow-hidden bg-slate-900/60 shadow-2xl">
          {/* Subtle Progress Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-blue-600/10 transition-all duration-1000"
            style={{ height: `${progressPercent}%` }}
          />

          <span className="text-5xl lg:text-6xl font-extrabold tracking-tight font-mono text-slate-100 z-10">
            {formatTime(timeLeft)}
          </span>

          <span className="text-xs font-medium text-slate-400 mt-2 z-10 uppercase tracking-widest">
            {mode === 'work' ? 'Stay Focused' : 'Take a Break'}
          </span>

          {selectedTask && (
            <span className="text-xs text-blue-400 font-medium max-w-[180px] truncate mt-1 z-10">
              {selectedTask.title}
            </span>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-center gap-4 max-w-xs mx-auto">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`flex-1 py-3 px-6 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition transform hover:scale-105 active:scale-95 ${
            isActive
              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-5 h-5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" /> Start Focus
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Reset Timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {isFullscreen && (
        <div className="mt-8 text-xs text-slate-500 max-w-sm">
          "Distraction-free environment. Breathe, eliminate notifications, and focus on one task."
        </div>
      )}
    </div>
  );
};
