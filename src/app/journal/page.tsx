'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BookOpen, Calendar, Save, CheckCircle2 } from 'lucide-react';
import { JournalEntry } from '@/lib/types';

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [accomplishments, setAccomplishments] = useState('');
  const [distractions, setDistractions] = useState('');
  const [learnings, setLearnings] = useState('');
  const [improvements, setImprovements] = useState('');

  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchJournalEntry(selectedDate);
  }, [selectedDate]);

  const fetchJournalEntry = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/journal?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        if (data.entry) {
          setAccomplishments(data.entry.accomplishments || '');
          setDistractions(data.entry.distractions || '');
          setLearnings(data.entry.learnings || '');
          setImprovements(data.entry.improvements || '');
        } else {
          setAccomplishments('');
          setDistractions('');
          setLearnings('');
          setImprovements('');
        }
      }
    } catch (err) {
      console.error('Fetch journal error:', err);
    }
  };

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_date: selectedDate,
          accomplishments,
          distractions,
          learnings,
          improvements,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        fetchJournalEntry(selectedDate);
      }
    } catch (err) {
      console.error('Save journal error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-400" /> Daily Productivity Journal
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              End-of-day reflection on achievements, distractions, and key takeaways.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none"
            />
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Journal entry saved successfully! (+15 XP)
          </div>
        )}

        {/* Journal Form */}
        <form onSubmit={handleSaveJournal} className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              1. What did I accomplish today?
            </label>
            <textarea
              rows={3}
              value={accomplishments}
              onChange={(e) => setAccomplishments(e.target.value)}
              placeholder="e.g. Solved 5 arrays problems, completed TCP/IP notes..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              2. What distracted or slowed me down?
            </label>
            <textarea
              rows={2}
              value={distractions}
              onChange={(e) => setDistractions(e.target.value)}
              placeholder="e.g. Social media notifications, staying up late..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              3. What key concepts or lessons did I learn today?
            </label>
            <textarea
              rows={2}
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              placeholder="e.g. Learned Sliding Window pattern and 3-way handshake..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              4. What do I want to improve tomorrow?
            </label>
            <textarea
              rows={2}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="e.g. Start study session right after breakfast..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-lg shadow-blue-600/20 transition"
            >
              <Save className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Journal Entry'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
