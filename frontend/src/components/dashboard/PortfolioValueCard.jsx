// PortfolioValueCard.jsx — Left Upper Card matching Reference Image 1
import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MoreVertical, ChevronDown } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { getPortfolioPerformance, getDateRange } from '../../data/demoHistoricalData.js';
import { formatINR } from '../../utils/formatCurrency.js';
import { clsx } from 'clsx';

const PERIOD_OPTIONS = [
  { label: 'Weekly', range: '1W' },
  { label: 'Monthly', range: '1M' },
  { label: '3 Months', range: '3M' },
  { label: '6 Months', range: '6M' },
  { label: 'Yearly', range: '1Y' },
  { label: 'All Time', range: 'ALL' },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const portfolioVal = payload.find((p) => p.dataKey === 'portfolio')?.value;
  if (!portfolioVal) return null;

  const dateObj = new Date(label);
  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-[#181A24] text-white rounded-xl px-3 py-1.5 shadow-2xl text-center pointer-events-none border border-white/10">
      <p className="text-[12.5px] font-bold text-white tracking-tight">
        {formatINR(portfolioVal)}
      </p>
      <p className="text-[10px] text-[#A0AEC0] mt-0.5 font-medium">
        {formattedDate}
      </p>
    </div>
  );
}

export default function PortfolioValueCard() {
  const { portfolio, dateRange, setDateRange } = usePortfolio();
  const [selectedPeriod, setSelectedPeriod] = useState(
    PERIOD_OPTIONS.find((p) => p.range === (dateRange || '1Y')) || PERIOD_OPTIONS[4]
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { totalMarketValue = 0, totalCostBasis = 0, holdings = [] } = portfolio;
  const hasHoldings = holdings && holdings.length > 0;
  const todayPL = hasHoldings ? totalMarketValue * 0.0066 : 0;
  const todayPLPct = hasHoldings ? 0.66 : 0;

  const chartData = useMemo(() => {
    if (!hasHoldings || totalMarketValue === 0) return [];
    const holdingWeights = holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }));
    const { startDate, endDate } = getDateRange(selectedPeriod.range);
    const { dates, portfolioValues, benchmarkValues } = getPortfolioPerformance(
      holdingWeights, totalMarketValue, startDate, endDate
    );
    if (!dates.length) return [];

    const step = Math.max(1, Math.floor(dates.length / 120));
    return dates
      .filter((_, i) => i % step === 0 || i === dates.length - 1)
      .map((date, idx) => ({
        date,
        portfolio: portfolioValues[idx * step] ?? portfolioValues[portfolioValues.length - 1],
        benchmark: benchmarkValues[idx * step] ?? benchmarkValues[benchmarkValues.length - 1],
      }));
  }, [holdings, totalMarketValue, selectedPeriod.range, hasHoldings]);

  // Derive exactly 1 tick per month for clean axis display matching Image 1
  const monthTicks = useMemo(() => {
    const seen = new Set();
    const ticks = [];
    chartData.forEach((d) => {
      const monthKey = d.date.slice(0, 7);
      if (!seen.has(monthKey)) {
        seen.add(monthKey);
        ticks.push(d.date);
      }
    });
    return ticks;
  }, [chartData]);

  const handleSelectPeriod = (opt) => {
    setSelectedPeriod(opt);
    setDateRange?.(opt.range);
    setDropdownOpen(false);
  };

  return (
    <div className="bg-white rounded-[20px] p-4 sm:p-4.5 shadow-[0_2px_8px_rgba(8,11,71,0.03)] border border-[#ECEFF4] flex flex-col justify-between h-[285px]">
      {/* ── Top Row: Header & Controls ────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-[14.5px] font-bold text-[#181A24]">Portfolio Value</h2>

          <div className="flex items-center gap-1.5 relative">
            {/* Period Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-full px-2.5 py-0.5 text-[11.5px] font-medium text-[#181A24] flex items-center gap-1 shadow-2xs transition-colors"
              >
                <span>{selectedPeriod.label}</span>
                <ChevronDown size={11} className={clsx('text-[#7B8290] transition-transform', dropdownOpen && 'rotate-180')} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-7 mt-1 w-32 bg-white rounded-xl border border-[#E5E7EB] shadow-lg p-1 z-40 animate-fade-in">
                    {PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.range}
                        onClick={() => handleSelectPeriod(opt)}
                        className={clsx(
                          'w-full text-left px-2.5 py-1.5 rounded-lg text-[11.5px] transition-colors',
                          selectedPeriod.range === opt.range
                            ? 'bg-[#EAF2FF] text-[#3478CC] font-semibold'
                            : 'text-[#181A24] hover:bg-[#F4F5F8]'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Overflow menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-6 h-6 rounded-full border border-[#E5E7EB] flex items-center justify-center text-[#7B8290] hover:text-[#181A24] hover:bg-[#F4F5F8] transition-colors"
              >
                <MoreVertical size={12} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-7 mt-1 w-32 bg-white rounded-xl border border-[#E5E7EB] shadow-lg p-1 z-40 text-[11.5px] animate-fade-in">
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4F5F8] text-[#181A24]"
                    >
                      Export Chart
                    </button>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F4F5F8] text-[#181A24]"
                    >
                      Reset Zoom
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Headline Value & Badges ──────────────────────────── */}
        <div className="mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[26px] sm:text-[28px] font-extrabold text-[#181A24] tracking-tight leading-none">
              {formatINR(totalMarketValue)}
            </span>
            <span className="inline-flex items-center gap-0.5 bg-[#EAF8F0] border border-[#27AE60]/20 text-[#27AE60] text-[11px] font-bold px-2 py-0.5 rounded-full">
              ▲ +{todayPLPct.toFixed(2)}%
            </span>
          </div>

          <p className="text-[11.5px] text-[#7B8290] mt-0.5 font-medium">
            + {formatINR(todayPL)} from yesterday &nbsp;·&nbsp; Invested: {formatINR(totalCostBasis)}
          </p>
        </div>
      </div>

      {/* ── Performance Area Chart ─────────────────────────────── */}
      <div className="w-full flex items-center justify-center" style={{ height: 165 }}>
        {hasHoldings && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: -4, left: -14 }}>
              <defs>
                <linearGradient id="valueChartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B61FF" stopOpacity={0.20} />
                  <stop offset="100%" stopColor="#5B61FF" stopOpacity={0.00} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6" vertical={false} />
              <XAxis
                dataKey="date"
                ticks={monthTicks}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10.5, fill: '#7B8290', fontWeight: 500 }}
                tickFormatter={(v) => {
                  const d = new Date(v);
                  return d.toLocaleDateString('en-US', { month: 'short' });
                }}
                dy={4}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10.5, fill: '#7B8290', fontWeight: 500 }}
                tickFormatter={(v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${Math.round(v)}`)}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="portfolio"
                stroke="#5B61FF"
                strokeWidth={2}
                fill="url(#valueChartGradient)"
                activeDot={{ r: 4.5, fill: '#5B61FF', stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <p className="text-xs font-bold text-[#181A24]">No positions in your MongoDB portfolio yet</p>
            <p className="text-[11px] text-[#7B8290] mt-1 max-w-xs">
              Add your actual investments in My Portfolio to view dynamic quantitative performance tracking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
