import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Plus, Sparkles, LogIn, ArrowRight } from 'lucide-react';
import PortfolioValueCard from '../components/dashboard/PortfolioValueCard.jsx';
import CircularReturnsCard from '../components/dashboard/CircularReturnsCard.jsx';
import PortfolioDistributionCard from '../components/dashboard/PortfolioDistributionCard.jsx';
import MyAssetsCard from '../components/dashboard/MyAssetsCard.jsx';
import MarketInsightCard from '../components/dashboard/MarketInsightCard.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Overview() {
  const { portfolio, seedSamplePortfolio, isLoading } = usePortfolio();
  const { isAuthenticated, user } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const hasHoldings = portfolio.holdings && portfolio.holdings.length > 0;

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedSamplePortfolio();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      {/* ── Real Data Onboarding Banner (Zero Dummy Values) ── */}
      {!hasHoldings && (
        <div className="bg-gradient-to-r from-[#080B47] to-[#141B66] text-white rounded-[18px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(8,11,71,0.12)] border border-[#3478CC]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#3478CC]/30 border border-[#3478CC]/50 text-[#93C5FD] text-[11px] font-semibold">
                <Database size={11} className="text-[#38BDF8]" />
                {isAuthenticated ? 'MongoDB Atlas Live Account' : 'Guest Mode (No Dummy Data)'}
              </span>
              {isAuthenticated && (
                <span className="text-[11px] text-[#A0AEC0] font-medium">
                  {user?.name} · {user?.riskProfile?.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="text-[16px] sm:text-[17px] font-bold tracking-tight text-white">
              {isAuthenticated
                ? 'Your portfolio is clean — No dummy data is being displayed.'
                : 'Sign in to persist your institutional portfolio to MongoDB Atlas.'}
            </h2>
            <p className="text-[12px] sm:text-[12.5px] text-[#CBD5E1] max-w-2xl font-normal leading-relaxed">
              {isAuthenticated
                ? 'Add your actual holdings to calculate live predictive VaR, Sharpe ratio, and sector concentration, or load the institutional sample basket directly into your MongoDB account.'
                : 'All portfolio positions and risk metrics are linked to authenticated user accounts. Log in or create an account to start building.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap flex-shrink-0">
            {isAuthenticated ? (
              <>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3478CC] hover:bg-[#2B66B1] text-white text-[12px] font-bold shadow-sm transition-all"
                >
                  <Plus size={14} />
                  Add Position
                </Link>
                <button
                  onClick={handleSeed}
                  disabled={seeding || isLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} className="text-[#FBBF24]" />
                  {seeding ? 'Syncing to DB...' : 'Load Sample Data'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3478CC] hover:bg-[#2B66B1] text-white text-[12px] font-bold shadow-sm transition-all"
                >
                  <LogIn size={14} />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[12px] font-semibold transition-all"
                >
                  Register
                  <ArrowRight size={13} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}

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
