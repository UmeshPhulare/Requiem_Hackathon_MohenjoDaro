// PerformanceChart.jsx — Portfolio performance line chart using Recharts
import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { getPortfolioPerformance, getDateRange } from '../../data/demoHistoricalData.js';
import { formatINR } from '../../utils/formatCurrency.js';
import { clsx } from 'clsx';

const DATE_RANGES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-[#E1E7EF] rounded-xl p-3 shadow-lg text-[12.5px]">
      <p className="text-[#6B7890] mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-[#6B7890]">{entry.name}</span>
          </span>
          <span className="font-semibold text-[#172D4A]">{formatINR(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function formatXAxis(dateStr, range) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (range === '1W' || range === '1M') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (range === '3M' || range === '6M') return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function tickInterval(len, range) {
  if (range === '1W') return Math.floor(len / 5);
  if (range === '1M') return Math.floor(len / 6);
  if (range === '3M') return Math.floor(len / 6);
  if (range === '6M') return Math.floor(len / 6);
  if (range === '1Y') return Math.floor(len / 8);
  return Math.floor(len / 10);
}

export default function PerformanceChart() {
  const { portfolio, dateRange, setDateRange, benchmark } = usePortfolio();
  const [activeRange, setActiveRange] = useState(dateRange || '1Y');

  const chartData = useMemo(() => {
    const holdings = portfolio.holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }));
    const { startDate, endDate } = getDateRange(activeRange);
    const { dates, portfolioValues, benchmarkValues } = getPortfolioPerformance(
      holdings, 1000000, startDate, endDate
    );
    if (!dates.length) return [];

    // Downsample for performance — max 200 points
    const step = Math.max(1, Math.floor(dates.length / 200));
    return dates
      .filter((_, i) => i % step === 0 || i === dates.length - 1)
      .map((date, idx) => ({
        date,
        portfolio: portfolioValues[idx * step] ?? portfolioValues[portfolioValues.length - 1],
        benchmark: benchmarkValues[idx * step] ?? benchmarkValues[benchmarkValues.length - 1],
      }));
  }, [portfolio.holdings, activeRange]);

  const handleRangeChange = (range) => {
    setActiveRange(range);
    setDateRange(range);
  };

  const initialValue = chartData[0]?.portfolio ?? 1000000;
  const finalValue = chartData[chartData.length - 1]?.portfolio ?? 1000000;
  const totalReturn = ((finalValue - initialValue) / initialValue) * 100;

  return (
    <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[#172D4A]">Portfolio Performance</h3>
          <p className="text-[12px] text-[#6B7890] mt-0.5">
            vs {benchmark} benchmark · ₹10L invested
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#F5F7FB] rounded-lg p-1">
          {DATE_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
              className={clsx(
                'px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-all',
                activeRange === r
                  ? 'bg-white text-[#3478CC] shadow-sm'
                  : 'text-[#6B7890] hover:text-[#172D4A]'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Return badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[13px] text-[#6B7890]">Period return:</span>
        <span className={clsx(
          'text-[13px] font-semibold',
          totalReturn >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]'
        )}>
          {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
        </span>
      </div>

      {/* Chart */}
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F7" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#6B7890' }}
              tickLine={false}
              axisLine={false}
              interval={tickInterval(chartData.length, activeRange)}
              tickFormatter={(v) => formatXAxis(v, activeRange)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7890' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
              width={54}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', color: '#6B7890', paddingTop: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="portfolio"
              name="My Portfolio"
              stroke="#3478CC"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3478CC' }}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              name="NIFTY 50"
              stroke="#D99120"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 4, fill: '#D99120' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
