'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BreathingGuide } from '@/components/meditation/BreathingGuide';
import { Heart } from 'lucide-react';

export default function MeditationPage() {
  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-100 flex items-center justify-center gap-2">
            <Heart className="w-6 h-6 text-rose-400" /> Meditation & Mindful Breathing
          </h1>
          <p className="text-xs text-slate-400">
            Regulate your nervous system and clear stress with guided box breathing or timed meditation.
          </p>
        </div>

        <BreathingGuide />
      </div>
    </AppLayout>
  );
}
