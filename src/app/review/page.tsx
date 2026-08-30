'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FileText, Save, CheckCircle2, TrendingUp, Clock, Flame, Repeat } from 'lucide-react';

export default function WeeklyReviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [weekStart, setWeekStart] = useState<string>('');
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatCouldImprove, setWhatCouldImprove] = useState('');
  const [focusNextWeek, setFocusNextWeek] = useState('');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyReview();
  }, []);

  const fetchWeeklyReview = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/weekly-review');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setWeekStart(data.weekStart);
        if (data.review) {
          setWhatWentWell(data.review.what_went_well || '');
          setWhatCouldImprove(data.review.what_could_improve || '');
          setFocusNextWeek(data.review.focus_next_week || '');
        }
      }
    } catch (err) {
      console.error('Fetch weekly review error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    try {
      const res = await fetch('/api/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start_date: weekStart,
          what_went_well: whatWentWell,
          what_could_improve: whatCouldImprove,
          focus_next_week: focusNextWeek,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save review error:', err);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Weekly Reflection & Review
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Weekly recap of completed study hours, habit momentum, and strategic adjustments.
          </p>
        </div>

        {/* Weekly Metrics Summary Cards */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Tasks Completed</span>
              <div className="text-2xl font-extrabold text-slate-100 mt-1">
                {metrics.tasksCompleted}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{metrics.postponedTasks} postponed</p>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Study Hours</span>
              <div className="text-2xl font-extrabold text-blue-400 mt-1">
                {metrics.studyHours}h
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{metrics.pomodoroSessions} Pomodoros</p>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Habits Logged</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {metrics.habitsCompleted}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Weekly total</p>
            </div>

            <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 font-medium">Active Streak</span>
              <div className="text-2xl font-extrabold text-amber-400 mt-1 flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 fill-amber-400" /> {metrics.currentStreak}d
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Current streak</p>
            </div>
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Weekly reflection saved!
          </div>
        )}

        {/* Reflection Cards Form */}
        <form onSubmit={handleSaveReview} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              What went well this week?
            </label>
            <textarea
              rows={3}
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              placeholder="e.g. Maintained 5 days streak, finished DSA Arrays module..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              What could be improved?
            </label>
            <textarea
              rows={3}
              value={whatCouldImprove}
              onChange={(e) => setWhatCouldImprove(e.target.value)}
              placeholder="e.g. Reduce evening phone distractions, stick to 25m Pomodoro cycles..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Primary Focus for Next Week
            </label>
            <textarea
              rows={3}
              value={focusNextWeek}
              onChange={(e) => setFocusNextWeek(e.target.value)}
              placeholder="e.g. Master Computer Networks OSI & TCP layers, practice 10 SQL queries..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition"
            >
              <Save className="w-4 h-4" /> Save Weekly Review
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
