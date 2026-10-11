// MarketTicker.jsx — Slim Horizontal market ticker beneath the header matching Reference Image 1
import React from 'react';
import { DEMO_ASSETS } from '../../data/demoAssets.js';
import { formatINR } from '../../utils/formatCurrency.js';

const ICON_THEMES = {
  RELIANCE: { bg: '#181A24', text: '#FFFFFF', label: 'RL' },
  HDFCBANK: { bg: '#F36F69', text: '#FFFFFF', label: 'HB' },
  INFY: { bg: '#27B58A', text: '#FFFFFF', label: 'IN' },
  TCS: { bg: '#181A24', text: '#FFFFFF', label: 'TC' },
  TATAMOTORS: { bg: '#27AE60', text: '#FFFFFF', label: 'TM' },
  SUNPHARMA: { bg: '#E11D48', text: '#FFFFFF', label: 'SP' },
  GOLDBEES: { bg: '#F0B74B', text: '#181A24', label: 'GB' },
  NIFTY50: { bg: '#5B61FF', text: '#FFFFFF', label: 'N50' },
};

export default function MarketTicker() {
  const movers = DEMO_ASSETS.slice(0, 7).map((asset) => {
    const diff = asset.currentPrice - (asset.previousClose || asset.currentPrice);
    const pct = asset.previousClose ? (diff / asset.previousClose) * 100 : 0.85;
    const theme = ICON_THEMES[asset.symbol] || { bg: '#181A24', text: '#FFFFFF', label: asset.symbol.slice(0, 2) };
    return {
      ...asset,
      diff,
      pct,
      isPositive: pct >= 0,
      theme,
    };
  });

  return (
    <div className="w-full flex items-center py-1 overflow-x-auto no-scrollbar">
      {/* Title */}
      <div className="flex items-center gap-1 text-[11.5px] font-semibold text-[#6B7890] flex-shrink-0 pr-3.5 select-none">
        <span>Top Movers:</span>
      </div>

      {/* Ticker items */}
      <div className="flex items-center flex-nowrap">
        {movers.map((item, idx) => (
          <React.Fragment key={item.symbol}>
            <div className="flex items-center gap-2 flex-shrink-0 px-1.5 group cursor-pointer hover:opacity-85 transition-opacity">
              {/* Monogram circle */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-bold shadow-2xs flex-shrink-0"
                style={{ backgroundColor: item.theme.bg, color: item.theme.text }}
              >
                {item.theme.label}
              </div>

              {/* Symbol & Price & Change */}
              <div className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap">
                <span className="font-bold text-[#181A24] tracking-tight">{item.symbol}</span>
                <span className="text-[#7B8290] font-medium">{formatINR(item.currentPrice, true)}</span>
                <span
                  className={`flex items-center font-semibold text-[10.5px] ${
                    item.isPositive ? 'text-[#27AE60]' : 'text-[#F36F69]'
                  }`}
                >
                  {item.isPositive ? '▲' : '▼'}{' '}
                  {item.isPositive ? '+' : ''}{item.pct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Vertical separator */}
            {idx < movers.length - 1 && (
              <div className="w-px h-3.5 bg-[#E2E6EE] mx-2 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
