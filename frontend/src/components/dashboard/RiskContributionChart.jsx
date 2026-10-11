// RiskContributionChart.jsx — Horizontal bar chart of risk contributions
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { analyzePortfolioRisk } from '../../services/riskService.js';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E1E7EF] rounded-xl p-3 shadow-lg text-[12.5px]">
      <p className="font-semibold text-[#172D4A] mb-1">{label}</p>
      <p className="text-[#6B7890]">Risk contribution: <span className="font-medium text-[#172D4A]">{(payload[0].value * 100).toFixed(1)}%</span></p>
    </div>
  );
}

export default function RiskContributionChart() {
  const { portfolio } = usePortfolio();

  const data = useMemo(() => {
    const holdings = portfolio.holdings.map((h) => ({
      symbol: h.symbol, name: h.name, weight: h.weight,
    }));
    const result = analyzePortfolioRisk(holdings);
    if (result.error || !result.riskByAsset) return [];
    return [...result.riskByAsset]
      .sort((a, b) => b.riskContribution - a.riskContribution)
      .map((a) => ({
        symbol: a.symbol,
        contribution: a.riskContribution,
        weight: a.weight,
        vol: a.individualVol,
      }));
  }, [portfolio.holdings]);

  const getBarColor = (value) => {
    if (value > 0.30) return '#D84E4E';
    if (value > 0.20) return '#D99120';
    return '#3478CC';
  };

  if (!data.length) return null;

  const topContributor = data[0];

  return (
    <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-[#172D4A]">Risk Contribution by Asset</h3>
        <p className="text-[12px] text-[#6B7890] mt-0.5">
          Component contribution to total portfolio volatility
        </p>
      </div>

      {/* Insight callout */}
      <div className="bg-[#FEF6E7] border border-[#F5DCAA] rounded-lg p-3 mb-4 text-[12px] text-[#8a5a00]">
        <span className="font-semibold">{topContributor.symbol}</span> contributes{' '}
        {(topContributor.contribution * 100).toFixed(1)}% of total portfolio risk, driven by its{' '}
        {(topContributor.vol * 100).toFixed(1)}% annualized volatility and{' '}
        {(topContributor.weight * 100).toFixed(1)}% portfolio weight.
      </div>

      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F3F7" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fontSize: 11, fill: '#6B7890' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              tick={{ fontSize: 12, fill: '#172D4A', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="contribution" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.contribution)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
