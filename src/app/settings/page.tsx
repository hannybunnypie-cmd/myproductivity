'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Settings as SettingsIcon, Download, Trash2, Save, CheckCircle2, User, Moon, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dailyTarget, setDailyTarget] = useState(120);
  const [pomodoroWork, setPomodoroWork] = useState(25);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [timezone, setTimezone] = useState('UTC');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setName(data.user?.name || '');
        setEmail(data.user?.email || '');
        if (data.preferences) {
          setDailyTarget(data.preferences.daily_study_target_mins || 120);
          setPomodoroWork(data.preferences.pomodoro_work_mins || 25);
          setTheme(data.preferences.theme || 'dark');
          setTimezone(data.preferences.timezone || 'UTC');
        }
      }
    } catch (err) {
      console.error('Fetch settings error:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          daily_study_target_mins: Number(dailyTarget),
          pomodoro_work_mins: Number(pomodoroWork),
          theme,
          timezone,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        fetchSettings();
      }
    } catch (err) {
      console.error('Save settings error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    window.open('/api/user/export', '_blank');
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to permanently delete your account and all data? This cannot be undone.')) {
      try {
        const res = await fetch('/api/user/delete', { method: 'DELETE' });
        if (res.ok) {
          router.push('/login');
        }
      } catch (err) {
        console.error('Delete account error:', err);
      }
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-400" /> Account & App Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal profile, study targets, timer preferences, and data privacy.
          </p>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Preferences updated successfully!
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">Profile Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-slate-500 text-xs cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">Study & Timer Preferences</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Daily Study Target (Minutes)</label>
                <input
                  type="number"
                  min="15"
                  max="720"
                  step="15"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Pomodoro Work Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={pomodoroWork}
                  onChange={(e) => setPomodoroWork(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-600/20"
            >
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Data Privacy & Danger Zone */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2">Data & Privacy</h3>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-200">Export Personal Data</h4>
              <p className="text-[11px] text-slate-400">Download a complete JSON export of all your tasks, logs, and analytics.</p>
            </div>
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium shrink-0"
            >
              <Download className="w-4 h-4" /> Export My Data
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-semibold text-rose-300">Delete Account</h4>
              <p className="text-[11px] text-slate-400">Permanently delete your account and clear all stored data.</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-medium shrink-0"
            >
              <Trash2 className="w-4 h-4" /> Delete Account
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
