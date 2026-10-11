// RiskAnalysis.jsx — Professional risk analytics workspace
import React, { useMemo, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Info, ShieldAlert, ArrowRight } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { analyzePortfolioRisk } from '../services/riskService.js';
import { InfoTooltip } from '../components/common/Tooltip.jsx';
import Button from '../components/common/Button.jsx';
import LoadingState from '../components/common/LoadingState.jsx';
import { formatINR } from '../utils/formatCurrency.js';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

// Lazy load Plotly heatmap
const Plot = lazy(() => import('react-plotly.js'));

const METRIC_TOOLTIPS = {
  vol: 'Annualized volatility measures the typical magnitude of daily price fluctuations over 252 trading days. Higher values indicate greater price uncertainty.',
  maxDD: 'Maximum drawdown is the largest peak-to-trough decline in portfolio value observed in the historical period.',
  sharpe: 'Sharpe ratio = (Portfolio return − Risk-free rate) / Volatility. Assumes 6.5% annual risk-free rate (Indian T-bill approximation). Higher is better.',
  hhi: 'Herfindahl-Hirschman Index measures concentration. 1.0 = fully concentrated; lower values indicate diversification.',
  effHoldings: 'Effective number of holdings = 1 / HHI. Represents the equivalent number of equal-weight positions.',
};

function RiskScoreBar({ score }) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const color = score >= 60 ? '#D84E4E' : score >= 25 ? '#D99120' : '#16845D';
  return (
    <div className="mt-3">
      <div className="flex justify-between text-[12px] text-[#6B7890] mb-1.5">
        <span>Low</span><span>Medium</span><span>High</span>
      </div>
      <div className="h-2.5 bg-[#F0F3F7] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedScore}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-[#6B7890] mt-1">
        <span>0</span><span>25</span><span>60</span><span>100</span>
      </div>
    </div>
  );
}

function MetricItem({ label, value, tooltip, color }) {
  return (
    <div className="bg-[#F5F7FB] rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11.5px] font-medium text-[#6B7890] uppercase tracking-wider">{label}</span>
        <InfoTooltip content={tooltip} />
      </div>
      <p className={clsx('text-[20px] font-bold tabular-nums', color || 'text-[#172D4A]')}>{value}</p>
    </div>
  );
}

