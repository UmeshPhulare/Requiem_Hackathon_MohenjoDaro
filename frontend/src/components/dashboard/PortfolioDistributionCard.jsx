// PortfolioDistributionCard.jsx — Lower Left Card matching Reference Image 1
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatINR } from '../../utils/formatCurrency.js';
import { clsx } from 'clsx';

const SEGMENT_COLORS = ['#5B61FF', '#A65DF0', '#F36F69', '#27AE60', '#EF4444'];

export default function PortfolioDistributionCard() {
  const { portfolio } = usePortfolio();
  const navigate = useNavigate();
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const holdings = portfolio.holdings.slice(0, 4);
  const otherHoldings = portfolio.holdings.slice(4);
  const otherWeight = otherHoldings.reduce((sum, h) => sum + (h.weight || 0), 0);
  const otherValue = otherHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);

  // 5 segments for the top bar
  const barSegments = [
    ...holdings.map((h, i) => ({
      symbol: h.symbol,
      weight: (h.weight || 0) * 100,
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    })),
    {
      symbol: 'OTHERS',
      weight: otherWeight > 0 ? otherWeight * 100 : 8,
      color: SEGMENT_COLORS[4],
    },
  ];

  // 4 rows for the list below
  const listItems = holdings.map((h, i) => ({
    symbol: h.symbol,
    name: h.name,
    weight: (h.weight || 0) * 100,
    marketValue: h.marketValue,
    color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-[20px] p-4 sm:p-4.5 shadow-[0_2px_8px_rgba(8,11,71,0.03)] border border-[#ECEFF4] flex flex-col justify-between h-[245px]">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-[#181A24]">Portfolio Distribution</h3>
        <button
          onClick={() => navigate('/portfolio')}
          className="bg-[#F4F5F8] hover:bg-[#E5E7EB] text-[#181A24] text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors"
        >
          View All
        </button>
      </div>

      {/* ── Segmented Allocation Bar (5 Segments matching Image 1) ── */}
      <div className="w-full mb-2.5">
        <div className="flex items-center h-[18px] w-full gap-1 rounded-full p-0.5 bg-[#F4F5F8]">
          {barSegments.map((item, idx) => (
            <div
              key={item.symbol}
              className="h-full rounded-full transition-all duration-200 relative cursor-pointer"
              style={{
                width: `${Math.max(item.weight, 6)}%`,
                backgroundColor: item.color,
                opacity: hoveredIdx === null || hoveredIdx === idx ? 1 : 0.45,
                transform: hoveredIdx === idx ? 'scaleY(1.15)' : 'scaleY(1)',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              title={`${item.symbol}: ${item.weight.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* ── Allocation Asset Rows (Top 4 Holdings) ─────────────── */}
      <div className="space-y-2 mt-auto">
        {listItems.map((item, idx) => (
          <div
            key={item.symbol}
            className={clsx(
              'flex items-center justify-between py-0.5 rounded-lg transition-colors cursor-pointer',
              hoveredIdx === idx ? 'bg-[#F4F5F8] px-1' : ''
            )}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => navigate('/portfolio')}
          >
            {/* Left: Dot + Symbol + % */}
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-[12.5px] font-bold text-[#181A24] leading-tight">
                  {item.symbol}
                </p>
                <p className="text-[10.5px] text-[#7B8290] font-medium leading-none mt-0.5">
                  {item.weight.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Right: Market Value */}
            <div className="text-right">
              <span className="text-[12.5px] font-bold text-[#181A24]">
                {formatINR(item.marketValue)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
