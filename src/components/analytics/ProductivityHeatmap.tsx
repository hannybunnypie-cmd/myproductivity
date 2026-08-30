'use client';

import React, { useState } from 'react';

interface HeatmapCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ProductivityHeatmapProps {
  data: HeatmapCell[];
  onSelectTimeframe?: (days: number) => void;
}

export const ProductivityHeatmap: React.FC<ProductivityHeatmapProps> = ({
  data,
  onSelectTimeframe,
}) => {
  const [timeframe, setTimeframe] = useState<30 | 90 | 365>(30);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const handleTimeframeChange = (days: 30 | 90 | 365) => {
    setTimeframe(days);
    if (onSelectTimeframe) onSelectTimeframe(days);
  };

  const levelColors = {
    0: 'bg-slate-800/60 border-slate-700/30',
    1: 'bg-emerald-950/80 border-emerald-800/60 text-emerald-300',
    2: 'bg-emerald-800 border-emerald-600 text-emerald-200',
    3: 'bg-emerald-600 border-emerald-500 text-white',
    4: 'bg-emerald-400 border-emerald-300 text-slate-950',
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100">Productivity Heatmap</h3>
          <p className="text-xs text-slate-400">
            Real activity matrix based strictly on completed tasks, study sessions, and habits.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/80 border border-slate-700/50">
          {[30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => handleTimeframeChange(d as any)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                timeframe === d
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d === 365 ? '1 Year' : `${d} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid rendering */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1.5 min-w-max">
          {data.map((cell, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredCell(cell)}
              onMouseLeave={() => setHoveredCell(null)}
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs border transition-all transform hover:scale-125 cursor-pointer ${
                levelColors[cell.level]
              }`}
              title={`${cell.date}: ${cell.count} activities`}
            />
          ))}
        </div>
      </div>

      {/* Legend & Hover Info */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <div>
          {hoveredCell ? (
            <span className="text-slate-200 font-medium">
              {hoveredCell.date}: {hoveredCell.count} activities completed
            </span>
          ) : (
            <span>Hover over squares for details</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <span>Less</span>
          <div className="w-3 h-3 bg-slate-800/60 border border-slate-700/30 rounded-xs" />
          <div className="w-3 h-3 bg-emerald-950/80 border border-emerald-800/60 rounded-xs" />
          <div className="w-3 h-3 bg-emerald-800 border border-emerald-600 rounded-xs" />
          <div className="w-3 h-3 bg-emerald-600 border border-emerald-500 rounded-xs" />
          <div className="w-3 h-3 bg-emerald-400 border border-emerald-300 rounded-xs" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