function ExpandableReason({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[#E1E7EF] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F5F7FB] transition-all"
      >
        <span className="text-[13px] font-medium text-[#172D4A]">{title}</span>
        {open ? <ChevronUp size={15} className="text-[#6B7890]" /> : <ChevronDown size={15} className="text-[#6B7890]" />}
      </button>
      {open && (
        <motion.div
          className="px-4 pb-4 text-[12.5px] text-[#6B7890] leading-relaxed"
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        >
          {content}
        </motion.div>
      )}
    </div>
  );
}

function CorrelationHeatmap({ symbols, matrix }) {
  if (!symbols?.length || !matrix?.length) return null;

  const colorscale = [
    [0, '#D84E4E'], [0.5, '#FFFFFF'], [1, '#3478CC'],
  ];

  return (
    <Suspense fallback={<LoadingState message="Loading heatmap..." />}>
      <Plot
        data={[{
          type: 'heatmap',
          z: matrix,
          x: symbols,
          y: symbols,
          colorscale,
          zmin: -1, zmax: 1,
          hovertemplate: '%{y} vs %{x}: %{z:.2f}<extra></extra>',
          showscale: true,
        }]}
        layout={{
          width: undefined,
          autosize: true,
          margin: { t: 10, b: 50, l: 70, r: 20 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'Inter', size: 11, color: '#6B7890' },
          coloraxis: { colorbar: { thickness: 10, len: 0.8 } },
        }}
        config={{ displayModeBar: false, responsive: true }}
        style={{ width: '100%', height: 300 }}
      />
    </Suspense>
  );
}

export default function RiskAnalysis() {
  const navigate = useNavigate();
  const { portfolio } = usePortfolio();

  const analysis = useMemo(() => {
    const holdings = portfolio.holdings.map((h) => ({
      symbol: h.symbol, name: h.name, weight: h.weight,
    }));
    return analyzePortfolioRisk(holdings);
  }, [portfolio.holdings]);

  if (analysis.error) {
    return (
      <div className="flex items-center justify-center py-20 text-[#6B7890]">
        <p>{analysis.error}</p>
      </div>
    );
  }

  const { annualizedVol, annualizedReturn: annRet, maxDrawdown, sharpeRatio, hhi,
    effectiveHoldings, correlationSymbols, correlationMatrix, riskByAsset, classification } = analysis;

  const riskColor = classification.category === 'High' ? 'text-[#D84E4E]'
    : classification.category === 'Medium' ? 'text-[#D99120]' : 'text-[#16845D]';

  // IT sector check
  const itAssets = portfolio.holdings.filter((h) => h.sector === 'Information Technology');
  const itWeight = itAssets.reduce((s, h) => s + h.weight, 0);

  // High correlation pairs
  const highCorrPairs = [];
  if (correlationSymbols && correlationMatrix) {
    for (let i = 0; i < correlationSymbols.length; i++) {
      for (let j = i + 1; j < correlationSymbols.length; j++) {
        if (correlationMatrix[i][j] > 0.75) {
          highCorrPairs.push([correlationSymbols[i], correlationSymbols[j], correlationMatrix[i][j]]);
        }
      }
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#172D4A]">Risk Analysis</h1>
          <p className="text-[13.5px] text-[#6B7890] mt-1">
            Explainable risk metrics for your portfolio.
            <span className="ml-2 text-[#D99120] text-[12px]">Heuristic classifier — not an ML model.</span>
          </p>
        </div>
        <Button icon={<ArrowRight size={14} />} iconPosition="right" onClick={() => navigate('/optimizer')}>
          Review Allocation
        </Button>
      </div>

      {/* Risk Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)] lg:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={17} className={riskColor} />
            <h3 className="text-[14px] font-semibold text-[#172D4A]">Risk Classification</h3>
          </div>
          <div className={clsx('text-[36px] font-bold mb-1', riskColor)}>
            {classification.category}
          </div>
          <p className="text-[12.5px] text-[#6B7890] mb-3">
            Risk score: {classification.score}/100 · {analysis.lookbackDays} trading days observed
          </p>
          <RiskScoreBar score={classification.score} />
          <div className="mt-4 space-y-1.5">
            {classification.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-[#6B7890]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D99120] mt-1.5 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[#6B7890] mt-4 border-t border-[#E1E7EF] pt-3 italic">
            {analysis.methodology}
          </p>
        </div>

        {/* Metrics grid */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricItem
            label="Annualized Volatility"
            value={`${(annualizedVol * 100).toFixed(1)}%`}
            tooltip={METRIC_TOOLTIPS.vol}
            color={annualizedVol > 0.22 ? 'text-[#D84E4E]' : annualizedVol > 0.12 ? 'text-[#D99120]' : 'text-[#16845D]'}
          />
          <MetricItem
            label="Max Drawdown"
            value={`${(maxDrawdown * 100).toFixed(1)}%`}
            tooltip={METRIC_TOOLTIPS.maxDD}
            color={Math.abs(maxDrawdown) > 0.20 ? 'text-[#D84E4E]' : 'text-[#D99120]'}
          />
          <MetricItem
            label="Sharpe Ratio"
            value={sharpeRatio.toFixed(2)}
            tooltip={METRIC_TOOLTIPS.sharpe}
            color={sharpeRatio > 1 ? 'text-[#16845D]' : sharpeRatio > 0.5 ? 'text-[#D99120]' : 'text-[#D84E4E]'}
          />
          <MetricItem
            label="Annualized Return"
            value={`${annRet >= 0 ? '+' : ''}${(annRet * 100).toFixed(1)}%`}
            tooltip="Historical annualized return calculated from observed daily returns over the lookback period."
            color={annRet >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]'}
          />
          <MetricItem
            label="Concentration (HHI)"
            value={hhi.toFixed(3)}
            tooltip={METRIC_TOOLTIPS.hhi}
            color={hhi > 0.25 ? 'text-[#D84E4E]' : hhi > 0.15 ? 'text-[#D99120]' : 'text-[#16845D]'}
          />
          <MetricItem
            label="Effective Holdings"
            value={effectiveHoldings.toFixed(1)}
            tooltip={METRIC_TOOLTIPS.effHoldings}
            color={effectiveHoldings < 3 ? 'text-[#D84E4E]' : 'text-[#172D4A]'}
          />
        </div>
      </div>

      {/* Correlation Heatmap */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <div className="mb-4">
          <h3 className="text-[14px] font-semibold text-[#172D4A]">Asset Correlation Heatmap</h3>
          <p className="text-[12px] text-[#6B7890] mt-0.5">Pairwise Pearson correlation of 1-year daily returns. Blue = positive, Red = negative correlation.</p>
        </div>
        <CorrelationHeatmap symbols={correlationSymbols} matrix={correlationMatrix} />
      </div>

      {/* Risk contribution ranking */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-1">Risk Contribution Ranking</h3>
        <p className="text-[12px] text-[#6B7890] mb-4">
          Component risk contribution = (weight × marginal risk contribution) / total portfolio variance.
          This differs from individual asset volatility.
        </p>
        <div className="space-y-3">
          {[...riskByAsset].sort((a, b) => b.riskContribution - a.riskContribution).map((asset, i) => (
            <div key={asset.symbol} className="flex items-center gap-3">
              <span className="text-[12px] font-bold text-[#6B7890] w-5 text-right">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between text-[12.5px] mb-1">
                  <div>
                    <span className="font-semibold text-[#172D4A]">{asset.symbol}</span>
                    <span className="text-[#6B7890] ml-2">Weight: {(asset.weight * 100).toFixed(1)}%</span>
                    <span className="text-[#6B7890] ml-2">Individual vol: {(asset.individualVol * 100).toFixed(1)}%</span>
                  </div>
                  <span className="font-semibold text-[#172D4A]">{(asset.riskContribution * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-[#F0F3F7] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: asset.riskContribution > 0.30 ? '#D84E4E' : asset.riskContribution > 0.20 ? '#D99120' : '#3478CC' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${asset.riskContribution * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Why is my portfolio risky? */}
      <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
        <h3 className="text-[14px] font-semibold text-[#172D4A] mb-3">Why is my portfolio {classification.category === 'High' ? 'high-risk' : classification.category === 'Medium' ? 'medium-risk' : 'low-risk'}?</h3>
        <div className="space-y-2">
          {itWeight > 0.30 && (
            <ExpandableReason
              title={`IT Sector Concentration: ${(itWeight * 100).toFixed(0)}% exposure`}
              content={`Your portfolio allocates ${(itWeight * 100).toFixed(0)}% to the Information Technology sector (${itAssets.map(h => h.symbol).join(', ')}). IT stocks tend to move together during broad tech sell-offs, increasing correlated downside risk. Historically, the Indian IT sector has experienced corrections of 30%+ during global risk-off episodes.`}
              defaultOpen={true}
            />
          )}
          {riskByAsset[0] && (
            <ExpandableReason
              title={`${riskByAsset.sort((a,b) => b.riskContribution - a.riskContribution)[0].symbol} — Largest Risk Contributor`}
              content={`${riskByAsset[0].symbol} contributes ${(Math.max(...riskByAsset.map(a=>a.riskContribution)) * 100).toFixed(1)}% of total portfolio risk despite its ${(riskByAsset[0].weight * 100).toFixed(1)}% allocation. This is driven by its ${(riskByAsset[0].individualVol * 100).toFixed(1)}% annualized volatility and positive correlation with other portfolio holdings.`}
            />
          )}
          {highCorrPairs.length > 0 && (
            <ExpandableReason
              title={`${highCorrPairs.length} Highly Correlated Pair${highCorrPairs.length > 1 ? 's' : ''} Detected`}
              content={`The following asset pairs have correlation > 0.75: ${highCorrPairs.map(p => `${p[0]} & ${p[1]} (${(p[2]*100).toFixed(0)}%)`).join(', ')}. When assets move together, diversification benefits are reduced and portfolio swings can be amplified.`}
            />
          )}
          <ExpandableReason
            title={`Historical Maximum Drawdown: ${(maxDrawdown * 100).toFixed(1)}%`}
            content={`The portfolio experienced a maximum peak-to-trough decline of ${(maxDrawdown * 100).toFixed(1)}% over the observed period. This means an investor would have seen their ₹10L portfolio drop to approximately ${formatINR(1000000 * (1 + maxDrawdown))} at the worst point. Drawdowns of this magnitude can test investor conviction and may force poor decisions at market lows.`}
          />
        </div>
        <div className="mt-4">
          <Button variant="secondary" icon={<ArrowRight size={14} />} iconPosition="right" onClick={() => navigate('/optimizer')}>
            Review Allocation to Reduce Risk
          </Button>
        </div>
      </div>
    </div>
  );
}
