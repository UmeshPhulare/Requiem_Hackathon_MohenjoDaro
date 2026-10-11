// Overview.jsx — Redesigned Overview Dashboard matching Reference Image 1
import React from 'react';
import PortfolioValueCard from '../components/dashboard/PortfolioValueCard.jsx';
import CircularReturnsCard from '../components/dashboard/CircularReturnsCard.jsx';
import PortfolioDistributionCard from '../components/dashboard/PortfolioDistributionCard.jsx';
import MyAssetsCard from '../components/dashboard/MyAssetsCard.jsx';
import MarketInsightCard from '../components/dashboard/MarketInsightCard.jsx';

export default function Overview() {
  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      {/* ── Row 1: Two Primary Analytics Cards ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <PortfolioValueCard />
        </div>
        <div className="lg:col-span-4 flex flex-col">
          <CircularReturnsCard />
        </div>
      </div>

      {/* ── Row 2: Three Compact Cards ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div className="flex flex-col">
          <PortfolioDistributionCard />
        </div>
        <div className="flex flex-col">
          <MyAssetsCard />
        </div>
        <div className="flex flex-col">
          <MarketInsightCard />
        </div>
      </div>
    </div>
  );
}
