// MyAssetsCard.jsx — Lower Middle Card matching Reference Image 1
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { formatINR } from '../../utils/formatCurrency.js';

const ASSET_THEMES = [
  { bg: '#181A24', text: '#FFFFFF', label: 'RL' },
  { bg: '#F36F69', text: '#FFFFFF', label: 'HB' },
  { bg: '#27AE60', text: '#FFFFFF', label: 'IN' },
  { bg: '#080B47', text: '#FFFFFF', label: 'TC' },
];

export default function MyAssetsCard() {
  const { portfolio } = usePortfolio();
  const navigate = useNavigate();

  const holdings = portfolio.holdings.slice(0, 4);

  return (
    <div className="bg-white rounded-[20px] p-4 sm:p-4.5 shadow-[0_2px_8px_rgba(8,11,71,0.03)] border border-[#ECEFF4] flex flex-col justify-between h-[245px]">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[14px] font-bold text-[#181A24]">My Assets</h3>
        <button
          onClick={() => navigate('/portfolio')}
          className="bg-[#F4F5F8] hover:bg-[#E5E7EB] text-[#181A24] text-[11px] font-semibold px-2.5 py-0.5 rounded-full transition-colors"
        >
          View All
        </button>
      </div>

      {/* ── Holdings List ──────────────────────────────────────── */}
      <div className="space-y-2 my-auto">
        {holdings.map((h, i) => {
          const theme = ASSET_THEMES[i % ASSET_THEMES.length];
          const isPos = (h.unrealizedPLPct || 0) >= 0;
          return (
            <div
              key={h.id || h.symbol}
              onClick={() => navigate('/portfolio')}
              className="flex items-center justify-between group cursor-pointer hover:bg-[#F4F5F8] -mx-1 px-1.5 py-0.5 rounded-lg transition-colors"
            >
              {/* Left: Square icon tile + Symbol + % */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[10.5px] font-bold shadow-2xs flex-shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: theme.bg, color: theme.text }}
                >
                  {h.symbol.slice(0, 2)}
                </div>
                <div>
                  <p className="text-[12.5px] font-bold text-[#181A24] leading-tight group-hover:text-[#3478CC] transition-colors">
                    {h.symbol}
                  </p>
                  <p className="text-[10.5px] text-[#7B8290] font-medium leading-none mt-0.5">
                    {((h.weight || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Right: Market Value & % change */}
              <div className="text-right">
                <p className="text-[12.5px] font-bold text-[#181A24] leading-tight">
                  {formatINR(h.marketValue)}
                </p>
                <p
                  className={`text-[10.5px] font-semibold leading-none mt-0.5 flex items-center justify-end gap-0.5 ${
                    isPos ? 'text-[#27AE60]' : 'text-[#F36F69]'
                  }`}
                >
                  {isPos ? '▲' : '▼'}{' '}
                  {isPos ? '+' : ''}{((h.unrealizedPLPct || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
