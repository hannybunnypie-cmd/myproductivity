'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductivityHeatmap } from '@/components/analytics/ProductivityHeatmap';
import { EmptyState } from '@/components/common/EmptyState';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Flame,
  PieChart as PieIcon,
  Sparkles,
  Award,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics(timeframe);
  }, [timeframe]);

  const fetchAnalytics = async (days: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?timeframe=${days}`);
      if (res.ok) {
        setSummary((await res.json()).summary);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasData =
    summary &&
    (summary.taskMetrics.created > 0 ||
      summary.studyMetrics.totalMinutes > 0 ||
      summary.heatmapData.some((h: any) => h.count > 0));

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" /> Productivity Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Empirical activity trends, study durations, category performance, and heatmaps.
          </p>
        </div>

        {hasData ? (
          <>
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Current Streak</span>
                  <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-100 mt-2">
                  {summary.streakInfo.currentStreak} Days
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Longest: {summary.streakInfo.longestStreak} days</p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Tasks Completed</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-100 mt-2">
                  {summary.taskMetrics.completed} / {summary.taskMetrics.created}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {summary.taskMetrics.completionPercentage}% completion rate
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Total Focus Time</span>
                  <Clock className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-extrabold text-slate-100 mt-2">
                  {Math.round(summary.studyMetrics.totalMinutes / 60)} Hours
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {summary.studyMetrics.totalSessions} Pomodoro sessions ({summary.studyMetrics.avgSessionLength}m avg)
                </p>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Productivity Score</span>
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-2xl font-extrabold text-blue-400 mt-2">
                  {summary.dailyScore !== null ? `${summary.dailyScore}/100` : 'Not enough data'}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Weighted daily performance</p>
              </div>
            </div>

            {/* Heatmap Section */}
            <ProductivityHeatmap
              data={summary.heatmapData}
              onSelectTimeframe={(d) => setTimeframe(d)}
            />

            {/* Personal Insights Box */}
            <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-800/40 rounded-3xl p-6 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Personal Insights
              </h3>
              <div className="space-y-2">
                {summary.insights.map((ins: string, idx: number) => (
                  <p key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-blue-400 font-bold">•</span> {ins}
                  </p>
                ))}
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Study Minutes Chart */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-100">Daily Study Minutes</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.studyMetrics.dailyStudyTime}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      />
                      <Bar dataKey="minutes" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Productivity Score Trend Chart */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-bold text-slate-100">Score History Trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summary.scoreTrend}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                      <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={BarChart3}
            title="Your analytics will appear as you build your history"
            description="Complete tasks, run focus timers, and log habits to populate dynamic performance charts."
          />
        )}
      </div>
    </AppLayout>
  );
}
