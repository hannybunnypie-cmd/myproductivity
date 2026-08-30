'use client';

import React, { useState, useEffect } from 'react';
import { Wind, Heart, Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BreathingGuideProps {
  onSessionComplete?: () => void;
}

export const BreathingGuide: React.FC<BreathingGuideProps> = ({ onSessionComplete }) => {
  const [activeTab, setActiveTab] = useState<'breathing' | 'meditation'>('breathing');

  // Breathing state
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [cyclesCompleted, setCyclesCompleted] = useState(0);

  // Meditation state
  const [medDuration, setMedDuration] = useState<number>(5); // 5 mins
  const [medTimeLeft, setMedTimeLeft] = useState<number>(5 * 60);
  const [isMeditating, setIsMeditating] = useState(false);

  // Breathing animation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isBreathing) {
      if (breathPhase === 'Inhale') {
        timer = setTimeout(() => setBreathPhase('Hold'), 4000); // 4s Inhale
      } else if (breathPhase === 'Hold') {
        timer = setTimeout(() => setBreathPhase('Exhale'), 4000); // 4s Hold
      } else if (breathPhase === 'Exhale') {
        timer = setTimeout(() => {
          setCyclesCompleted((c) => c + 1);
          setBreathPhase('Inhale');
        }, 4000); // 4s Exhale
      }
    }
    return () => clearTimeout(timer);
  }, [isBreathing, breathPhase]);

  // Meditation timer loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isMeditating) {
      timer = setInterval(() => {
        setMedTimeLeft((prev) => {
          if (prev <= 1) {
            handleMeditationFinished();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isMeditating]);

  const handleFinishBreathing = async () => {
    setIsBreathing(false);
    if (cyclesCompleted >= 2) {
      confetti({ particleCount: 50, spread: 50 });
      try {
        await fetch('/api/meditation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'breathing', duration_mins: Math.max(1, Math.round((cyclesCompleted * 12) / 60)), completed: true }),
        });
        if (onSessionComplete) onSessionComplete();
      } catch (err) {
        console.error('Failed to log breathing:', err);
      }
    }
  };

  const handleMeditationFinished = async () => {
    setIsMeditating(false);
    confetti({ particleCount: 70, spread: 60 });
    try {
      await fetch('/api/meditation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meditation', duration_mins: medDuration, completed: true }),
      });
      if (onSessionComplete) onSessionComplete();
    } catch (err) {
      console.error('Failed to log meditation:', err);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl text-center space-y-6">
      {/* Selector Tab */}
      <div className="inline-flex p-1 rounded-2xl bg-slate-800/80 border border-slate-700/50">
        <button
          onClick={() => {
            setIsBreathing(false);
            setIsMeditating(false);
            setActiveTab('breathing');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'breathing' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wind className="w-4 h-4" /> Box Breathing
        </button>

        <button
          onClick={() => {
            setIsBreathing(false);
            setIsMeditating(false);
            setActiveTab('meditation');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'meditation' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Heart className="w-4 h-4" /> Meditation Timer
        </button>
      </div>

      {activeTab === 'breathing' ? (
        <div className="space-y-6 py-4">
          {/* Animated Circle */}
          <div className="relative inline-flex items-center justify-center my-4">
            <div
              className={`w-52 h-52 lg:w-60 lg:h-60 rounded-full border-4 border-blue-500/30 flex flex-col items-center justify-center transition-all duration-1000 ${
                isBreathing && breathPhase === 'Inhale'
                  ? 'scale-110 bg-blue-600/20 border-blue-400 shadow-2xl shadow-blue-500/30'
                  : isBreathing && breathPhase === 'Hold'
                  ? 'scale-110 bg-indigo-600/20 border-indigo-400 shadow-2xl shadow-indigo-500/30'
                  : isBreathing && breathPhase === 'Exhale'
                  ? 'scale-90 bg-slate-800/40 border-slate-600'
                  : 'bg-slate-800/20 border-slate-700'
              }`}
            >
              <span className="text-2xl font-bold text-slate-100 mb-1">
                {isBreathing ? breathPhase : 'Ready'}
              </span>
              <span className="text-xs text-slate-400">
                {isBreathing ? '4 Seconds' : '4-4-4 Box Technique'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Box breathing lowers stress and increases mental clarity before intense study sessions.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (!isBreathing) {
                  setIsBreathing(true);
                  setBreathPhase('Inhale');
                } else {
                  handleFinishBreathing();
                }
              }}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/20"
            >
              {isBreathing ? 'Finish & Record Session' : 'Start Breathing Exercise'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-center gap-2">
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setIsMeditating(false);
                  setMedDuration(m);
                  setMedTimeLeft(m * 60);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${
                  medDuration === m ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m} Minutes
              </button>
            ))}
          </div>

          <div className="my-6">
            <span className="text-6xl font-bold font-mono tracking-tight text-slate-100">
              {formatTime(medTimeLeft)}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setIsMeditating(!isMeditating)}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-lg shadow-blue-600/20"
            >
              {isMeditating ? 'Pause' : 'Start Meditation'}
            </button>
            <button
              onClick={() => {
                setIsMeditating(false);
                setMedTimeLeft(medDuration * 60);
              }}
              className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
