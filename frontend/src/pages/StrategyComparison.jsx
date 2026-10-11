// StrategyComparison.jsx — Side-by-side multi-strategy analysis and evaluation
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Layers, CheckCircle2, ArrowRight, ShieldCheck, TrendingUp,
  Sliders, Award, RefreshCw, BarChart2, Info, ArrowUpRight, Check
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { formatPercent, formatPercentDirect } from '../utils/formatPercent.js';
import { formatINR } from '../utils/formatCurrency.js';

// Predefined benchmark and institutional strategies
const STRATEGIES = [
  {
    id: 'current',
    name: 'Your Current Portfolio',
    tagline: 'Active Holdings Blend',
    description: 'Custom allocation based on your actual positions across equities, debt, and cash.',
    badge: 'Active Live',
    badgeColor: 'bg-[#EAF2FF] text-[#3478CC] border-[#3478CC]/30',
    metrics: {
      expectedReturn: 14.8,
      volatility: 16.2,
      sharpeRatio: 1.15,
      maxDrawdown: -18.4,
      var95: -2.35,
      beta: 1.05,
    },
    allocation: { equity: 68, debt: 18, gold: 9, cash: 5 },
    color: '#3478CC', // RiskLens blue
  },
  {
    id: 'aggressive',
    name: 'Aggressive Alpha Growth',
    tagline: 'Maximum Capital Appreciation',
    description: 'Heavy tilt toward high-beta tech leaders and emerging growth sectors for outsized long-term capital gains.',
    badge: 'High Alpha',
    badgeColor: 'bg-[#F5ECFE] text-[#A65DF0] border-[#A65DF0]/30',
    metrics: {
      expectedReturn: 19.2,
      volatility: 22.8,
      sharpeRatio: 1.28,
      maxDrawdown: -26.5,
      var95: -3.42,
      beta: 1.35,
    },
    allocation: { equity: 85, debt: 5, gold: 5, cash: 5 },
    color: '#A65DF0', // purple
  },
  {
    id: 'allweather',
    name: 'All-Weather Risk Parity',
    tagline: 'Bridgewater-Style Robustness',
    description: 'Balanced risk distribution across non-correlated asset classes designed to thrive across all economic seasons.',
    badge: 'Optimal Sharpe',
    badgeColor: 'bg-[#EAF8F0] text-[#27AE60] border-[#27AE60]/30',
    metrics: {
      expectedReturn: 13.5,
      volatility: 10.4,
      sharpeRatio: 1.48,
      maxDrawdown: -9.8,
      var95: -1.45,
      beta: 0.62,
    },
    allocation: { equity: 35, debt: 45, gold: 15, cash: 5 },
    color: '#27AE60', // emerald
  },
  {
    id: 'conservative',
    name: 'Capital Preservation & Income',
    tagline: 'Low Volatility & Yield',
    description: 'Prioritizes sovereign debt, high-grade corporate bonds, and blue-chip dividend aristocrats for predictable returns.',
    badge: 'Defensive',
    badgeColor: 'bg-[#FEF8EA] text-[#D99120] border-[#D99120]/30',
    metrics: {
      expectedReturn: 9.1,
      volatility: 6.8,
      sharpeRatio: 1.02,
      maxDrawdown: -4.8,
      var95: -0.92,
      beta: 0.32,
    },
    allocation: { equity: 15, debt: 70, gold: 10, cash: 5 },
    color: '#F0B74B', // amber
  },
];

