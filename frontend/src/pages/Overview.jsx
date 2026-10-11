// Overview.jsx — Main portfolio dashboard
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wallet, TrendingUp, TrendingDown, ShieldCheck, ArrowRight,
  BarChart2, Lightbulb, AlertCircle, Layers
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { analyzePortfolioRisk } from '../services/riskService.js';
import MetricCard from '../components/dashboard/MetricCard.jsx';
import PerformanceChart from '../components/dashboard/PerformanceChart.jsx';
import AllocationChart from '../components/dashboard/AllocationChart.jsx';
import RiskContributionChart from '../components/dashboard/RiskContributionChart.jsx';
import HoldingsTable from '../components/portfolio/HoldingsTable.jsx';
import { formatINR, formatINRSigned } from '../utils/formatCurrency.js';
import { clsx } from 'clsx';

function RiskBadge({ category }) {
  const colors = {
    Low: 'bg-[#EBF8F2] text-[#16845D]',
    Medium: 'bg-[#FEF6E7] text-[#D99120]',
    High: 'bg-[#FDF0F0] text-[#D84E4E]',
  };
  return (
    <span className={clsx('text-[12px] font-semibold px-2.5 py-1 rounded-full', colors[category] || colors.Medium)}>
      {category}
    </span>
  );
}

