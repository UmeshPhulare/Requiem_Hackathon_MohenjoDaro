// MarketTicker.jsx — Real-time live market ticker with NIFTY, SENSEX, NASDAQ, USD/INR, Gold & Equities
import React, { useState, useEffect } from 'react';
import { getLiveQuotes } from '../../services/marketDataService.js';
import { DEMO_ASSETS } from '../../data/demoAssets.js';
import { formatINR } from '../../utils/formatCurrency.js';

const TICKER_SYMBOLS = [
  '^NSEI',
  '^BSESN',
  '^IXIC',
  'INR=X',
  'GC=F',
  'RELIANCE.NS',
  'TCS.NS',
  'HDFCBANK.NS',
];

const THEME_MAP = {
  '^NSEI': { bg: '#3478CC', text: '#FFFFFF', label: 'N50', name: 'NIFTY 50' },
  '^BSESN': { bg: '#7C5ABF', text: '#FFFFFF', label: 'SNX', name: 'SENSEX' },
  '^IXIC': { bg: '#2563EB', text: '#FFFFFF', label: 'NSQ', name: 'NASDAQ' },
  'INR=X': { bg: '#D97706', text: '#FFFFFF', label: '$/₹', name: 'USD/INR' },
  'GC=F': { bg: '#F59E0B', text: '#181A24', label: 'GLD', name: 'Gold' },
  'RELIANCE.NS': { bg: '#181A24', text: '#FFFFFF', label: 'RL', name: 'Reliance' },
  'TCS.NS': { bg: '#0F172A', text: '#FFFFFF', label: 'TC', name: 'TCS' },
  'HDFCBANK.NS': { bg: '#DC2626', text: '#FFFFFF', label: 'HB', name: 'HDFC Bank' },
};

function formatPrice(symbol, price, currency) {
  if (currency === 'USD' || symbol === '^IXIC' || symbol === 'GC=F') {
    return `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (symbol === 'INR=X') {
    return `₹${Number(price).toFixed(2)}`;
  }
  return formatINR(price, true);
}

export default function MarketTicker() {
  const [items, setItems] = useState([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchQuotes() {
      try {
        const res = await getLiveQuotes(TICKER_SYMBOLS);
        if (mounted && res && res.quotes && res.quotes.length > 0) {
          const parsed = res.quotes.map((q) => {
            const meta = THEME_MAP[q.symbol] || {
              bg: '#181A24',
              text: '#FFFFFF',
              label: q.symbol.slice(0, 2),
              name: q.name || q.symbol,
            };
            const pct = q.change_pct !== null && q.change_pct !== undefined ? q.change_pct : 0;
            return {
              symbol: q.symbol,
              displayName: meta.name,
              theme: meta,
              price: q.last_price,
              currency: q.currency,
              pct,
              isPositive: pct >= 0,
            };
          });
          setItems(parsed);
          setIsLive(true);
          return;
        }
      } catch (err) {
        // Fallback gracefully to demo assets if backend is warming up
      }

      if (mounted) {
        const fallback = DEMO_ASSETS.slice(0, 7).map((asset) => {
          const diff = asset.currentPrice - (asset.previousClose || asset.currentPrice);
          const pct = asset.previousClose ? (diff / asset.previousClose) * 100 : 0.85;
          return {
            symbol: asset.symbol,
            displayName: asset.symbol,
            theme: { bg: '#181A24', text: '#FFFFFF', label: asset.symbol.slice(0, 2) },
            price: asset.currentPrice,
            currency: 'INR',
            pct,
            isPositive: pct >= 0,
          };
        });
        setItems(fallback);
      }
    }

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000); // 60s live quote polling

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full flex items-center py-1 overflow-x-auto no-scrollbar">
      {/* Title & Live Status Indicator */}
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6B7890] flex-shrink-0 pr-3 select-none">
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#27AE60] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#27AE60]" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F0B74B]" />
            )}
          </span>
          <span className="text-[#181A24] font-bold">{isLive ? 'Live Markets:' : 'Top Movers:'}</span>
        </span>
      </div>

      {/* Ticker items */}
      <div className="flex items-center flex-nowrap">
        {items.map((item, idx) => (
          <React.Fragment key={item.symbol}>
            <div className="flex items-center gap-2 flex-shrink-0 px-2 group cursor-pointer hover:opacity-85 transition-opacity">
              {/* Monogram circle */}
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-extrabold shadow-2xs flex-shrink-0"
                style={{ backgroundColor: item.theme.bg, color: item.theme.text }}
              >
                {item.theme.label}
              </div>

              {/* Symbol & Price & Change */}
              <div className="flex items-center gap-1.5 text-[11.5px] whitespace-nowrap">
                <span className="font-bold text-[#181A24] tracking-tight">{item.displayName}</span>
                <span className="text-[#7B8290] font-medium">
                  {formatPrice(item.symbol, item.price, item.currency)}
                </span>
                <span
                  className={`flex items-center font-semibold text-[10.5px] ${
                    item.isPositive ? 'text-[#27AE60]' : 'text-[#F36F69]'
                  }`}
                >
                  {item.isPositive ? '▲' : '▼'} {item.isPositive ? '+' : ''}
                  {item.pct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Vertical separator */}
            {idx < items.length - 1 && (
              <div className="w-px h-3.5 bg-[#E2E6EE] mx-2 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
