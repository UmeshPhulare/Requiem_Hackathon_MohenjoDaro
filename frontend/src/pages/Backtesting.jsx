// Backtesting.jsx — Live Historical Strategy Backtesting Workspace
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { backtestApi } from '../services/api.js';
import { formatINR, formatCompact } from '../utils/formatCurrency.js';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShieldCheck, RefreshCw, AlertTriangle,
  Sliders, Calendar, DollarSign, Layers, Activity
} from 'lucide-react';

const STRATEGY_CONFIG = {
  original: {
    label: 'My Portfolio',
    color: '#3478CC',
    dash: undefined,
  },
  recommended: {
    label: 'Recommended (CVaR)',
    color: '#16845D',
    dash: undefined,
  },
  equal: {
    label: 'Equal Weight',
    color: '#D99120',
    dash: undefined,
  },
  benchmark: {
    label: 'NIFTY 50 (^NSEI)',
    color: '#7C5ABF',
    dash: '4 2',
  },
};

const PERIOD_OPTIONS = [
  { id: '1Y', label: '1 Year', days: 365 },
  { id: '3Y', label: '3 Years', days: 365 * 3 },
  { id: 'ALL', label: '5 Years', days: 365 * 5 },
];

const REBALANCE_OPTIONS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'annual', label: 'Annual' },
  { id: 'buy_and_hold', label: 'Buy & Hold' },
];

