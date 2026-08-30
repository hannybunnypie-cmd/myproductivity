'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/common/EmptyState';
import { Trophy, Zap, Lock, CheckCircle2, Flame, Award } from 'lucide-react';
import { Achievement, UserXP } from '@/lib/types';

export default function AchievementsPage() {
  const [userXP, setUserXP] = useState<UserXP | null>(null);
  const [levelThresholds, setLevelThresholds] = useState<{ currentLevelXP: number; nextLevelXP: number } | null>(null);
  const [achievements, setAchievements] = useState<
    { achievement: Achievement; unlocked: boolean; unlockedAt: string | null; progress: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievementsData();
  }, []);

  const fetchAchievementsData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/achievements');
      if (res.ok) {
        const data = await res.json();
        setUserXP(data.userXP);
        setLevelThresholds(data.levelThresholds);
        setAchievements(data.achievements || []);
      }
    } catch (err) {
      console.error('Fetch achievements error:', err);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Calculate XP progress bar inside current level
  let levelProgressPercent = 0;
  if (userXP && levelThresholds) {
    const xpInLevel = userXP.total_xp - levelThresholds.currentLevelXP;
    const levelXPDiff = levelThresholds.nextLevelXP - levelThresholds.currentLevelXP;
    if (levelXPDiff > 0) {
      levelProgressPercent = Math.min(100, Math.max(0, Math.round((xpInLevel / levelXPDiff) * 100)));
    }
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" /> Gamification & Achievements
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Earn XP from real tasks, Pomodoros, and study sessions to unlock milestones.
          </p>
        </div>

        {/* Level Progression Card */}
        {userXP && levelThresholds && (
          <div className="p-6 lg:p-8 rounded-3xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-800/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-amber-500/20">
                  L{userXP.level}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Level {userXP.level} Scholar</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {userXP.total_xp} Total XP earned from actual activity
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-amber-400 font-bold flex items-center gap-1 justify-end">
                  <Award className="w-4 h-4" /> {unlockedCount} / {achievements.length} Achievements Unlocked
                </span>
              </div>
            </div>

            {/* Level XP Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-400 font-medium">
                <span>Current Level Progress</span>
                <span>
                  {userXP.total_xp} / {levelThresholds.nextLevelXP} XP
                </span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-amber-500 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Achievements Grid */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-100">Milestone Achievements</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map(({ achievement, unlocked, unlockedAt, progress }) => (
              <div
                key={achievement.id}
                className={`p-5 rounded-3xl border transition-all ${
                  unlocked
                    ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                      unlocked
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-600 border border-slate-700'
                    }`}
                  >
                    {unlocked ? <Trophy className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-100 truncate">{achievement.title}</h4>
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-full shrink-0">
                        +{achievement.xp_reward} XP
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">{achievement.description}</p>

                    {unlocked ? (
                      <p className="text-[10px] text-emerald-400 font-semibold mt-3 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Unlocked {unlockedAt ? new Date(unlockedAt).toLocaleDateString() : ''}
                      </p>
                    ) : (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                          <span>Requirement Progress</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-slate-600 h-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
