// Home.jsx — RiskLens Home / Landing Page with Get Started CTA to Overview
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, TrendingUp, Sliders, Zap,
  BarChart2, Newspaper, ChevronRight, CheckCircle2,
  Lock, Sparkles, Layers, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { formatINR } from '../utils/formatCurrency.js';

const STATS = [
  { label: 'VaR 95% Confidence', value: '99.8%', note: 'Deterministic Accuracy' },
  { label: 'Simulations / Second', value: '10,000+', note: 'Monte Carlo Stress Engine' },
  { label: 'Asset Classes Covered', value: 'Multi-Asset', note: 'Equity, Debt, Gold & Benchmarks' },
  { label: 'Real-Time News Analysis', value: '< 1.2s', note: 'AI Sentiment Parsing' },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Value-at-Risk & Tail Risk',
    description: 'Calculate 95% and 99% Parametric & Historical VaR with Expected Shortfall (CVaR) to safeguard capital before tail events strike.',
    route: '/risk',
    color: '#3478CC',
    bg: '#EAF2FF',
  },
  {
    icon: Sliders,
    title: 'Efficient Frontier Optimization',
    description: 'Mathematically rebalance weights using modern portfolio theory, maximizing your Sharpe ratio while minimizing correlated downside.',
    route: '/optimizer',
    color: '#27AE60',
    bg: '#EAF8F0',
  },
  {
    icon: Zap,
    title: 'Stress-Test Scenarios',
    description: 'Simulate how your holdings would withstand historical market crashes like the 2008 Lehman collapse, 2020 COVID shock, or sudden rate hikes.',
    route: '/scenarios',
    color: '#F0B74B',
    bg: '#FEF8EA',
  },
  {
    icon: Newspaper,
    title: 'Market Intelligence & Sentiment',
    description: 'Synthesize breaking financial news, sector regime shifts, and monetary policy impacts correlated directly to your holdings.',
    route: '/intelligence',
    color: '#A65DF0',
    bg: '#F5ECFE',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="w-full flex flex-col gap-6 py-2 animate-fade-in select-none">
      {/* ── Hero Section ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#080B47] via-[#0E1562] to-[#172D4A] p-6 sm:p-10 text-white shadow-xl">
        {/* Subtle background glow circle */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#5B61FF]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-20 w-64 h-64 rounded-full bg-[#3478CC]/20 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#A6C8FF] text-[12px] font-semibold mb-4">
            <Sparkles size={13} className="text-[#F0B74B]" />
            <span>Institutional-Grade Risk Intelligence</span>
          </div>

          <h1 className="text-[28px] sm:text-[38px] md:text-[44px] font-extrabold tracking-tight leading-[1.15] text-white">
            Predict Investment Risk. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#60A5FA] to-[#A78BFA] bg-clip-text text-transparent">
              Protect Your Capital.
            </span>
          </h1>

          <p className="mt-3 text-[14px] sm:text-[15px] text-[#C1CAD6] leading-relaxed max-w-xl">
            RiskLens provides predictive Value-at-Risk modeling, Monte Carlo tail risk forecasting,
            and portfolio optimization—empowering you to navigate market volatility with quantitative clarity.
          </p>

          {/* Action CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(isAuthenticated ? '/overview' : '/register')}
              className="px-6 py-3 rounded-full bg-[#3478CC] hover:bg-[#2968b8] text-white font-bold text-[14px] shadow-lg shadow-[#3478CC]/40 hover:shadow-[#3478CC]/60 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started'}</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>

            <button
              onClick={() => navigate(isAuthenticated ? '/portfolio' : '/login')}
              className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-[14px] border border-white/20 backdrop-blur-sm transition-all cursor-pointer"
            >
              {isAuthenticated ? 'View Portfolio' : 'Sign In'}
            </button>
          </div>
        </div>

        {/* Live Cockpit Preview Teaser Card inside Hero */}
        <div className="mt-8 lg:mt-0 lg:absolute lg:right-8 lg:top-1/2 lg:-translate-y-1/2 w-full lg:w-[360px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-[20px] p-4 text-white shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#3478CC] flex items-center justify-center font-bold text-[10px]">
                RL
              </div>
              <span className="text-[13px] font-bold">Portfolio Cockpit</span>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#27AE60]/20 text-[#4ADE80] border border-[#27AE60]/30">
              Low Risk
            </span>
          </div>

          <div className="py-3">
            <span className="text-[11px] text-[#A0AEC0]">Simulated Portfolio Value</span>
            <div className="text-[24px] font-extrabold tracking-tight mt-0.5">
              ₹10,99,550
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11.5px]">
              <span className="text-[#4ADE80] font-semibold">▲ +0.66% today</span>
              <span className="text-[#CBD5E1]">· Vol: 9.6% ann.</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <button
              onClick={() => navigate('/overview')}
              className="w-full py-2 rounded-xl bg-white text-[#080B47] hover:bg-white/90 font-bold text-[12.5px] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Launch Live Dashboard</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Institutional Stats Bar ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-[18px] p-4 border border-[#ECEFF4] shadow-[0_2px_6px_rgba(8,11,71,0.02)]"
          >
            <p className="text-[11px] font-semibold text-[#7B8290] uppercase tracking-wider">{stat.label}</p>
            <p className="text-[22px] font-extrabold text-[#181A24] mt-1 tracking-tight">{stat.value}</p>
            <p className="text-[11.5px] font-medium text-[#3478CC] mt-0.5">{stat.note}</p>
          </div>
        ))}
      </div>

      {/* ── Core Capability Pillars ─────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-[18px] font-bold text-[#181A24]">Quantitative Risk Pillars</h2>
            <p className="text-[12.5px] text-[#7B8290]">Explore the core quantitative toolsets available in RiskLens</p>
          </div>
          <button
            onClick={() => navigate('/overview')}
            className="text-[12.5px] font-semibold text-[#3478CC] hover:underline flex items-center gap-1"
          >
            <span>View All Features</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                onClick={() => navigate(feat.route)}
                className="bg-white rounded-[20px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)] hover:shadow-[0_8px_20px_rgba(8,11,71,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: feat.bg, color: feat.color }}
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#181A24] group-hover:text-[#3478CC] transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-[12px] text-[#7B8290] mt-1.5 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F0F2F6] flex items-center justify-between text-[12px] font-semibold text-[#3478CC]">
                  <span>Explore Feature</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Call To Action Banner ────────────────────────── */}
      <div className="bg-white rounded-[22px] p-6 sm:p-8 border border-[#ECEFF4] shadow-[0_2px_10px_rgba(8,11,71,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-[18px] sm:text-[20px] font-bold text-[#181A24]">
            Ready to stress-test your portfolio?
          </h3>
          <p className="text-[13px] text-[#7B8290] mt-0.5">
            Launch the interactive overview dashboard to inspect your holdings, volatility distribution, and real-time P&L.
          </p>
        </div>

        <button
          onClick={() => navigate('/overview')}
          className="flex-shrink-0 px-6 py-3 rounded-full bg-[#080B47] hover:bg-[#111666] text-white font-bold text-[13.5px] shadow-md flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
