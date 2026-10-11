// AllocationOptimizer.jsx — Visual workspace for portfolio allocation optimization
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { recommendAllocation } from '../services/optimizationService.js';
import { generateEfficientFrontierPoints } from '../services/optimizationService.js';
import { analyzePortfolioRisk } from '../services/riskService.js';
import { InfoTooltip } from '../components/common/Tooltip.jsx';
import Button from '../components/common/Button.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

const Plot = lazy(() => import('react-plotly.js'));

const COLORS = ['#3478CC', '#16845D', '#D99120', '#7C5ABF', '#D84E4E', '#24486F', '#0EA5A0'];
const RISK_LEVELS = ['conservative', 'moderate', 'aggressive'];

function AllocationDonut({ data, title }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-[#172D4A] mb-3">{title}</p>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
              paddingAngle={2} dataKey="weight">
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
            </Pie>
            <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 mt-2">
        {data.map((item, i) => (
          <div key={item.symbol} className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-[#172D4A] font-medium">{item.symbol}</span>
            </div>
            <span className="text-[#6B7890]">{(item.weight * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompareMetric({ label, current, recommended, tooltip, higherIsBetter = true }) {
  const improvement = recommended > current;
  const color = (higherIsBetter ? improvement : !improvement) ? 'text-[#16845D]' : 'text-[#D84E4E]';
  const arrow = improvement ? '↑' : '↓';
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#F0F3F7] last:border-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] text-[#172D4A]">{label}</span>
        <InfoTooltip content={tooltip} />
      </div>
      <div className="flex items-center gap-4 text-[13px] tabular-nums">
        <span className="text-[#6B7890]">{current}</span>
        <span className="text-[#D0D7E3]">→</span>
        <span className={clsx('font-semibold', color)}>{recommended} {arrow}</span>
      </div>
    </div>
  );
}

export default function AllocationOptimizer() {
  const { portfolio, riskPreference, setRiskPreference, investmentAmount } = usePortfolio();
  const [localRisk, setLocalRisk] = useState(riskPreference);
  const [maxPerAsset, setMaxPerAsset] = useState(40);

  const symbols = portfolio.holdings.map((h) => h.symbol);

  const recommended = useMemo(() => {
    return recommendAllocation(symbols, localRisk, maxPerAsset / 100);
  }, [symbols, localRisk, maxPerAsset]);

  const currentData = portfolio.holdings.map((h) => ({ symbol: h.symbol, weight: h.weight }));

  const currentRisk = useMemo(() => {
    const holdings = portfolio.holdings.map((h) => ({ symbol: h.symbol, name: h.name, weight: h.weight }));
    return analyzePortfolioRisk(holdings);
  }, [portfolio.holdings]);

  const recommendedRisk = useMemo(() => {
    const holdings = recommended.map((r) => ({
      symbol: r.symbol,
      name: r.symbol,
      weight: r.weight,
    }));
    return analyzePortfolioRisk(holdings);
  }, [recommended]);

  const frontierPoints = useMemo(() => generateEfficientFrontierPoints(symbols, 150), [symbols]);

  const handleApply = () => {
    setRiskPreference(localRisk);
  };

  const fmtPct = (v) => `${(v * 100).toFixed(1)}%`;
  const fmtNum = (v) => typeof v === 'number' ? v.toFixed(2) : '—';

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#172D4A]">Allocation Optimizer</h1>
          <p className="text-[13.5px] text-[#6B7890] mt-1">
            Compare current vs. recommended allocations based on your risk preference.
            <span className="ml-1 text-[11.5px] text-[#D99120]">Inverse-volatility methodology. Not financial advice.</span>
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[13px] font-semibold text-[#172D4A] mb-3">Optimization Settings</h3>
        <div className="flex flex-wrap gap-6 items-end">
          <div>
            <label className="block text-[12px] font-medium text-[#6B7890] mb-1.5">Risk Preference</label>
            <div className="flex gap-1.5">
              {RISK_LEVELS.map((r) => (
                <button key={r} onClick={() => setLocalRisk(r)}
                  className={clsx('px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-all capitalize',
                    localRisk === r ? 'bg-[#3478CC] text-white' : 'bg-[#F5F7FB] text-[#6B7890] hover:bg-[#EAF2FF]')}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-[#6B7890] mb-1.5">Max Per Asset: {maxPerAsset}%</label>
            <input type="range" min={10} max={60} step={5} value={maxPerAsset}
              onChange={(e) => setMaxPerAsset(parseInt(e.target.value))}
              className="w-36 accent-[#3478CC]" />
          </div>
          <Button size="sm" onClick={handleApply} variant="secondary">Apply Settings</Button>
        </div>
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
          <AllocationDonut data={currentData} title="Current Allocation" />
        </div>
        <div className="bg-white border border-[#3478CC]/20 border-2 rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <p className="text-[13px] font-semibold text-[#172D4A]">Recommended Allocation</p>
            <span className="text-[11px] bg-[#EAF2FF] text-[#3478CC] px-2 py-0.5 rounded-full font-medium capitalize">{localRisk}</span>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={recommended} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={2} dataKey="weight">
                  {recommended.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
                </Pie>
                <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {recommended.map((item, i) => (
              <div key={item.symbol} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[#172D4A] font-medium">{item.symbol}</span>
                </div>
                <span className="text-[#6B7890]">{(item.weight * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric comparison */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-1">Performance Metric Comparison</h3>
        <p className="text-[12px] text-[#6B7890] mb-4">Based on 1-year historical data. Past metrics do not guarantee future results.</p>
        <CompareMetric
          label="Annualized Return (Historical)"
          current={fmtPct(currentRisk.annualizedReturn || 0)}
          recommended={fmtPct(recommendedRisk.annualizedReturn || 0)}
          tooltip="Historical annualized return over the observed period."
          higherIsBetter={true}
        />
        <CompareMetric
          label="Annualized Volatility"
          current={fmtPct(currentRisk.annualizedVol || 0)}
          recommended={fmtPct(recommendedRisk.annualizedVol || 0)}
          tooltip="Annualized standard deviation of daily returns."
          higherIsBetter={false}
        />
        <CompareMetric
          label="Max Drawdown"
          current={fmtPct(currentRisk.maxDrawdown || 0)}
          recommended={fmtPct(recommendedRisk.maxDrawdown || 0)}
          tooltip="Largest peak-to-trough loss in the historical period."
          higherIsBetter={false}
        />
        <CompareMetric
          label="Sharpe Ratio"
          current={fmtNum(currentRisk.sharpeRatio)}
          recommended={fmtNum(recommendedRisk.sharpeRatio)}
          tooltip="Risk-adjusted return. Higher = better return per unit of risk."
          higherIsBetter={true}
        />
      </div>

      {/* Risk-return scatter (efficient frontier) */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-1">Risk–Return Landscape</h3>
        <p className="text-[12px] text-[#6B7890] mb-4">
          150 randomly-weighted portfolios from the same asset universe. Grey dots = random portfolios, Blue = current, Green = recommended.
          Not an efficient frontier — illustrative scatter only.
        </p>
        <Suspense fallback={<LoadingState />}>
          <Plot
            data={[
              {
                type: 'scatter',
                mode: 'markers',
                x: frontierPoints.map((p) => p.risk * 100),
                y: frontierPoints.map((p) => p.return * 100),
                marker: { color: frontierPoints.map((p) => p.sharpe), colorscale: 'Blues', size: 6, opacity: 0.5, showscale: false },
                hovertemplate: 'Risk: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>',
                name: 'Random Portfolios',
              },
              {
                type: 'scatter',
                mode: 'markers',
                x: [(currentRisk.annualizedVol || 0) * 100],
                y: [(currentRisk.annualizedReturn || 0) * 100],
                marker: { color: '#3478CC', size: 14, symbol: 'star' },
                name: 'Current Portfolio',
                hovertemplate: 'Current<br>Risk: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>',
              },
              {
                type: 'scatter',
                mode: 'markers',
                x: [(recommendedRisk.annualizedVol || 0) * 100],
                y: [(recommendedRisk.annualizedReturn || 0) * 100],
                marker: { color: '#16845D', size: 14, symbol: 'star' },
                name: 'Recommended Portfolio',
                hovertemplate: 'Recommended<br>Risk: %{x:.1f}%<br>Return: %{y:.1f}%<extra></extra>',
              },
            ]}
            layout={{
              autosize: true,
              margin: { t: 10, b: 50, l: 55, r: 20 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: '#FAFBFD',
              xaxis: { title: 'Risk (Volatility %)', ticksuffix: '%', gridcolor: '#E1E7EF', zeroline: false },
              yaxis: { title: 'Return (%)', ticksuffix: '%', gridcolor: '#E1E7EF', zeroline: false },
              font: { family: 'Inter', size: 11, color: '#6B7890' },
              legend: { x: 0.02, y: 0.98, bgcolor: 'transparent', font: { size: 11 } },
              showlegend: true,
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%', height: 340 }}
          />
        </Suspense>
      </div>

      {/* Allocation change rationale */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-4">Proposed Changes & Rationale</h3>
        <div className="space-y-3">
          {recommended.map((rec) => {
            const current = portfolio.holdings.find((h) => h.symbol === rec.symbol);
            const currentW = current?.weight || 0;
            const diff = rec.weight - currentW;
            const increase = diff > 0.005;
            const decrease = diff < -0.005;
            return (
              <div key={rec.symbol} className="flex items-start gap-3 p-3.5 bg-[#F5F7FB] rounded-xl">
                <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  increase ? 'bg-[#EBF8F2]' : decrease ? 'bg-[#FDF0F0]' : 'bg-[#F0F3F7]')}>
                  {increase ? <TrendingUp size={15} className="text-[#16845D]" />
                    : decrease ? <TrendingDown size={15} className="text-[#D84E4E]" />
                      : <ArrowRight size={15} className="text-[#6B7890]" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-semibold text-[#172D4A]">{rec.symbol}</span>
                    <span className="text-[12px] text-[#6B7890]">{(currentW * 100).toFixed(1)}% → {(rec.weight * 100).toFixed(1)}%</span>
                    <span className={clsx('text-[12px] font-semibold', increase ? 'text-[#16845D]' : decrease ? 'text-[#D84E4E]' : 'text-[#6B7890]')}>
                      ({diff >= 0 ? '+' : ''}{(diff * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6B7890] leading-relaxed">
                    {increase
                      ? `Increase allocation. This asset has lower relative volatility (${(rec.vol * 100).toFixed(1)}% ann.), improving portfolio risk efficiency under the ${localRisk} strategy.`
                      : decrease
                        ? `Reduce allocation. Higher individual volatility (${(rec.vol * 100).toFixed(1)}% ann.) contributes disproportionately to portfolio risk.`
                        : 'Weight unchanged or minimal adjustment required.'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-[#6B7890] mt-4 italic">
          Recommendations use inverse-volatility weighting. Historical volatility is not a guarantee of future performance. Consult a financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
}
