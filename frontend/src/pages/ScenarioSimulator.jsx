// ScenarioSimulator.jsx — Market stress-testing interface
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { formatINR, formatINRSigned } from '../utils/formatCurrency.js';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { Zap, AlertTriangle, TrendingDown } from 'lucide-react';

const SECTOR_SHOCKS = {
  'Information Technology': 'techShock',
  'Banking & Finance': 'bankShock',
  'Energy & Petrochemicals': 'marketShock',
  'Automotive': 'marketShock',
  'Pharmaceuticals': 'marketShock',
  'Consumer Goods': 'marketShock',
  'Commodities': 'goldShock',
};

const PRESET_SCENARIOS = [
  {
    id: 'mild_correction',
    name: 'Mild Market Correction (−10%)',
    description: 'A typical market pullback affecting all equities broadly.',
    params: { marketShock: -0.10, techShock: -0.12, bankShock: -0.09, goldShock: 0.05, volMultiplier: 1.2 },
  },
  {
    id: 'bear_market',
    name: 'Bear Market (−20%)',
    description: 'Sustained broad market decline, typical of recession-driven sell-offs.',
    params: { marketShock: -0.20, techShock: -0.25, bankShock: -0.18, goldShock: 0.08, volMultiplier: 1.5 },
  },
  {
    id: 'market_recovery',
    name: 'Market Recovery (+15%)',
    description: 'Post-correction recovery as risk appetite returns to markets.',
    params: { marketShock: 0.15, techShock: 0.18, bankShock: 0.14, goldShock: -0.03, volMultiplier: 0.9 },
  },
  {
    id: 'tech_crash',
    name: 'Technology Sector Crash (−35%)',
    description: 'Sector-specific collapse of technology valuations (dot-com style).',
    params: { marketShock: -0.08, techShock: -0.35, bankShock: -0.05, goldShock: 0.12, volMultiplier: 2.0 },
  },
  {
    id: 'banking_crisis',
    name: 'Banking Sector Stress (−25%)',
    description: 'Financial sector turmoil affecting banks and NBFCs.',
    params: { marketShock: -0.12, techShock: -0.08, bankShock: -0.25, goldShock: 0.10, volMultiplier: 1.8 },
  },
  {
    id: 'high_volatility',
    name: 'High Volatility Regime',
    description: 'Elevated market uncertainty with broad swings but no directional move.',
    params: { marketShock: -0.05, techShock: -0.05, bankShock: -0.05, goldShock: 0.02, volMultiplier: 2.5 },
  },
  {
    id: 'custom',
    name: 'Custom Scenario',
    description: 'Configure your own shock assumptions.',
    params: { marketShock: 0, techShock: 0, bankShock: 0, goldShock: 0, volMultiplier: 1 },
  },
];

const SECTOR_DISPLAY = {
  'Information Technology': 'IT / Tech',
  'Banking & Finance': 'Banking',
  'Energy & Petrochemicals': 'Energy',
  'Automotive': 'Auto',
  'Pharmaceuticals': 'Pharma',
  'Consumer Goods': 'Consumer',
  'Commodities': 'Commodities',
};

