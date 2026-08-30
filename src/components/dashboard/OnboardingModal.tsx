'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { UserPreferences } from '@/lib/types';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (firstTaskTitle?: string) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [studyAreas, setStudyAreas] = useState<string>('');
  const [dailyTarget, setDailyTarget] = useState<number>(120);
  const [preferredTime, setPreferredTime] = useState<string>('morning');
  const [trackMeditation, setTrackMeditation] = useState<boolean>(true);
  const [usePomodoro, setUsePomodoro] = useState<boolean>(true);
  const [firstTask, setFirstTask] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      const areas = studyAreas.split(',').map((s) => s.trim()).filter(Boolean);
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onboarded: true,
          study_areas: areas,
          daily_study_target_mins: Number(dailyTarget),
          preferred_study_time: preferredTime,
          track_meditation: trackMeditation,
          use_pomodoro: usePomodoro,
        }),
      });

      if (firstTask.trim()) {
        // Create first task if typed
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: firstTask.trim(),
            due_date: new Date().toISOString().split('T')[0],
            priority: 'high',
            is_focus_today: true,
          }),
        });
      }

      onComplete(firstTask.trim());
    } catch (err) {
      console.error('Onboarding save error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 max-w-lg w-full shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Let's build your first productive day</h2>
            <p className="text-xs text-slate-400">Welcome! Customize your study companion preferences.</p>
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Main Study / Focus Areas (optional, comma-separated)
              </label>
              <input
                type="text"
                value={studyAreas}
                onChange={(e) => setStudyAreas(e.target.value)}
                placeholder="e.g. DSA, Computer Networks, SQL"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Daily Target (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="720"
                  step="15"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Preferred Study Time
                </label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 cursor-pointer">
                <span className="text-sm font-medium text-slate-200">Use Pomodoro Focus Timer</span>
                <input
                  type="checkbox"
                  checked={usePomodoro}
                  onChange={(e) => setUsePomodoro(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 cursor-pointer">
                <span className="text-sm font-medium text-slate-200">Track Breathing & Meditation</span>
                <input
                  type="checkbox"
                  checked={trackMeditation}
                  onChange={(e) => setTrackMeditation(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                />
              </label>
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                What is your main focus or first task today? (Optional)
              </label>
              <input
                type="text"
                value={firstTask}
                onChange={(e) => setFirstTask(e.target.value)}
                placeholder="e.g. Complete 5 Arrays problems"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 text-xs text-blue-300 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400" /> Pure activity tracking
              </p>
              <p className="text-blue-300/80">
                Your workspace starts clean. All scores, streaks, level progression, and heatmaps will update automatically as you log real progress.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSavePreferences}
                disabled={loading}
                className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Saving...' : 'Start Productivity Journey'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
