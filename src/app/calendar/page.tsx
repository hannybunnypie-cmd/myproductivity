'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Clock, Repeat } from 'lucide-react';
import { Task, HabitLog } from '@/lib/types';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(new Date().toISOString().split('T')[0]);

  const [dateDetails, setDateDetails] = useState<{
    tasks: Task[];
    completedTasks: Task[];
    habitsCount: number;
    studyMins: number;
    score: number | null;
  }>({
    tasks: [],
    completedTasks: [],
    habitsCount: 0,
    studyMins: 0,
    score: null,
  });

  const [monthActivityMap, setMonthActivityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchDateDetails(selectedDateStr);
    fetchMonthSummary();
  }, [selectedDateStr, currentMonth]);

  const fetchDateDetails = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/tasks?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        const allTasks: Task[] = data.tasks || [];
        const done = allTasks.filter((t) => t.status === 'completed');

        // Fetch score & analytics summary
        const analyticsRes = await fetch('/api/analytics?timeframe=30');
        let dayScore: number | null = null;
        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          const trendItem = aData.summary?.scoreTrend?.find((s: any) => s.date === dateStr);
          if (trendItem) dayScore = trendItem.score;
        }

        setDateDetails({
          tasks: allTasks,
          completedTasks: done,
          habitsCount: 0,
          studyMins: 0,
          score: dayScore,
        });
      }
    } catch (err) {
      console.error('Fetch calendar date details error:', err);
    }
  };

  const fetchMonthSummary = async () => {
    try {
      const analyticsRes = await fetch('/api/analytics?timeframe=90');
      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        const heatmap = aData.summary?.heatmapData || [];
        const map: Record<string, number> = {};
        for (const h of heatmap) {
          if (h.count > 0) map[h.date] = h.count;
        }
        setMonthActivityMap(map);
      }
    } catch (err) {
      console.error('Fetch month summary error:', err);
    }
  };

  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  // Generate calendar days
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
  const totalDays = lastDay.getDate();

  const daysGrid: (string | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) daysGrid.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    daysGrid.push(dStr);
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-400" /> Calendar & Study Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review past productivity and inspect tasks, habits, and scores by date.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar Grid */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100">{monthName}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-500 py-1 border-b border-slate-800">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {daysGrid.map((dStr, idx) => {
                if (!dStr) return <div key={idx} className="h-10 sm:h-12" />;

                const isSelected = dStr === selectedDateStr;
                const activityCount = monthActivityMap[dStr] || 0;
                const dayNum = parseInt(dStr.split('-')[2], 10);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDateStr(dStr)}
                    className={`h-10 sm:h-12 rounded-2xl flex flex-col items-center justify-center relative transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                        : activityCount > 0
                        ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-emerald-500/40'
                        : 'bg-slate-900/40 hover:bg-slate-800/50 text-slate-400 border border-slate-800'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{dayNum}</span>
                    {activityCount > 0 && !isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Summary Inspector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                Summary for {selectedDateStr}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {dateDetails.score !== null ? `Daily Score: ${dateDetails.score}/100` : 'No calculated score for this day'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed Tasks
                </span>
                <span className="font-bold text-slate-100">{dateDetails.completedTasks.length}</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" /> Tasks Scheduled
                </span>
                <span className="font-bold text-slate-100">{dateDetails.tasks.length}</span>
              </div>
            </div>

            {/* Task titles for date */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-slate-300 mb-2">Tasks List:</h4>
              {dateDetails.tasks.length > 0 ? (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {dateDetails.tasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-200 truncate flex items-center justify-between"
                    >
                      <span className={t.status === 'completed' ? 'line-through text-slate-500' : ''}>
                        {t.title}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize">{t.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No tasks logged on this date.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
