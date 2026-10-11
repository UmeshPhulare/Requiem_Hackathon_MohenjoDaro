// Backtesting.jsx — Historical strategy backtesting workspace
import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from 'recharts';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { recommendAllocation } from '../services/optimizationService.js';
import { getPortfolioPerformance, TRADING_DATES, getDateRange } from '../data/demoHistoricalData.js';
import {
  dailyReturns, annualizedReturn, annualizedVolatility, maxDrawdown, sharpeRatio, cumulativeGrowth
} from '../utils/financialMetrics.js';
import { formatINR } from '../utils/formatCurrency.js';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const STRATEGY_COLORS = {
  original: '#3478CC',
  recommended: '#16845D',
  equal: '#D99120',
  benchmark: '#7C5ABF',
};

const PERIODS = ['1Y', '3Y', 'ALL'];

function StatCell({ label, value, color }) {
  return (
    <div className="text-center p-3 bg-[#F5F7FB] rounded-xl">
      <p className="text-[11px] text-[#6B7890] mb-1">{label}</p>
      <p className={clsx('text-[15px] font-bold tabular-nums', color || 'text-[#172D4A]')}>{value}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E1E7EF] rounded-xl p-3 shadow-lg text-[12px]">
      <p className="text-[#6B7890] mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-[#6B7890]">{p.name}</span>
          </span>
          <span className="font-semibold text-[#172D4A]">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function getStrategyReturns(holdings, period) {
  const { startDate, endDate } = getDateRange(period === 'ALL' ? 'ALL' : period);
  const startIdx = TRADING_DATES.indexOf(TRADING_DATES.find(d => d >= startDate) || TRADING_DATES[0]);
  return { startDate, endDate, startIdx };
}

export default function Backtesting() {
  const { portfolio } = usePortfolio();
  const [period, setPeriod] = useState('1Y');
  const [initialAmount] = useState(1000000);
  const [activeStrategies, setActiveStrategies] = useState(['original', 'recommended', 'equal', 'benchmark']);

  const symbols = portfolio.holdings.map((h) => h.symbol);
  const currentWeights = portfolio.holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }));
  const equalWeights = symbols.map((s) => ({ symbol: s, weight: 1 / symbols.length }));
  const recommendedWeights = useMemo(() => recommendAllocation(symbols, 'moderate'), [symbols]);
  const benchmarkHoldings = [{ symbol: 'NIFTY50', weight: 1 }];

  const { startDate, endDate } = useMemo(() => getDateRange(period), [period]);

  const { dates, portfolioValues: origValues, benchmarkValues } = useMemo(
    () => getPortfolioPerformance(currentWeights, initialAmount, startDate, endDate),
    [currentWeights, startDate, endDate, initialAmount]
  );

  const { portfolioValues: recValues } = useMemo(
    () => getPortfolioPerformance(recommendedWeights, initialAmount, startDate, endDate),
    [recommendedWeights, startDate, endDate, initialAmount]
  );

  const { portfolioValues: eqValues } = useMemo(
    () => getPortfolioPerformance(equalWeights, initialAmount, startDate, endDate),
    [equalWeights, startDate, endDate, initialAmount]
  );

  const step = Math.max(1, Math.floor(dates.length / 120));
  const chartData = dates
    .filter((_, i) => i % step === 0 || i === dates.length - 1)
    .map((date, idx) => {
      const i = idx * step;
      return {
        date: new Date(date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        original: origValues[Math.min(i, origValues.length - 1)],
        recommended: recValues[Math.min(i, recValues.length - 1)],
        equal: eqValues[Math.min(i, eqValues.length - 1)],
        benchmark: benchmarkValues[Math.min(i, benchmarkValues.length - 1)],
      };
    });

  function computeStats(values) {
    if (!values?.length) return {};
    const rets = dailyReturns(values);
    return {
      totalReturn: ((values[values.length - 1] - values[0]) / values[0]) * 100,
      annRet: annualizedReturn(rets) * 100,
      vol: annualizedVolatility(rets) * 100,
      maxDD: maxDrawdown(values) * 100,
      sharpe: sharpeRatio(rets),
      finalValue: values[values.length - 1],
    };
  }

  const strategies = [
    { key: 'original', label: 'My Portfolio', values: origValues },
    { key: 'recommended', label: 'Recommended', values: recValues },
    { key: 'equal', label: 'Equal Weight', values: eqValues },
    { key: 'benchmark', label: 'NIFTY 50', values: benchmarkValues },
  ];

  const toggleStrategy = (key) => {
    setActiveStrategies((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#172D4A]">Historical Backtesting</h1>
          <p className="text-[13.5px] text-[#6B7890] mt-1">Compare strategy performance on simulated historical data.</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={clsx('px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
                period === p ? 'bg-[#3478CC] text-white' : 'bg-white border border-[#E1E7EF] text-[#6B7890] hover:bg-[#F5F7FB]')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-[12px] text-amber-800">
        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
        <span>Historical simulations use illustrative demo data. Past performance does not guarantee future results. Calculations assume {initialAmount.toLocaleString('en-IN')} initial investment, no transaction costs, and no rebalancing.</span>
      </div>

      {/* Strategy toggles */}
      <div className="flex flex-wrap gap-2">
        {strategies.map((s) => (
          <button key={s.key} onClick={() => toggleStrategy(s.key)}
            className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border text-[12.5px] font-medium transition-all',
              activeStrategies.includes(s.key) ? 'border-transparent text-white' : 'bg-white border-[#E1E7EF] text-[#6B7890]')}
            style={activeStrategies.includes(s.key) ? { background: STRATEGY_COLORS[s.key] } : {}}>
            <span className="w-2 h-2 rounded-full" style={{ background: STRATEGY_COLORS[s.key] }} />
            {s.label}
          </button>
        ))}
      </div>

      {/* Growth chart */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-4">Portfolio Growth — ₹10L initial investment</h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7890' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7890' }} tickLine={false} axisLine={false}
                tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} width={54} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              {strategies.map((s) =>
                activeStrategies.includes(s.key) ? (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
                    stroke={STRATEGY_COLORS[s.key]} strokeWidth={2} dot={false}
                    activeDot={{ r: 4 }}
                    strokeDasharray={s.key === 'benchmark' ? '4 2' : undefined} />
                ) : null
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats comparison table */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-4">Strategy Comparison ({period})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E1E7EF]">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Strategy</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Final Value</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Total Return</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Ann. Return</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Volatility</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Max DD</th>
                <th className="text-right py-2.5 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">Sharpe</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((s) => {
                const stats = computeStats(s.values);
                return (
                  <tr key={s.key} className="border-b border-[#F0F3F7] last:border-0 hover:bg-[#FAFBFD]">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STRATEGY_COLORS[s.key] }} />
                        <span className="font-medium text-[#172D4A]">{s.label}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-[#172D4A] tabular-nums">{formatINR(stats.finalValue)}</td>
                    <td className={clsx('py-3 px-3 text-right font-semibold tabular-nums', stats.totalReturn >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                      {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn?.toFixed(1)}%
                    </td>
                    <td className={clsx('py-3 px-3 text-right tabular-nums', stats.annRet >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                      {stats.annRet >= 0 ? '+' : ''}{stats.annRet?.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-[#172D4A] tabular-nums">{stats.vol?.toFixed(1)}%</td>
                    <td className="py-3 px-3 text-right text-[#D84E4E] tabular-nums">{stats.maxDD?.toFixed(1)}%</td>
                    <td className={clsx('py-3 px-3 text-right font-semibold tabular-nums', stats.sharpe >= 1 ? 'text-[#16845D]' : stats.sharpe >= 0.5 ? 'text-[#D99120]' : 'text-[#D84E4E]')}>
                      {stats.sharpe?.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
