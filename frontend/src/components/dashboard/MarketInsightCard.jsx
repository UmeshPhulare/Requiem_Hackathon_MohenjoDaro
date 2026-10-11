// MarketInsightCard.jsx — Lower Right Card matching Reference Image 1
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_NEWS } from '../../data/demoNews.js';
import { Building2, Zap, Cpu, Car } from 'lucide-react';

const NEWS_VISUALS = [
  {
    bg: 'from-slate-700 to-slate-900',
    icon: Building2,
    iconColor: '#93C5FD',
  },
  {
    bg: 'from-emerald-700 to-teal-900',
    icon: Zap,
    iconColor: '#A7F3D0',
  },
  {
    bg: 'from-indigo-700 to-purple-900',
    icon: Cpu,
    iconColor: '#C7D2FE',
  },
  {
    bg: 'from-blue-700 to-slate-900',
    icon: Car,
    iconColor: '#FDE68A',
  },
];

export default function MarketInsightCard() {
  const navigate = useNavigate();
  const newsList = DEMO_NEWS.slice(0, 4);

  return (
    <div className="bg-white rounded-[20px] p-4 sm:p-4.5 shadow-[0_2px_8px_rgba(8,11,71,0.03)] border border-[#ECEFF4] flex flex-col justify-between h-[245px]">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-[#181A24]">Market Insight</h3>
        <button
          onClick={() => navigate('/intelligence')}
          className="bg-[#F4F5F8] hover:bg-[#E5E7EB] text-[#181A24] text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors"
        >
          View All
        </button>
      </div>

      {/* ── News rows ─────────────────────────────────────────── */}
      <div className="space-y-2 my-auto">
        {newsList.map((item, idx) => {
          const visual = NEWS_VISUALS[idx % NEWS_VISUALS.length];
          const Icon = visual.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate('/intelligence')}
              className="flex items-center gap-2.5 group cursor-pointer hover:bg-[#F4F5F8] -mx-1 px-1.5 py-0.5 rounded-lg transition-colors"
            >
              {/* Thumbnail */}
              <div
                className={`w-8.5 h-8.5 rounded-lg bg-gradient-to-br ${visual.bg} flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform`}
              >
                <Icon size={15} color={visual.iconColor} strokeWidth={2.2} />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-bold text-[#181A24] leading-snug line-clamp-1 group-hover:text-[#3478CC] transition-colors">
                  {item.headline}
                </p>
                <p className="text-[10.5px] text-[#7B8290] leading-tight line-clamp-1 mt-0.5 font-medium">
                  {item.summary}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
