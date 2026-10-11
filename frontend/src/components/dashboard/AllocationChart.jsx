// AllocationChart.jsx — Portfolio allocation doughnut chart
import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatINR } from '../../utils/formatCurrency.js';
import { clsx } from 'clsx';

const CHART_COLORS = [
  '#3478CC', '#16845D', '#D99120', '#7C5ABF', '#D84E4E',
  '#24486F', '#0EA5A0', '#E07B39', '#8B5CF6', '#0D9488',
];

function renderActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 2} outerRadius={outerRadius + 4}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-[#E1E7EF] rounded-xl p-3 shadow-lg text-[12.5px]">
      <p className="font-semibold text-[#172D4A] mb-1">{data.symbol}</p>
      <p className="text-[#6B7890]">{data.name}</p>
      <div className="mt-2 space-y-1">
        <p className="text-[#172D4A]">Value: <span className="font-semibold">{formatINR(data.marketValue)}</span></p>
        <p className="text-[#172D4A]">Weight: <span className="font-semibold">{(data.weight * 100).toFixed(1)}%</span></p>
        <p className={data.unrealizedPLPct >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]'}>
          {data.unrealizedPLPct >= 0 ? '+' : ''}{(data.unrealizedPLPct * 100).toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

export default function AllocationChart() {
  const { portfolio } = usePortfolio();
  const [activeIndex, setActiveIndex] = useState(null);

  const data = portfolio.holdings.map((h, i) => ({
    ...h,
    color: CHART_COLORS[i % CHART_COLORS.length],
    value: h.weight * 100,
  }));

  const totalValue = portfolio.totalMarketValue || 0;

  return (
    <div className="bg-white border border-[#E1E7EF] rounded-[12px] p-5 shadow-[0_1px_3px_rgba(23,45,74,0.06)]">
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-[#172D4A]">Allocation</h3>
        <p className="text-[12px] text-[#6B7890] mt-0.5">Portfolio composition by market value</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Donut chart */}
        <div style={{ width: 180, height: 180, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, i) => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-1.5 min-w-0">
          {data.map((item, i) => (
            <div
              key={item.symbol}
              className={clsx(
                'flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer text-[12.5px]',
                activeIndex === i ? 'bg-[#EAF2FF]' : 'hover:bg-[#F5F7FB]'
              )}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="font-medium text-[#172D4A] truncate">{item.symbol}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-[#6B7890]">{item.value.toFixed(1)}%</span>
                <span className={clsx(
                  'text-[11px] font-medium',
                  item.unrealizedPLPct >= 0 ? 'text-[#16845D]' : 'text-[#D84E4E]'
                )}>
                  {item.unrealizedPLPct >= 0 ? '+' : ''}{(item.unrealizedPLPct * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