// Fallback holdings if user has zero holdings in portfolio
const DEFAULT_NSE_HOLDINGS = [
  { symbol: 'RELIANCE.NS', weight: 0.35, name: 'Reliance Industries' },
  { symbol: 'TCS.NS', weight: 0.25, name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK.NS', weight: 0.25, name: 'HDFC Bank' },
  { symbol: 'INFY.NS', weight: 0.15, name: 'Infosys' },
];

function normalizeSymbol(sym) {
  if (!sym) return '';
  const clean = sym.trim().toUpperCase();
  if (clean.includes('.') || clean.startsWith('^')) {
    return clean;
  }
  // Standard Indian NSE ticker convention
  return `${clean}.NS`;
}

export default function Backtesting() {
  const { portfolio } = usePortfolio();

  const [period, setPeriod] = useState('1Y');
  const [initialAmount, setInitialAmount] = useState(() => (
    portfolio.investedAmount && portfolio.investedAmount > 0
      ? portfolio.investedAmount
      : 1000000
  ));
  const [rebalanceFreq, setRebalanceFreq] = useState('monthly');
  const [txCostPct, setTxCostPct] = useState(0.001); // 0.1% default
  const [chartMode, setChartMode] = useState('growth'); // 'growth' | 'drawdown'
  const [activeStrategies, setActiveStrategies] = useState(['original', 'recommended', 'equal', 'benchmark']);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backtestData, setBacktestData] = useState(null);

  // Determine active holdings
  const activeHoldings = useMemo(() => {
    if (portfolio.holdings && portfolio.holdings.length > 0) {
      const totalCost = portfolio.holdings.reduce(
        (sum, h) => sum + (h.currentValue || h.costBasis || (h.shares * h.avgPrice) || 1),
        0
      );
      return portfolio.holdings.map((h) => {
        const val = h.currentValue || h.costBasis || (h.shares * h.avgPrice) || 1;
        return {
          symbol: normalizeSymbol(h.symbol),
          weight: totalCost > 0 ? val / totalCost : 1 / portfolio.holdings.length,
          name: h.name || h.symbol,
        };
      });
    }
    return DEFAULT_NSE_HOLDINGS;
  }, [portfolio.holdings]);

  const isUsingDefaultPortfolio = !portfolio.holdings || portfolio.holdings.length === 0;

  // Execute Backtest on Backend
  const executeBacktest = useCallback(async () => {
    setLoading(true);
    setError(null);

    const symbols = activeHoldings.map((h) => h.symbol);
    const weightsMap = {};
    activeHoldings.forEach((h) => {
      weightsMap[h.symbol] = h.weight;
    });

    // Date computation
    const now = new Date();
    const periodConf = PERIOD_OPTIONS.find((p) => p.id === period) || PERIOD_OPTIONS[0];
    const past = new Date(now.getTime() - periodConf.days * 24 * 60 * 60 * 1000);
    const startDateStr = past.toISOString().split('T')[0];
    const endDateStr = now.toISOString().split('T')[0];

    const payload = {
      symbols,
      weights: weightsMap,
      benchmark: '^NSEI',
      initial_capital: parseFloat(initialAmount) || 1000000,
      start_date: startDateStr,
      end_date: endDateStr,
      rebalance_freq: rebalanceFreq,
      tx_cost_pct: parseFloat(txCostPct),
      risk_free_rate: 0.065,
    };

    try {
      const data = await backtestApi.run(payload);
      setBacktestData(data);
    } catch (err) {
      console.error('Failed to run live backtest:', err);
      setError(err.message || 'Unable to retrieve live market backtest. Please retry.');
    } finally {
      setLoading(false);
    }
  }, [activeHoldings, period, initialAmount, rebalanceFreq, txCostPct]);

  useEffect(() => {
    executeBacktest();
  }, [executeBacktest]);

  // Downsample or prepare chart series
  const chartData = useMemo(() => {
    if (!backtestData?.series?.length) return [];
    return backtestData.series.map((pt) => ({
      date: new Date(pt.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      original: pt.portfolio_value,
      recommended: pt.recommended_value || pt.portfolio_value,
      equal: pt.equal_value || pt.portfolio_value,
      benchmark: pt.benchmark_value,
      original_dd: pt.drawdown ? parseFloat((pt.drawdown * 100).toFixed(2)) : 0,
      recommended_dd: pt.recommended_drawdown ? parseFloat((pt.recommended_drawdown * 100).toFixed(2)) : 0,
      equal_dd: pt.equal_drawdown ? parseFloat((pt.equal_drawdown * 100).toFixed(2)) : 0,
      benchmark_dd: pt.benchmark_drawdown ? parseFloat((pt.benchmark_drawdown * 100).toFixed(2)) : 0,
    }));
  }, [backtestData]);

  const toggleStrategy = (key) => {
    setActiveStrategies((prev) =>
      prev.includes(key)
        ? (prev.length > 1 ? prev.filter((k) => k !== key) : prev) // keep at least 1 active
        : [...prev, key]
    );
  };

  const strategiesList = useMemo(() => {
    if (!backtestData?.strategies) return [];
    return [
      { key: 'original', ...STRATEGY_CONFIG.original, ...backtestData.strategies.original },
      { key: 'recommended', ...STRATEGY_CONFIG.recommended, ...backtestData.strategies.recommended },
      { key: 'equal', ...STRATEGY_CONFIG.equal, ...backtestData.strategies.equal },
      { key: 'benchmark', ...STRATEGY_CONFIG.benchmark, ...backtestData.strategies.benchmark },
    ];
  }, [backtestData]);

  return (
    <div className="space-y-6 animate-fade-in pb-12 select-none">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[#172D4A] tracking-tight">Historical Backtesting</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F0] text-[#16845D] border border-[#16845D]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16845D] animate-ping" />
              Live Market Engine
            </span>
          </div>
          <p className="text-sm text-[#6B7890]">
            Evaluate multi-period strategy trajectory against live Yahoo Finance prices and the NIFTY 50 benchmark.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1.5 bg-[#F4F6FA] p-1 rounded-xl border border-[#E1E7EF]">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                period === p.id
                  ? 'bg-white text-[#172D4A] shadow-xs'
                  : 'text-[#6B7890] hover:text-[#172D4A]'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Context / Provenance Notification ───────────────────────── */}
      <div className="bg-[#F0F7FF] border border-[#CDE1F8] rounded-xl px-4 py-3 flex items-start justify-between gap-3 text-xs text-[#20497B]">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#3478CC] flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Live Data Simulation:</span> Calculations are executed dynamically using real historical adjusted prices from Yahoo Finance and the NIFTY 50 (^NSEI) index. Simulation incorporates periodic rebalancing and transaction cost slippage.
            {isUsingDefaultPortfolio && (
              <span className="block mt-1 font-medium text-[#49709C]">
                Note: Using standard Indian large-cap basket (Reliance, TCS, HDFC Bank, Infosys). Add holdings in Portfolio Builder to backtest custom assets.
              </span>
            )}
          </div>
        </div>
        <button
          onClick={executeBacktest}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#CDE1F8] text-[#3478CC] hover:bg-[#F4F9FF] font-semibold text-[11px] cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Backtest Controls & Simulation Parameters ───────────────── */}
      <div className="bg-white border border-[#E1E7EF] rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-[#6B7890] mb-1.5 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#3478CC]" />
            Initial Investment
          </label>
          <div className="relative">
            <span className="absolute left-3 inset-y-0 flex items-center text-xs font-bold text-[#6B7890]">₹</span>
            <input
              type="number"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Math.max(10000, Number(e.target.value)))}
              className="w-full pl-7 pr-3 py-2 bg-[#F8FAFC] border border-[#E1E7EF] rounded-xl text-xs font-bold text-[#172D4A] focus:outline-none focus:border-[#3478CC]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#6B7890] mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#3478CC]" />
            Rebalancing Frequency
          </label>
          <select
            value={rebalanceFreq}
            onChange={(e) => setRebalanceFreq(e.target.value)}
            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E1E7EF] rounded-xl text-xs font-bold text-[#172D4A] focus:outline-none focus:border-[#3478CC] cursor-pointer"
          >
            {REBALANCE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#6B7890] mb-1.5 flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5 text-[#3478CC]" />
            Transaction Drag / Fee (Per Turnover)
          </label>
          <select
            value={txCostPct}
            onChange={(e) => setTxCostPct(Number(e.target.value))}
            className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E1E7EF] rounded-xl text-xs font-bold text-[#172D4A] focus:outline-none focus:border-[#3478CC] cursor-pointer"
          >
            <option value={0.0}>0.0% (Zero Friction)</option>
            <option value={0.0005}>0.05% (Institutional Bulk)</option>
            <option value={0.001}>0.10% (Standard Retail Brokerage)</option>
            <option value={0.0025}>0.25% (High Turnover Slippage)</option>
          </select>
        </div>
      </div>

      {/* ── Strategy Toggles & View Mode ───────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {Object.entries(STRATEGY_CONFIG).map(([key, config]) => {
            const isActive = activeStrategies.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleStrategy(key)}
                className={clsx(
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                  isActive
                    ? 'border-transparent text-white shadow-xs'
                    : 'bg-white border-[#E1E7EF] text-[#6B7890] hover:bg-[#F8FAFC]'
                )}
                style={isActive ? { backgroundColor: config.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isActive ? '#FFFFFF' : config.color }}
                />
                {config.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 bg-[#F4F6FA] p-1 rounded-xl border border-[#E1E7EF]">
          <button
            onClick={() => setChartMode('growth')}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
              chartMode === 'growth' ? 'bg-white text-[#172D4A] shadow-xs' : 'text-[#6B7890]'
            )}
          >
            Portfolio Growth (₹)
          </button>
          <button
            onClick={() => setChartMode('drawdown')}
            className={clsx(
              'px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
              chartMode === 'drawdown' ? 'bg-white text-[#172D4A] shadow-xs' : 'text-[#6B7890]'
            )}
          >
            Rolling Drawdown (%)
          </button>
        </div>
      </div>

      {/* ── Main Performance Chart ─────────────────────────────────── */}
      <div className="bg-white border border-[#E1E7EF] rounded-2xl p-5 shadow-xs relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#172D4A]">
              {chartMode === 'growth'
                ? `Cumulative Growth Trajectory — ₹${(initialAmount / 100000).toFixed(1)}L Capital Base`
                : 'Historical Peak-to-Trough Drawdown (%)'}
            </h3>
            <p className="text-xs text-[#6B7890] mt-0.5">
              {backtestData ? `${backtestData.trading_days} trading days evaluated (${backtestData.start_date} → ${backtestData.end_date})` : 'Computing historical simulation...'}
            </p>
          </div>
          {backtestData?.strategies?.original?.metrics && (
            <div className="text-right">
              <span className="text-xs font-bold text-[#6B7890] block">Terminal Value</span>
              <span className="text-base font-extrabold text-[#172D4A] tabular-nums">
                {formatINR(backtestData.strategies.original.metrics.final_value)}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-[320px] flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#6B7890]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#3478CC]" />
            <span>Fetching live asset histories & running CVaR backtest...</span>
          </div>
        ) : error ? (
          <div className="h-[320px] flex flex-col items-center justify-center gap-2 text-xs font-semibold text-[#D84E4E]">
            <AlertTriangle className="w-6 h-6 text-[#D84E4E]" />
            <span>{error}</span>
            <button
              onClick={executeBacktest}
              className="mt-2 px-3 py-1.5 rounded-lg bg-[#3478CC] text-white text-xs font-bold cursor-pointer"
            >
              Retry Backtest
            </button>
          </div>
        ) : (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'growth' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7890' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7890' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatCompact(v)}
                    width={60}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white border border-[#E1E7EF] rounded-xl p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#172D4A] mb-1">{label}</p>
                          {payload.map((p) => (
                            <div key={p.dataKey} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="text-[#6B7890]">{p.name}</span>
                              </span>
                              <span className="font-bold text-[#172D4A] tabular-nums">{formatINR(p.value)}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {activeStrategies.map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={STRATEGY_CONFIG[key].label}
                      stroke={STRATEGY_CONFIG[key].color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      strokeDasharray={STRATEGY_CONFIG[key].dash}
                    />
                  ))}
                </LineChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6B7890' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7890' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                    width={45}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white border border-[#E1E7EF] rounded-xl p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-[#172D4A] mb-1">{label}</p>
                          {payload.map((p) => (
                            <div key={p.dataKey} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="text-[#6B7890]">{p.name}</span>
                              </span>
                              <span className="font-bold text-[#D84E4E] tabular-nums">{p.value}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {activeStrategies.map((key) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={`${key}_dd`}
                      name={STRATEGY_CONFIG[key].label}
                      stroke={STRATEGY_CONFIG[key].color}
                      fill={STRATEGY_CONFIG[key].color}
                      fillOpacity={0.12}
                      strokeWidth={1.5}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Institutional Strategy Comparison Table ─────────────────── */}
      <div className="bg-white border border-[#E1E7EF] rounded-2xl p-5 shadow-xs overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#172D4A]">
              Live Strategy Evaluation Matrix ({period})
            </h3>
            <p className="text-xs text-[#6B7890] mt-0.5">
              Simulated under {rebalanceFreq} rebalancing with {(txCostPct * 100).toFixed(2)}% transaction drag penalty.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E1E7EF] bg-[#F8FAFC]">
                <th className="text-left py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Strategy</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Final Value</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Total Return</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">CAGR</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Volatility</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Max DD</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Sharpe</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">CVaR (95%)</th>
                <th className="text-right py-3 px-3.5 font-bold text-[#6B7890] uppercase tracking-wider">Total Drag (Fees)</th>
              </tr>
            </thead>
            <tbody>
              {strategiesList.map((s) => {
                const m = s.metrics || {};
                const isPositive = (m.total_return_pct || 0) >= 0;
                return (
                  <tr key={s.key} className="border-b border-[#F0F3F7] last:border-0 hover:bg-[#FAFBFD] transition-colors">
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                        <div>
                          <span className="font-bold text-[#172D4A] block">{s.label}</span>
                          <span className="text-[10px] text-[#7B8290] hidden sm:block">{s.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-extrabold text-[#172D4A] tabular-nums">
                      {m.final_value ? formatINR(m.final_value) : '—'}
                    </td>
                    <td className={clsx('py-3.5 px-3.5 text-right font-bold tabular-nums', isPositive ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                      {m.total_return_pct !== undefined ? `${m.total_return_pct >= 0 ? '+' : ''}${m.total_return_pct.toFixed(2)}%` : '—'}
                    </td>
                    <td className={clsx('py-3.5 px-3.5 text-right font-semibold tabular-nums', (m.cagr || 0) >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                      {m.cagr !== undefined ? `${(m.cagr * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-[#172D4A] font-medium tabular-nums">
                      {m.annualized_volatility !== undefined ? `${(m.annualized_volatility * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-[#D84E4E] font-bold tabular-nums">
                      {m.max_drawdown !== undefined ? `${(m.max_drawdown * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-3.5 text-right font-bold tabular-nums">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-md text-[11px]',
                        (m.sharpe_ratio || 0) >= 1 ? 'bg-[#EAF8F0] text-[#16845D]' :
                        (m.sharpe_ratio || 0) >= 0.5 ? 'bg-[#FFF9EA] text-[#D99120]' :
                        'bg-[#FDF0F0] text-[#D84E4E]'
                      )}>
                        {m.sharpe_ratio !== undefined ? m.sharpe_ratio.toFixed(2) : '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-[#D84E4E] font-medium tabular-nums">
                      {m.cvar_95 !== undefined ? `${(m.cvar_95 * 100).toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-3.5 text-right text-[#6B7890] font-medium tabular-nums">
                      {m.total_tx_costs !== undefined ? formatINR(m.total_tx_costs) : '₹0'}
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