function SliderInput({ label, value, min, max, step, onChange, formatValue }) {
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-[#6B7890]">{label}</span>
        <span className={clsx('font-semibold', value >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
          {formatValue ? formatValue(value) : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(0)}%`}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-[#E1E7EF] rounded-full appearance-none cursor-pointer accent-[#3478CC]" />
      <div className="flex justify-between text-[10px] text-[#6B7890] mt-0.5">
        <span>{formatValue ? formatValue(min) : `${(min * 100).toFixed(0)}%`}</span>
        <span>0</span>
        <span>{formatValue ? formatValue(max) : `+${(max * 100).toFixed(0)}%`}</span>
      </div>
    </div>
  );
}

export default function ScenarioSimulator() {
  const { portfolio } = usePortfolio();
  const [selectedScenario, setSelectedScenario] = useState('mild_correction');
  const [customParams, setCustomParams] = useState({ marketShock: -0.10, techShock: -0.12, bankShock: -0.09, goldShock: 0.05, volMultiplier: 1.2 });

  const scenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenario);
  const params = selectedScenario === 'custom' ? customParams : scenario?.params || {};

  const results = useMemo(() => {
    const totalValue = portfolio.totalMarketValue || 0;
    const assetImpacts = portfolio.holdings.map((h) => {
      const sectorParam = SECTOR_SHOCKS[h.sector] || 'marketShock';
      const shock = params[sectorParam] || params.marketShock || 0;
      const impact = h.marketValue * shock;
      return {
        symbol: h.symbol,
        name: h.name,
        sector: h.sector,
        currentValue: h.marketValue,
        shock,
        impact,
        newValue: h.marketValue + impact,
      };
    });
    const totalImpact = assetImpacts.reduce((s, a) => s + a.impact, 0);
    const newValue = totalValue + totalImpact;
    return { assetImpacts, totalImpact, newValue, totalValue, impactPct: totalValue > 0 ? totalImpact / totalValue : 0 };
  }, [portfolio.holdings, params]);

  const chartData = results.assetImpacts
    .sort((a, b) => a.impact - b.impact)
    .map((a) => ({ symbol: a.symbol, impact: a.impact, shock: a.shock * 100 }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold text-[#172D4A]">Scenario Simulator</h1>
        <p className="text-[13.5px] text-[#6B7890] mt-1">
          Stress-test your portfolio against market scenarios.
          <span className="ml-2 text-[11.5px] text-[#D99120]">Hypothetical sensitivity analysis — not a market forecast.</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Scenario selector + controls */}
        <div className="space-y-4">
          <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-4 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
            <h3 className="text-[13px] font-semibold text-[#172D4A] mb-3">Select Scenario</h3>
            <div className="space-y-1.5">
              {PRESET_SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => setSelectedScenario(s.id)}
                  className={clsx('w-full text-left px-3 py-2.5 rounded-lg border transition-all',
                    selectedScenario === s.id
                      ? 'border-[#3478CC] bg-[#EAF2FF]'
                      : 'border-transparent hover:bg-[#F5F7FB]')}>
                  <p className={clsx('text-[12.5px] font-medium', selectedScenario === s.id ? 'text-[#3478CC]' : 'text-[#172D4A]')}>{s.name}</p>
                  <p className="text-[11px] text-[#6B7890] mt-0.5 leading-relaxed">{s.description}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedScenario === 'custom' && (
            <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-4 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
              <h3 className="text-[13px] font-semibold text-[#172D4A] mb-4">Custom Parameters</h3>
              <div className="space-y-5">
                <SliderInput label="Broad Market Shock" value={customParams.marketShock}
                  min={-0.5} max={0.3} step={0.01}
                  onChange={(v) => setCustomParams((p) => ({ ...p, marketShock: v }))} />
                <SliderInput label="Technology Sector" value={customParams.techShock}
                  min={-0.5} max={0.3} step={0.01}
                  onChange={(v) => setCustomParams((p) => ({ ...p, techShock: v }))} />
                <SliderInput label="Banking Sector" value={customParams.bankShock}
                  min={-0.5} max={0.3} step={0.01}
                  onChange={(v) => setCustomParams((p) => ({ ...p, bankShock: v }))} />
                <SliderInput label="Gold / Commodities" value={customParams.goldShock}
                  min={-0.3} max={0.4} step={0.01}
                  onChange={(v) => setCustomParams((p) => ({ ...p, goldShock: v }))} />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Current Value', value: formatINR(results.totalValue), color: '' },
              { label: 'Scenario Value', value: formatINR(results.newValue), color: results.totalImpact >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]' },
              { label: 'Estimated Impact', value: formatINRSigned(results.totalImpact), color: results.totalImpact >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]' },
            ].map((item, i) => (
              <motion.div key={item.label} className="bg-white border border-[#E1E7EF] rounded-[12px] p-4 shadow-[0_1px_3px_rgba(23,45,74,0.06)]"
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
                <p className="text-[11px] font-medium text-[#6B7890] uppercase tracking-wider mb-2">{item.label}</p>
                <p className={clsx('text-[18px] font-bold tabular-nums', item.color || 'text-[#172D4A]')}>{item.value}</p>
                {item.label === 'Estimated Impact' && (
                  <p className={clsx('text-[12px] font-medium mt-1', results.impactPct >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                    {results.impactPct >= 0 ? '+' : ''}{(results.impactPct * 100).toFixed(2)}%
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          {/* What this means */}
          <div className={clsx('rounded-[12px] p-4 border', results.totalImpact < 0 ? 'bg-[#FDF0F0] border-[#f5d0d0]' : 'bg-[#EBF8F2] border-[#b8e9d5]')}>
            <div className="flex items-start gap-2">
              {results.totalImpact < 0 ? <TrendingDown size={16} className="text-[#D84E4E] flex-shrink-0 mt-0.5" /> : <Zap size={16} className="text-[#16845D] flex-shrink-0 mt-0.5" />}
              <div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: results.totalImpact < 0 ? '#D84E4E' : '#16845D' }}>What this means</p>
                <p className="text-[12.5px] leading-relaxed" style={{ color: results.totalImpact < 0 ? '#7a2020' : '#0d5c3a' }}>
                  Under the <strong>{scenario?.name}</strong> scenario, your portfolio would experience an estimated
                  {results.totalImpact < 0 ? ' loss' : ' gain'} of <strong>{formatINRSigned(results.totalImpact)}</strong>
                  {' '}({results.impactPct >= 0 ? '+' : ''}{(results.impactPct * 100).toFixed(1)}%).
                  {results.impactPct < -0.15 && ' This represents a significant drawdown that could materially impact your financial goals.'}
                  {results.impactPct >= 0.10 && ' This represents a favorable recovery in portfolio value.'}
                  {' '}Your IT sector exposure ({Math.round(portfolio.holdings.filter(h => h.sector === 'Information Technology').reduce((s, h) => s + h.weight, 0) * 100)}%) amplifies technology-specific shocks.
                </p>
              </div>
            </div>
          </div>

          {/* Asset-level impact chart */}
          <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
            <h3 className="text-[13px] font-semibold text-[#172D4A] mb-4">Asset-Level Impact</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F7" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false}
                    tick={{ fontSize: 11, fill: '#6B7890' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="symbol" tickLine={false} axisLine={false}
                    tick={{ fontSize: 12, fill: '#172D4A' }} width={80} />
                  <Tooltip formatter={(v) => formatINR(v)} />
                  <ReferenceLine x={0} stroke="#E1E7EF" />
                  <Bar dataKey="impact" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.impact >= 0 ? '#16845D' : '#D84E4E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset table */}
          <div className="bg-white border border-[#E1E7EF] rounded-[12px] shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
            <div className="px-5 py-3 border-b border-[#E1E7EF]">
              <h3 className="text-[13px] font-semibold text-[#172D4A]">Asset Detail</h3>
            </div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[#E1E7EF]">
                  {['Asset', 'Sector', 'Current Value', 'Shock Applied', 'Impact', 'Scenario Value'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-[#6B7890] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.assetImpacts.map((a) => (
                  <tr key={a.symbol} className="border-b border-[#F0F3F7] last:border-0 hover:bg-[#FAFBFD]">
                    <td className="py-2.5 px-3 font-medium text-[#172D4A]">{a.symbol}</td>
                    <td className="py-2.5 px-3 text-[#6B7890]">{SECTOR_DISPLAY[a.sector] || a.sector}</td>
                    <td className="py-2.5 px-3 tabular-nums text-[#172D4A]">{formatINR(a.currentValue)}</td>
                    <td className={clsx('py-2.5 px-3 font-semibold tabular-nums', a.shock >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                      {a.shock >= 0 ? '+' : ''}{(a.shock * 100).toFixed(0)}%
                    </td>
                    <td className={clsx('py-2.5 px-3 font-semibold tabular-nums', a.impact >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]')}>
                      {formatINRSigned(a.impact)}
                    </td>
                    <td className="py-2.5 px-3 tabular-nums text-[#172D4A]">{formatINR(a.newValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