function InsightCard({ icon: Icon, title, description, actionLabel, onAction, color = 'blue' }) {
  const colors = {
    blue: 'bg-[#EAF2FF] text-[#3478CC]',
    amber: 'bg-[#FEF6E7] text-[#D99120]',
    red: 'bg-[#FDF0F0] text-[#D84E4E]',
    green: 'bg-[#EBF8F2] text-[#16845D]',
  };
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F5F7FB] hover:bg-[#EEF2F8] transition-colors">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors[color])}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#172D4A]">{title}</p>
        <p className="text-[12px] text-[#6B7890] mt-0.5 leading-relaxed">{description}</p>
        {actionLabel && (
          <button
            onClick={onAction}
            className="mt-2 text-[12px] font-medium text-[#3478CC] flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            {actionLabel} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Overview() {
  const { portfolio } = usePortfolio();
  const navigate = useNavigate();

  const riskAnalysis = useMemo(() => {
    const holdings = portfolio.holdings.map((h) => ({
      symbol: h.symbol, name: h.name, weight: h.weight,
    }));
    return analyzePortfolioRisk(holdings);
  }, [portfolio.holdings]);

  const { totalMarketValue, totalCostBasis, totalUnrealizedPL, totalUnrealizedPLPct } = portfolio;

  // Today's simulated P&L (±0.5% of portfolio)
  const todayPL = totalMarketValue * 0.0066;
  const todayPLPct = 0.66;

  const riskCategory = riskAnalysis?.classification?.category || 'Medium';

  // IT sector concentration check
  const itHoldings = portfolio.holdings.filter((h) => h.sector === 'Information Technology');
  const itWeight = itHoldings.reduce((s, h) => s + h.weight, 0);

  // Bank sector concentration
  const bankHoldings = portfolio.holdings.filter((h) => h.sector === 'Banking & Finance');
  const bankWeight = bankHoldings.reduce((s, h) => s + h.weight, 0);

  const topHolding = portfolio.holdings.reduce((a, b) => (a.weight > b.weight ? a : b), portfolio.holdings[0] || {});

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#172D4A]">Portfolio Overview</h1>
          <p className="text-[13.5px] text-[#6B7890] mt-1">
            Understand your investments, performance, and risk in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/optimizer')}
            className="btn btn-secondary text-[13px]"
          >
            Optimize Allocation
          </button>
          <button
            onClick={() => navigate('/risk')}
            className="btn btn-primary text-[13px]"
          >
            <BarChart2 size={14} />
            Analyze Portfolio
          </button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="demo-banner">
        <AlertCircle size={13} />
        <span>
          <strong>Illustrative demo data.</strong> Portfolio values, prices, and calculations are simulated for demonstration purposes only.
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Portfolio Value"
          value={formatINR(totalMarketValue)}
          subtitle={`Invested: ${formatINR(totalCostBasis)}`}
          icon={Wallet}
          index={0}
        />
        <MetricCard
          title="Today's P&L"
          value={formatINRSigned(todayPL)}
          subtitle={`+${todayPLPct.toFixed(2)}% today`}
          trend="up"
          icon={TrendingUp}
          badge={`+${todayPLPct.toFixed(2)}%`}
          badgeColor="positive"
          index={1}
        />
        <MetricCard
          title="Total Return"
          value={`${totalUnrealizedPLPct >= 0 ? '+' : ''}${(totalUnrealizedPLPct * 100).toFixed(1)}%`}
          subtitle={formatINRSigned(totalUnrealizedPL)}
          trend={totalUnrealizedPLPct >= 0 ? 'up' : 'down'}
          icon={totalUnrealizedPLPct >= 0 ? TrendingUp : TrendingDown}
          badge={`${totalUnrealizedPLPct >= 0 ? '+' : ''}${(totalUnrealizedPLPct * 100).toFixed(1)}%`}
          badgeColor={totalUnrealizedPLPct >= 0 ? 'positive' : 'negative'}
          index={2}
        />
        <MetricCard
          title="Portfolio Risk"
          value={riskCategory}
          subtitle={`Vol: ${((riskAnalysis?.annualizedVol || 0.22) * 100).toFixed(1)}% ann.`}
          icon={ShieldCheck}
          badge={riskCategory}
          badgeColor={riskCategory === 'Low' ? 'positive' : riskCategory === 'Medium' ? 'warning' : 'negative'}
          index={3}
        />
      </div>

      {/* Performance Chart (full width) */}
      <PerformanceChart />

      {/* Allocation + Risk Contribution row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AllocationChart />
        <RiskContributionChart />
      </div>

      {/* Portfolio Insights */}
      <motion.div
        className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={16} className="text-[#D99120]" />
          <h3 className="text-[14px] font-semibold text-[#172D4A]">Portfolio Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InsightCard
            icon={Layers}
            title="Sector Concentration"
            description={`IT sector represents ${(itWeight * 100).toFixed(0)}% of your portfolio (INFY, TCS${itHoldings.length > 2 ? ', +' + (itHoldings.length - 2) : ''}). High sector exposure increases correlated downside risk.`}
            actionLabel="View Risk Analysis"
            onAction={() => navigate('/risk')}
            color={itWeight > 0.35 ? 'amber' : 'blue'}
          />
          <InsightCard
            icon={AlertCircle}
            title="Top Holding Weight"
            description={`${topHolding.symbol} is your largest position at ${((topHolding.weight || 0) * 100).toFixed(1)}% of the portfolio. Consider if this concentration aligns with your risk tolerance.`}
            actionLabel="Optimize Weights"
            onAction={() => navigate('/optimizer')}
            color={(topHolding.weight || 0) > 0.25 ? 'amber' : 'green'}
          />
          <InsightCard
            icon={TrendingDown}
            title="Drawdown Exposure"
            description={`Historical max drawdown: ${((riskAnalysis?.maxDrawdown || -0.18) * 100).toFixed(1)}%. Simulating how your portfolio might react to market stress.`}
            actionLabel="Run Scenario Test"
            onAction={() => navigate('/scenarios')}
            color={Math.abs(riskAnalysis?.maxDrawdown || 0.18) > 0.20 ? 'red' : 'amber'}
          />
        </div>
      </motion.div>

      {/* Holdings Preview */}
      <motion.div
        className="bg-white border border-[#E1E7EF] rounded-[12px] shadow-[0_1px_3px_rgba(23,45,74,0.06)]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E1E7EF]">
          <h3 className="text-[14px] font-semibold text-[#172D4A]">Holdings</h3>
          <button
            onClick={() => navigate('/portfolio')}
            className="text-[12.5px] font-medium text-[#3478CC] flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            View All <ArrowRight size={13} />
          </button>
        </div>
        <HoldingsTable
          holdings={portfolio.holdings}
          compact={true}
          onRowClick={() => navigate('/portfolio')}
        />
      </motion.div>
    </div>
  );
}
