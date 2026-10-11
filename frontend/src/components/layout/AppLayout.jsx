// AppLayout.jsx — Global Shell with Navy Frame and Centered Canvas matching Reference Image 1
import React from 'react';
import DashboardHeader from './DashboardHeader.jsx';
import MarketTicker from './MarketTicker.jsx';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#080B47] p-2 sm:p-4 lg:p-5 flex justify-center items-start">
      {/* ── Main Dashboard Canvas ──────────────────────────────── */}
      <div className="w-full max-w-[1380px] bg-[#F4F5F8] rounded-[24px] sm:rounded-[28px] p-3.5 sm:p-4.5 lg:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.45)] border border-white/10 flex flex-col gap-2.5 transition-all">
        {/* Horizontal Navigation Header */}
        <DashboardHeader />

        {/* Compact Market Ticker Strip */}
        <MarketTicker />

        {/* Page Content */}
        <main className="w-full mt-0.5">
          {children}
        </main>
      </div>
    </div>
  );
}
