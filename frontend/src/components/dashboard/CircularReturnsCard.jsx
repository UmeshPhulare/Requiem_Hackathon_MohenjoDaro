// CircularReturnsCard.jsx — Right Upper Card with circular radial tick visualization matching Reference Image 1
import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatINR } from '../../utils/formatCurrency.js';
import { clsx } from 'clsx';

const CATEGORIES = [
  { name: 'Stocks', color: '#27AE60', pct: 40 },
  { name: 'Funds', color: '#3478CC', pct: 25 },
  { name: 'Bonds', color: '#A65DF0', pct: 20 },
  { name: 'Red Stocks', color: '#F36F69', pct: 15 },
];

export default function CircularReturnsCard() {
  const { portfolio } = usePortfolio();
  const [period, setPeriod] = useState('Yearly');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { totalUnrealizedPL = 0, totalUnrealizedPLPct = 0, holdings = [] } = portfolio;
  const totalProfit = Math.abs(totalUnrealizedPL || 0);
  const isPositive = totalUnrealizedPL >= 0;
  const hasHoldings = holdings && holdings.length > 0;

  // Generate radial ticks for the ring
  const numTicks = 52;
  const cx = 85;
  const cy = 85;
  const rInner = 48;
  const rOuter = 66;

  const ticks = useMemo(() => {
    return Array.from({ length: numTicks }).map((_, i) => {
      // Angle starting from top (-90 deg) going clockwise
      const angleDeg = -90 + (i * 360) / numTicks;
      const angleRad = (angleDeg * Math.PI) / 180;

      const x1 = cx + rInner * Math.cos(angleRad);
      const y1 = cy + rInner * Math.sin(angleRad);
      const x2 = cx + rOuter * Math.cos(angleRad);
      const y2 = cy + rOuter * Math.sin(angleRad);

      const frac = i / numTicks;
      let strokeColor = '#27AE60';
      if (!hasHoldings) {
        strokeColor = '#E2E6EE'; // Subtle neutral ticks when no holdings
      } else if (frac < 0.40) {
        strokeColor = '#27AE60'; // Stocks (Green)
      } else if (frac < 0.65) {
        strokeColor = '#3478CC'; // Funds (Blue)
      } else if (frac < 0.85) {
        strokeColor = '#A65DF0'; // Bonds (Violet)
      } else {
        strokeColor = '#F36F69'; // Others (Coral)
      }

      return { i, x1, y1, x2, y2, strokeColor };
    });
  }, [hasHoldings]);

  return (
    <div className="bg-white rounded-[20px] p-4 sm:p-5 shadow-[0_2px_8px_rgba(8,11,71,0.03)] border border-[#ECEFF4] flex flex-col justify-between h-[285px]">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-0.5">
        <h2 className="text-[14.5px] font-bold text-[#181A24]">Total Profits</h2>

        {/* Period dropdown button */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-full px-2.5 py-0.5 text-[11.5px] font-medium text-[#181A24] flex items-center gap-1 shadow-2xs transition-colors"
          >
            <span>{period}</span>
            <ChevronDown size={11} className={clsx('text-[#7B8290] transition-transform', dropdownOpen && 'rotate-180')} />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-7 mt-1 w-28 bg-white rounded-xl border border-[#E5E7EB] shadow-lg p-1 z-40 animate-fade-in">
                {['Weekly', 'Monthly', 'Yearly'].map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setDropdownOpen(false); }}
                    className={clsx(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] transition-colors',
                      period === p
                        ? 'bg-[#EAF2FF] text-[#3478CC] font-semibold'
                        : 'text-[#181A24] hover:bg-[#F4F5F8]'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Circular Radial Dial ──────────────────────────────── */}
      <div className="flex items-center justify-center my-auto py-0.5">
        <div className="relative" style={{ width: 170, height: 170 }}>
          <svg viewBox="0 0 170 170" className="w-full h-full">
            {ticks.map((t) => (
              <line
                key={t.i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.strokeColor}
                strokeWidth="2.8"
                strokeLinecap="round"
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </svg>

          {/* Centered Values */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
            <span className="text-[23px] font-extrabold text-[#181A24] tracking-tight leading-none">
              {formatINR(totalProfit)}
            </span>
            <span className={clsx(
              'text-[11.5px] font-semibold mt-0.5',
              isPositive ? 'text-[#27AE60]' : 'text-[#F36F69]'
            )}>
              {isPositive ? '+' : ''}{(totalUnrealizedPLPct * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-[#7B8290] font-medium mt-0.5">
              from last years
            </span>
          </div>
        </div>
      </div>

      {/* ── Legend below dial ──────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 pt-0.5 flex-nowrap">
        {CATEGORIES.map((cat) => (
          <div key={cat.name} className="flex items-center gap-1 text-[11px] font-medium text-[#181A24]">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-[#181A24] whitespace-nowrap">{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
