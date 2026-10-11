// PortfolioBuilder.jsx — Interactive portfolio creation workflow
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, Sliders, ChevronDown, BarChart2, RefreshCw } from 'lucide-react';
import { DEMO_ASSETS } from '../data/demoAssets.js';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import Button from '../components/common/Button.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import { formatINR } from '../utils/formatCurrency.js';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_LEVELS = [
  { value: 'conservative', label: 'Conservative', desc: 'Lower risk, stable returns' },
  { value: 'moderate', label: 'Moderate', desc: 'Balanced risk and return' },
  { value: 'aggressive', label: 'Aggressive', desc: 'Higher risk, growth focus' },
];
const HORIZONS = ['< 1 Year', '1–3 Years', '3–5 Years', '5+ Years'];
const BENCHMARKS = ['NIFTY50', 'NASDAQ-100', 'S&P 500'];

const INVESTABLE = DEMO_ASSETS.filter((a) => a.type !== 'Index');

function AllocationSlider({ weight, onChange }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={0.5}
      value={(weight * 100).toFixed(1)}
      onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
      className="w-full h-1.5 bg-[#E1E7EF] rounded-full appearance-none cursor-pointer accent-[#3478CC]"
    />
  );
}

export default function PortfolioBuilder() {
  const navigate = useNavigate();
  const { setPortfolio, setRiskPreference, setInvestmentAmount, setBenchmark, portfolio } = usePortfolio();

  const [search, setSearch] = useState('');
  const [selections, setSelections] = useState(
    portfolio.holdings.slice(0, 5).map((h) => ({
      symbol: h.symbol,
      name: h.name,
      sector: h.sector,
      type: h.type,
      currentPrice: h.currentPrice,
      weight: h.weight,
    }))
  );
  const [totalAmount, setTotalAmount] = useState(1000000);
  const [riskLevel, setRiskLevel] = useState('moderate');
  const [horizon, setHorizon] = useState('3–5 Years');
  const [benchmark, setLocalBenchmark] = useState('NIFTY50');
  const [errors, setErrors] = useState({});

  const searchResults = useMemo(() => {
    if (!search) return [];
    return INVESTABLE.filter(
      (a) =>
        !selections.find((s) => s.symbol === a.symbol) &&
        (a.symbol.toLowerCase().includes(search.toLowerCase()) ||
          a.name.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 6);
  }, [search, selections]);

  const totalWeight = selections.reduce((s, a) => s + a.weight, 0);

  const addAsset = (asset) => {
    const defaultWeight = selections.length > 0 ? 0 : 1;
    setSelections((prev) => [...prev, { ...asset, weight: defaultWeight }]);
    setSearch('');
  };

  const removeAsset = (symbol) => {
    setSelections((prev) => prev.filter((s) => s.symbol !== symbol));
  };

  const updateWeight = (symbol, weight) => {
    setSelections((prev) => prev.map((s) => s.symbol === symbol ? { ...s, weight } : s));
  };

  const normalizeWeights = () => {
    if (selections.length === 0) return;
    const equalWeight = 1 / selections.length;
    setSelections((prev) => prev.map((s) => ({ ...s, weight: equalWeight })));
  };

  const validate = () => {
    const errs = {};
    if (selections.length === 0) errs.assets = 'Add at least one asset.';
    if (Math.abs(totalWeight - 1) > 0.01) errs.weights = 'Weights must sum to 100%.';
    if (totalAmount < 1000) errs.amount = 'Minimum investment is ₹1,000.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAnalyze = () => {
    if (!validate()) return;
    // Build new portfolio from selections
    const newHoldings = selections.map((s) => ({
      id: `b-${s.symbol}`,
      symbol: s.symbol,
      name: s.name,
      sector: s.sector,
      type: s.type,
      currentPrice: s.currentPrice,
      quantity: Math.floor((totalAmount * s.weight) / s.currentPrice),
      avgBuyPrice: s.currentPrice,
      exchange: INVESTABLE.find((a) => a.symbol === s.symbol)?.exchange || 'NSE',
    }));
    setPortfolio({ ...portfolio, holdings: newHoldings, investedAmount: totalAmount });
    setRiskPreference(riskLevel);
    setInvestmentAmount(totalAmount);
    setBenchmark(benchmark);
    navigate('/risk');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-[#172D4A]">Portfolio Builder</h1>
        <p className="text-[13.5px] text-[#6B7890] mt-1">Select assets, set allocations, and analyze your custom portfolio.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Asset search */}
          <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
            <h3 className="text-[14px] font-semibold text-[#172D4A] mb-3">Select Assets</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7890]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by company name or ticker..."
                className="w-full pl-9 pr-3 py-2.5 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]"
              />
            </div>
            {/* Search results */}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  className="mt-1.5 border border-[#E1E7EF] rounded-lg overflow-hidden shadow-md"
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                >
                  {searchResults.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => addAsset(asset)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#F5F7FB] transition-all border-b border-[#F0F3F7] last:border-0"
                    >
                      <div>
                        <span className="font-semibold text-[#172D4A] text-[13px]">{asset.symbol}</span>
                        <span className="ml-2 text-[#6B7890] text-[12.5px]">{asset.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[12.5px] font-medium text-[#172D4A]">{formatINR(asset.currentPrice, true)}</p>
                        <p className="text-[11px] text-[#6B7890]">{asset.sector}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {errors.assets && <p className="text-[12px] text-[#D84E4E] mt-1.5">{errors.assets}</p>}
          </div>

          {/* Allocation controls */}
          <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-[#172D4A]">Asset Allocation</h3>
              <div className="flex items-center gap-2">
                <span className={clsx('text-[13px] font-semibold', Math.abs(totalWeight - 1) < 0.01 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                  {(totalWeight * 100).toFixed(1)}% allocated
                </span>
                <Button size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={normalizeWeights}>
                  Normalize
                </Button>
              </div>
            </div>

            {errors.weights && (
              <p className="text-[12px] text-[#D84E4E] mb-3">{errors.weights}</p>
            )}

            {selections.length === 0 ? (
              <EmptyState
                title="No assets selected"
                description="Search and add assets above to build your portfolio."
              />
            ) : (
              <div className="space-y-3">
                {selections.map((asset) => {
                  const amount = totalAmount * asset.weight;
                  return (
                    <div key={asset.symbol} className="p-3.5 bg-[#F5F7FB] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] flex items-center justify-center text-[10px] font-bold text-[#3478CC]">
                            {asset.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-[#172D4A]">{asset.symbol}</p>
                            <p className="text-[11px] text-[#6B7890]">{asset.sector}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={(asset.weight * 100).toFixed(1)}
                            onChange={(e) => updateWeight(asset.symbol, Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) / 100)}
                            className="w-16 text-center px-2 py-1 border border-[#E1E7EF] rounded-lg text-[12.5px] font-semibold focus:outline-none focus:border-[#3478CC]"
                          />
                          <span className="text-[12px] text-[#6B7890]">%</span>
                          <button onClick={() => removeAsset(asset.symbol)} className="text-[#D84E4E] hover:bg-[#FDF0F0] p-1 rounded-lg transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <AllocationSlider
                        weight={asset.weight}
                        onChange={(w) => updateWeight(asset.symbol, w)}
                      />
                      <p className="text-[11.5px] text-[#6B7890] mt-1.5">
                        ≈ {formatINR(amount)} · {Math.floor(amount / asset.currentPrice)} units @ {formatINR(asset.currentPrice, true)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Settings sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
            <h3 className="text-[14px] font-semibold text-[#172D4A] mb-4">Investment Settings</h3>
            <div className="space-y-4">
              {/* Total amount */}
              <div>
                <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Total Investment Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7890] text-[13px]">₹</span>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-2 border border-[#E1E7EF] rounded-lg text-[13px] focus:outline-none focus:border-[#3478CC]"
                  />
                </div>
                {errors.amount && <p className="text-[11.5px] text-[#D84E4E] mt-1">{errors.amount}</p>}
              </div>

              {/* Risk level */}
              <div>
                <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Risk Preference</label>
                <div className="space-y-1.5">
                  {RISK_LEVELS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRiskLevel(r.value)}
                      className={clsx(
                        'w-full text-left px-3 py-2.5 rounded-lg border transition-all text-[12.5px]',
                        riskLevel === r.value
                          ? 'border-[#3478CC] bg-[#EAF2FF] text-[#3478CC]'
                          : 'border-[#E1E7EF] hover:bg-[#F5F7FB] text-[#172D4A]'
                      )}
                    >
                      <p className="font-medium">{r.label}</p>
                      <p className="text-[11px] opacity-70 mt-0.5">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizon */}
              <div>
                <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Investment Horizon</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {HORIZONS.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorizon(h)}
                      className={clsx(
                        'px-2 py-2 rounded-lg border text-[11.5px] text-center transition-all',
                        horizon === h ? 'border-[#3478CC] bg-[#EAF2FF] text-[#3478CC]' : 'border-[#E1E7EF] text-[#6B7890] hover:bg-[#F5F7FB]'
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Benchmark */}
              <div>
                <label className="block text-[12.5px] font-medium text-[#172D4A] mb-1.5">Benchmark</label>
                <div className="space-y-1">
                  {BENCHMARKS.map((b) => (
                    <button
                      key={b}
                      onClick={() => { setLocalBenchmark(b); setBenchmark(b); }}
                      className={clsx(
                        'w-full text-left px-3 py-2 rounded-lg border text-[12.5px] transition-all',
                        benchmark === b ? 'border-[#3478CC] bg-[#EAF2FF] text-[#3478CC]' : 'border-[#E1E7EF] text-[#6B7890] hover:bg-[#F5F7FB]'
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-[#17365A] rounded-[12px] p-5 text-white">
            <h3 className="text-[13px] font-semibold mb-3 opacity-90">Portfolio Summary</h3>
            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between">
                <span className="opacity-70">Assets</span>
                <span className="font-semibold">{selections.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Total Amount</span>
                <span className="font-semibold">{formatINR(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Allocated</span>
                <span className={clsx('font-semibold', Math.abs(totalWeight - 1) < 0.01 ? 'text-[#4ade80]' : 'text-[#fbbf24]')}>
                  {(totalWeight * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Risk Preference</span>
                <span className="font-semibold capitalize">{riskLevel}</span>
              </div>
            </div>
            <Button
              className="w-full mt-4 justify-center"
              onClick={handleAnalyze}
              icon={<BarChart2 size={15} />}
            >
              Analyze My Portfolio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