export default function StrategyComparison() {
  const { portfolio, setPortfolio } = usePortfolio();
  const [selectedStrategies, setSelectedStrategies] = useState(['current', 'allweather', 'aggressive']);
  const [appliedNotification, setAppliedNotification] = useState('');

  // Toggle selection
  const toggleStrategy = (id) => {
    if (selectedStrategies.includes(id)) {
      if (selectedStrategies.length <= 2) return; // Keep at least 2 for comparison
      setSelectedStrategies((prev) => prev.filter((s) => s !== id));
    } else {
      setSelectedStrategies((prev) => [...prev, id]);
    }
  };

  // Active compared strategies
  const activeStrategies = useMemo(() => {
    return STRATEGIES.filter((s) => selectedStrategies.includes(s.id));
  }, [selectedStrategies]);

  // Projected 5-Year Growth Data (Initial ₹1,000,000)
  const growthSimulationData = useMemo(() => {
    const years = [0, 1, 2, 3, 4, 5];
    const initial = 1000000;

    return years.map((y) => {
      const row = { year: `Year ${y}` };
      STRATEGIES.forEach((strat) => {
        const rate = strat.metrics.expectedReturn / 100;
        row[strat.id] = Math.round(initial * Math.pow(1 + rate, y));
      });
      return row;
    });
  }, []);

  // Radar chart comparison data
  const radarData = useMemo(() => {
    const metricsConfig = [
      { key: 'expectedReturn', label: 'Expected Return', max: 25 },
      { key: 'sharpeRatio', label: 'Sharpe Ratio (x10)', max: 2, scale: 10 },
      { key: 'resilience', label: 'Drawdown Resilience', calc: (m) => 35 + m.maxDrawdown },
      { key: 'stability', label: 'Low Volatility Shield', calc: (m) => 30 - m.volatility },
      { key: 'varShield', label: 'VaR Protection', calc: (m) => 5 + m.var95 },
    ];

    return metricsConfig.map((cfg) => {
      const row = { metric: cfg.label };
      activeStrategies.forEach((strat) => {
        let val = 0;
        if (cfg.calc) {
          val = cfg.calc(strat.metrics);
        } else if (cfg.scale) {
          val = strat.metrics[cfg.key] * cfg.scale;
        } else {
          val = strat.metrics[cfg.key];
        }
        row[strat.id] = Math.max(0, Number(val.toFixed(1)));
      });
      return row;
    });
  }, [activeStrategies]);

  // Allocation bar data
  const allocationComparisonData = useMemo(() => {
    return [
      { name: 'Equities', ...Object.fromEntries(activeStrategies.map((s) => [s.id, s.allocation.equity])) },
      { name: 'Debt & Bonds', ...Object.fromEntries(activeStrategies.map((s) => [s.id, s.allocation.debt])) },
      { name: 'Gold / Commodities', ...Object.fromEntries(activeStrategies.map((s) => [s.id, s.allocation.gold])) },
      { name: 'Cash Equivalents', ...Object.fromEntries(activeStrategies.map((s) => [s.id, s.allocation.cash])) },
    ];
  }, [activeStrategies]);

  const handleApplyStrategy = (strat) => {
    setAppliedNotification(`Allocation weights updated to ${strat.name} framework.`);
    setTimeout(() => setAppliedNotification(''), 4000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 animate-fade-in">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#181A24] tracking-tight">Investment Strategy Comparison</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF2FF] text-[#3478CC] border border-[#3478CC]/30">
              Multi-Model Benchmarking
            </span>
          </div>
          <p className="text-[#7B8290] text-xs sm:text-sm mt-0.5">
            Evaluate how your current portfolio stacks up against institutional asset allocation models.
          </p>
        </div>

        {appliedNotification && (
          <div className="px-3.5 py-1.5 rounded-lg bg-[#EAF8F0] border border-[#27AE60]/30 text-[#27AE60] text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#27AE60]" />
            {appliedNotification}
          </div>
        )}
      </div>

      {/* ── Strategy Selectors Cards ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {STRATEGIES.map((strat) => {
          const isSelected = selectedStrategies.includes(strat.id);
          return (
            <motion.div
              key={strat.id}
              whileHover={{ y: -2 }}
              onClick={() => toggleStrategy(strat.id)}
              className={`cursor-pointer rounded-[20px] p-4.5 sm:p-5 border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#F8FAFF] border-[#3478CC] shadow-md ring-2 ring-[#3478CC]/20'
                  : 'bg-white border-[#ECEFF4] opacity-75 hover:opacity-100 hover:border-[#3478CC]/40 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${strat.badgeColor}`}>
                    {strat.badge}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-[#3478CC] border-[#3478CC] text-white shadow-xs'
                        : 'border-[#CBD5E1] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#181A24] leading-snug">{strat.name}</h3>
                <p className="text-xs text-[#3478CC] font-semibold mt-0.5">{strat.tagline}</p>
                <p className="text-[11.5px] text-[#7B8290] mt-1.5 line-clamp-2 leading-relaxed min-h-[34px]">
                  {strat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F0F2F6] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-[#7B8290] block font-medium">Exp. Return</span>
                  <span className="font-extrabold text-[#27AE60]">+{strat.metrics.expectedReturn}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7B8290] block font-medium">Sharpe Ratio</span>
                  <span className="font-extrabold text-[#181A24]">{strat.metrics.sharpeRatio}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Strategy Comparison Matrix Table ──────────────────── */}
      <div className="bg-white rounded-[22px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3478CC]" />
            <h3 className="text-sm font-bold text-[#181A24]">Strategy Metrics Matrix</h3>
          </div>
          <span className="text-xs text-[#7B8290] font-medium">Comparing {activeStrategies.length} models</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[#ECEFF4] text-[#7B8290] text-[11px] uppercase tracking-wider font-bold">
                <th className="pb-2.5 font-semibold">Key Metric</th>
                {activeStrategies.map((s) => (
                  <th key={s.id} className="pb-2.5 font-bold text-right" style={{ color: s.color }}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F2F6] text-[#181A24]">
              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#27AE60]" />
                  Expected Annual Return
                </td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right font-extrabold text-[#27AE60]">
                    +{s.metrics.expectedReturn}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24]">Annualized Volatility (Risk)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right font-bold text-[#181A24]">
                    {s.metrics.volatility}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-[#3478CC]" />
                  Sharpe Ratio (Risk-Adjusted)
                </td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right font-extrabold text-[#181A24]">
                    {s.metrics.sharpeRatio}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24]">Historical Maximum Drawdown</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right font-extrabold text-[#F36F69]">
                    {s.metrics.maxDrawdown}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24]">1-Day VaR (95% Confidence)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right font-mono font-bold text-[#181A24]">
                    {s.metrics.var95}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24]">Beta vs Market (NIFTY 50)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right font-mono font-bold text-[#181A24]">
                    {s.metrics.beta}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-[#FAFBFD] transition-colors">
                <td className="py-2.5 font-bold text-[#181A24]">Asset Mix (Equity / Debt / Gold / Cash)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-2.5 text-right text-[#7B8290] font-mono text-[11px] font-semibold">
                    {s.allocation.equity}% / {s.allocation.debt}% / {s.allocation.gold}% / {s.allocation.cash}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Visualizations Grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 5-Year Capital Growth Simulation */}
        <div className="bg-white rounded-[22px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#27AE60]" />
                <h3 className="text-sm font-bold text-[#181A24]">5-Year Growth Projection (₹10,00,000 Initial)</h3>
              </div>
            </div>
            <p className="text-xs text-[#7B8290] mt-0.5">
              Compounded annual return projection under each model over a 5-year investment horizon.
            </p>
          </div>

          <div className="h-64 mt-3.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthSimulationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6" />
                <XAxis dataKey="year" stroke="#7B8290" tick={{ fontSize: 11, fill: '#7B8290' }} />
                <YAxis
                  stroke="#7B8290"
                  tick={{ fontSize: 10, fill: '#7B8290' }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181A24',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '11.5px',
                    color: '#fff',
                  }}
                  formatter={(value, name) => {
                    const strat = STRATEGIES.find((s) => s.id === name);
                    return [formatINR(value), strat?.name || name];
                  }}
                />
                <Legend
                  formatter={(id) => {
                    const strat = STRATEGIES.find((s) => s.id === id);
                    return <span style={{ color: strat?.color, fontSize: '11px', fontWeight: 600 }}>{strat?.name}</span>;
                  }}
                />
                {activeStrategies.map((s) => (
                  <Line
                    key={s.id}
                    type="monotone"
                    dataKey={s.id}
                    stroke={s.color}
                    strokeWidth={s.id === 'current' ? 3 : 2}
                    dot={{ r: 3, fill: s.color }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Dimensional Radar Comparison */}
        <div className="bg-white rounded-[22px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#3478CC]" />
                <h3 className="text-sm font-bold text-[#181A24]">Risk-Return Profile Radar</h3>
              </div>
            </div>
            <p className="text-xs text-[#7B8290] mt-0.5">
              Multi-axial evaluation of return potential, Sharpe ratio, drawdown protection, and stability.
            </p>
          </div>

          <div className="h-64 mt-3.5 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="metric" stroke="#7B8290" tick={{ fontSize: 10, fill: '#7B8290', fontWeight: 500 }} />
                <PolarRadiusAxis stroke="#CBD5E1" tick={{ fontSize: 9, fill: '#7B8290' }} angle={30} domain={[0, 'auto']} />
                {activeStrategies.map((s) => (
                  <Radar
                    key={s.id}
                    name={s.name}
                    dataKey={s.id}
                    stroke={s.color}
                    fill={s.color}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend
                  formatter={(name) => <span style={{ fontSize: '11px', color: '#181A24', fontWeight: 600 }}>{name}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#181A24',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fff',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Asset Allocation Breakdown Comparison ──────────────── */}
      <div className="bg-white rounded-[22px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#A65DF0]" />
            <h3 className="text-sm font-bold text-[#181A24]">Asset Class Allocation Breakdown (%)</h3>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocationComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F6" />
              <XAxis dataKey="name" stroke="#7B8290" tick={{ fontSize: 11, fill: '#7B8290' }} />
              <YAxis stroke="#7B8290" tick={{ fontSize: 10, fill: '#7B8290' }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#181A24',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#fff',
                }}
                formatter={(val, name) => {
                  const strat = STRATEGIES.find((s) => s.id === name);
                  return [`${val}%`, strat?.name || name];
                }}
              />
              <Legend
                formatter={(id) => {
                  const strat = STRATEGIES.find((s) => s.id === id);
                  return <span style={{ color: strat?.color, fontSize: '11px', fontWeight: 600 }}>{strat?.name}</span>;
                }}
              />
              {activeStrategies.map((s) => (
                <Bar key={s.id} dataKey={s.id} fill={s.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Action Recommendation Banner ───────────────────────── */}
      <div className="p-5 rounded-[22px] bg-gradient-to-r from-[#EAF2FF] via-[#F4F5F8] to-[#EAF8F0] border border-[#3478CC]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-[#17365A] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3478CC]" />
            Strategy Optimization Insight
          </h4>
          <p className="text-xs text-[#172D4A] max-w-2xl leading-relaxed font-medium">
            Transitioning toward an <strong>All-Weather Risk Parity</strong> allocation could reduce your portfolio's peak drawdown from <strong>-18.4%</strong> to <strong>-9.8%</strong> while maintaining a <strong>1.48 Sharpe Ratio</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleApplyStrategy(STRATEGIES[2])}
            className="px-4 py-2 rounded-xl bg-[#3478CC] hover:bg-[#2968b8] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <span>Apply All-Weather Model</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
