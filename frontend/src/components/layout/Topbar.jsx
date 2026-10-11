// Topbar.jsx — Global top navigation bar
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search, ChevronDown, RefreshCw, AlertTriangle, User } from 'lucide-react';
import { clsx } from 'clsx';

const PAGE_TITLES = {
  '/overview': 'Overview',
  '/portfolio': 'My Portfolio',
  '/builder': 'Portfolio Builder',
  '/risk': 'Risk Analysis',
  '/optimizer': 'Allocation Optimizer',
  '/backtesting': 'Historical Backtesting',
  '/scenarios': 'Scenario Simulator',
  '/intelligence': 'Market Intelligence',
  '/strategies': 'Strategy Comparison',
  '/reports': 'Reports',
};

function DemoBadge() {
  return (
    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
      <AlertTriangle size={11} />
      <span>Demo Data</span>
    </div>
  );
}

function DataFreshness() {
  return (
    <div className="flex items-center gap-1.5 text-[#6B7890] text-[12px]">
      <RefreshCw size={12} />
      <span>Simulated · Oct 11, 2026</span>
    </div>
  );
}

export default function Topbar({ sidebarCollapsed }) {
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const title = PAGE_TITLES[location.pathname] || 'RiskLens';

  return (
    <header
      className="fixed top-0 right-0 h-14 bg-white border-b border-[#E1E7EF] flex items-center px-5 gap-4 z-20 transition-all duration-250"
      style={{ left: sidebarCollapsed ? '60px' : '220px' }}
    >
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold text-[#172D4A] truncate">{title}</h1>
      </div>

      {/* Center section */}
      <div className="hidden md:flex items-center gap-4">
        <DataFreshness />
        <DemoBadge />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F7FB] transition-all relative"
          >
            <Bell size={17} className="text-[#6B7890]" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#3478CC] rounded-full" />
          </button>
          {showNotifs && (
            <div
              className="absolute right-0 top-10 w-72 bg-white rounded-xl border border-[#E1E7EF] shadow-xl p-3 z-50"
              style={{ boxShadow: '0 8px 24px rgba(23,45,74,0.12)' }}
            >
              <p className="text-[13px] font-semibold text-[#172D4A] mb-2">Notifications</p>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-[#EAF2FF] text-[12.5px] text-[#17365A]">
                  <p className="font-medium">Portfolio risk increased</p>
                  <p className="text-[#6B7890] mt-0.5">IT sector exposure rose to 38%</p>
                </div>
                <div className="p-2.5 rounded-lg hover:bg-[#F5F7FB] text-[12.5px] text-[#172D4A]">
                  <p className="font-medium">HDFCBANK earnings released</p>
                  <p className="text-[#6B7890] mt-0.5">Q2 FY27 net profit +16% YoY</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#F5F7FB] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-[#3478CC] flex items-center justify-center">
              <User size={13} color="white" />
            </div>
            <ChevronDown size={13} className="text-[#6B7890]" />
          </button>
          {showProfile && (
            <div
              className="absolute right-0 top-10 w-52 bg-white rounded-xl border border-[#E1E7EF] p-2 z-50"
              style={{ boxShadow: '0 8px 24px rgba(23,45,74,0.12)' }}
            >
              <div className="px-3 py-2 border-b border-[#E1E7EF] mb-1">
                <p className="text-[13px] font-semibold text-[#172D4A]">Demo User</p>
                <p className="text-[11.5px] text-[#6B7890]">demo@risklens.in</p>
              </div>
              {['Profile', 'Settings', 'Sign Out'].map((item) => (
                <button
                  key={item}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#172D4A] hover:bg-[#F5F7FB] rounded-lg transition-all"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showNotifs || showProfile) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowNotifs(false); setShowProfile(false); }}
        />
      )}
    </header>
  );
}
