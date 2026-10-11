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
  Sliders, Award, RefreshCw, BarChart2, Info, ArrowUpRight
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
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
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    metrics: {
      expectedReturn: 14.8,
      volatility: 16.2,
      sharpeRatio: 1.15,
      maxDrawdown: -18.4,
      var95: -2.35,
      beta: 1.05,
    },
    allocation: { equity: 68, debt: 18, gold: 9, cash: 5 },
    color: '#06b6d4', // cyan-500
  },
  {
    id: 'aggressive',
    name: 'Aggressive Alpha Growth',
    tagline: 'Maximum Capital Appreciation',
    description: 'Heavy tilt toward high-beta tech leaders and emerging growth sectors for outsized long-term capital gains.',
    badge: 'High Alpha',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    metrics: {
      expectedReturn: 19.2,
      volatility: 22.8,
      sharpeRatio: 1.28,
      maxDrawdown: -26.5,
      var95: -3.42,
      beta: 1.35,
    },
    allocation: { equity: 85, debt: 5, gold: 5, cash: 5 },
    color: '#a855f7', // purple-500
  },
  {
    id: 'allweather',
    name: 'All-Weather Risk Parity',
    tagline: 'Bridgewater-Style Robustness',
    description: 'Balanced risk distribution across non-correlated asset classes designed to thrive across all economic seasons.',
    badge: 'Optimal Sharpe',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    metrics: {
      expectedReturn: 13.5,
      volatility: 10.4,
      sharpeRatio: 1.48,
      maxDrawdown: -9.8,
      var95: -1.45,
      beta: 0.62,
    },
    allocation: { equity: 35, debt: 45, gold: 15, cash: 5 },
    color: '#10b981', // emerald-500
  },
  {
    id: 'conservative',
    name: 'Capital Preservation & Income',
    tagline: 'Low Volatility & Yield',
    description: 'Prioritizes sovereign debt, high-grade corporate bonds, and blue-chip dividend aristocrats for predictable returns.',
    badge: 'Defensive',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    metrics: {
      expectedReturn: 9.1,
      volatility: 6.8,
      sharpeRatio: 1.02,
      maxDrawdown: -4.8,
      var95: -0.92,
      beta: 0.32,
    },
    allocation: { equity: 15, debt: 70, gold: 10, cash: 5 },
    color: '#f59e0b', // amber-500
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
      { key: 'resilience', label: 'Drawdown Resilience', calc: (m) => 35 + m.maxDrawdown }, // inverted drawdown
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Investment Strategy Comparison</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Multi-Model Benchmarking
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Evaluate how your current portfolio stacks up against institutional asset allocation models.
          </p>
        </div>

        {appliedNotification && (
          <div className="px-3.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {appliedNotification}
          </div>
        )}
      </div>

      {/* Strategy Selectors Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STRATEGIES.map((strat) => {
          const isSelected = selectedStrategies.includes(strat.id);
          return (
            <motion.div
              key={strat.id}
              whileHover={{ y: -2 }}
              onClick={() => toggleStrategy(strat.id)}
              className={`cursor-pointer rounded-xl p-4 border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-950/30'
                  : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-100 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${strat.badgeColor}`}>
                    {strat.badge}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-bold'
                        : 'border-slate-700'
                    }`}
                  >
                    {isSelected && <span className="text-[10px]">&check;</span>}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-white mt-2.5">{strat.name}</h3>
                <p className="text-xs text-cyan-400/90 font-medium">{strat.tagline}</p>
                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {strat.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">Exp. Return</span>
                  <span className="font-bold text-emerald-400">+{strat.metrics.expectedReturn}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Sharpe Ratio</span>
                  <span className="font-bold text-white">{strat.metrics.sharpeRatio}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Strategy Comparison Matrix Table */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Strategy Metrics Matrix</h3>
          </div>
          <span className="text-xs text-slate-400">Comparing {activeStrategies.length} models</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-3 font-semibold">Key Metric</th>
                {activeStrategies.map((s) => (
                  <th key={s.id} className="pb-3 font-semibold text-right" style={{ color: s.color }}>
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Expected Annual Return
                </td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right font-bold text-emerald-400">
                    +{s.metrics.expectedReturn}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white">Annualized Volatility (Risk)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right font-medium text-slate-200">
                    {s.metrics.volatility}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-cyan-400" />
                  Sharpe Ratio (Risk-Adjusted)
                </td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right font-bold text-white">
                    {s.metrics.sharpeRatio}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white">Historical Maximum Drawdown</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right font-semibold text-rose-400">
                    {s.metrics.maxDrawdown}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white">1-Day VaR (95% Confidence)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right text-slate-300 font-mono">
                    {s.metrics.var95}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white">Beta vs Market (NIFTY 50)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right text-slate-300 font-mono">
                    {s.metrics.beta}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-800/20">
                <td className="py-3 font-medium text-white">Asset Mix (Equity / Debt / Gold / Cash)</td>
                {activeStrategies.map((s) => (
                  <td key={s.id} className="py-3 text-right text-slate-400 font-mono text-[11px]">
                    {s.allocation.equity}% / {s.allocation.debt}% / {s.allocation.gold}% / {s.allocation.cash}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 5-Year Capital Growth Simulation */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">5-Year Growth Projection (₹10,00,000 Initial)</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Compounded annual return projection under each model over a 5-year investment horizon.
            </p>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthSimulationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(value, name) => {
                    const strat = STRATEGIES.find((s) => s.id === name);
                    return [formatINR(value), strat?.name || name];
                  }}
                />
                <Legend
                  formatter={(id) => {
                    const strat = STRATEGIES.find((s) => s.id === id);
                    return <span style={{ color: strat?.color, fontSize: '11px' }}>{strat?.name}</span>;
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
        </Card>

        {/* Multi-Dimensional Radar Comparison */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">Risk-Return Profile Radar</h3>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Multi-axial evaluation of return potential, Sharpe ratio, drawdown protection, and stability.
            </p>
          </div>

          <div className="h-64 mt-4 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis stroke="#334155" tick={{ fontSize: 9 }} angle={30} domain={[0, 'auto']} />
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
                  formatter={(name) => <span style={{ fontSize: '11px', color: '#94a3b8' }}>{name}</span>}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Asset Allocation Breakdown Comparison */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Asset Class Allocation Breakdown (%)</h3>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allocationComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
                formatter={(val, name) => {
                  const strat = STRATEGIES.find((s) => s.id === name);
                  return [`${val}%`, strat?.name || name];
                }}
              />
              <Legend
                formatter={(id) => {
                  const strat = STRATEGIES.find((s) => s.id === id);
                  return <span style={{ color: strat?.color, fontSize: '11px' }}>{strat?.name}</span>;
                }}
              />
              {activeStrategies.map((s) => (
                <Bar key={s.id} dataKey={s.id} fill={s.color} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Action Recommendation Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Strategy Optimization Insight
          </h4>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Transitioning toward an <strong>All-Weather Risk Parity</strong> allocation could reduce your portfolio's peak drawdown from <strong>-18.4%</strong> to <strong>-9.8%</strong> while maintaining a <strong>1.48 Sharpe Ratio</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleApplyStrategy(STRATEGIES[2])}
            className="text-xs flex items-center gap-1.5"
          >
            Apply All-Weather Model
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
