// MarketIntelligence.jsx — Financial market intelligence and sentiment analysis
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, Filter, Sparkles, AlertCircle,
  ExternalLink, Search, RefreshCw, BarChart2, ShieldCheck, Newspaper,
  Globe, Compass, Activity, ArrowUpRight, ArrowDownRight, Tag
} from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { DEMO_NEWS } from '../data/demoNews.js';
import Card from '../components/common/Card.jsx';
import Button from '../components/common/Button.jsx';
import { formatPercentSigned, formatPercentDirectSigned } from '../utils/formatPercent.js';

// Market benchmark quotes
const MARKET_INDICES = [
  { name: 'NIFTY 50', value: '25,285.35', change: 1.24, positive: true, note: 'All-Time High Range' },
  { name: 'S&P 500', value: '5,864.67', change: 0.62, positive: true, note: 'Tech Rally Continues' },
  { name: 'INDIA VIX', value: '13.42', change: -4.15, positive: true, note: 'Low Volatility Environment' },
  { name: 'US 10Y YIELD', value: '4.08%', change: 0.05, positive: false, note: 'Yields Firming Up' },
  { name: 'BRENT CRUDE', value: '$78.40', change: -1.82, positive: true, note: 'Supply Easing' },
  { name: 'GOLD (MCX)', value: '₹76,250', change: 0.45, positive: true, note: 'Safe-Haven Flow' },
];

// Sector performance data
const SECTOR_PERFORMANCE = [
  { sector: 'Automotive', return1D: 2.15, return1M: 5.4, sentiment: 'Bullish', risk: 'Low' },
  { sector: 'Banking & Financials', return1D: 1.48, return1M: 3.8, sentiment: 'Bullish', risk: 'Moderate' },
  { sector: 'Energy & Petrochemicals', return1D: 0.85, return1M: -1.2, sentiment: 'Neutral', risk: 'Moderate' },
  { sector: 'Pharmaceuticals', return1D: 0.32, return1M: 2.1, sentiment: 'Neutral', risk: 'Low' },
  { sector: 'Metals & Mining', return1D: -0.42, return1M: -3.5, sentiment: 'Bearish', risk: 'High' },
  { sector: 'Information Technology', return1D: -1.18, return1M: -4.8, sentiment: 'Bearish', risk: 'High' },
];

export default function MarketIntelligence() {
  const { portfolio } = usePortfolio();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState('ALL');
  const [filterMyHoldings, setFilterMyHoldings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Extract all tickers from user portfolio
  const userHoldingsSymbols = useMemo(() => {
    return new Set((portfolio.holdings || []).map((h) => h.symbol.toUpperCase()));
  }, [portfolio.holdings]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(DEMO_NEWS.map((n) => n.category).filter(Boolean));
    return ['ALL', ...Array.from(cats)];
  }, []);

  // Filtered news items
  const filteredNews = useMemo(() => {
    return DEMO_NEWS.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Sentiment filter
      if (selectedSentiment !== 'ALL' && item.sentiment.toLowerCase() !== selectedSentiment.toLowerCase()) {
        return false;
      }
      // My holdings filter
      if (filterMyHoldings) {
        const matchesHoldings = (item.relatedTickers || []).some((t) =>
          userHoldingsSymbols.has(t.toUpperCase())
        );
        if (!matchesHoldings) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.headline.toLowerCase().includes(q);
        const matchesSummary = item.summary.toLowerCase().includes(q);
        const matchesTicker = (item.relatedTickers || []).some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesSummary && !matchesTicker) return false;
      }
      return true;
    });
  }, [selectedCategory, selectedSentiment, filterMyHoldings, searchQuery, userHoldingsSymbols]);

  // Portfolio-specific insights
  const portfolioImpacts = useMemo(() => {
    const relevantNews = DEMO_NEWS.filter((n) =>
      (n.relatedTickers || []).some((t) => userHoldingsSymbols.has(t.toUpperCase()))
    );

    const positiveCount = relevantNews.filter((n) => n.sentiment === 'positive').length;
    const negativeCount = relevantNews.filter((n) => n.sentiment === 'negative').length;
    const neutralCount = relevantNews.filter((n) => n.sentiment === 'neutral').length;

    let overallImpact = 'Neutral';
    let impactColor = 'text-[#D99120]';
    let impactBg = 'bg-[#FEF8EA] border-[#D99120]/30';
    if (positiveCount > negativeCount) {
      overallImpact = 'Favorable Outlook';
      impactColor = 'text-[#27AE60]';
      impactBg = 'bg-[#EAF8F0] border-[#27AE60]/30';
    } else if (negativeCount > positiveCount) {
      overallImpact = 'Cautionary Exposure';
      impactColor = 'text-[#F36F69]';
      impactBg = 'bg-[#FDF0F0] border-[#F36F69]/30';
    }

    return {
      count: relevantNews.length,
      positiveCount,
      negativeCount,
      neutralCount,
      overallImpact,
      impactColor,
      impactBg,
      items: relevantNews,
    };
  }, [userHoldingsSymbols]);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-8 animate-fade-in">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#181A24] tracking-tight">Market Intelligence & Sentiment</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF8F0] text-[#27AE60] border border-[#27AE60]/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" />
              Live Sentiment
            </span>
          </div>
          <p className="text-[#7B8290] text-xs sm:text-sm mt-0.5">
            Real-time financial news, market regimes, sector momentum, and AI-driven portfolio impact analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#E1E7EF] hover:bg-[#F4F5F8] text-[#181A24] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#3478CC] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* ── Market Indices Ribbon ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MARKET_INDICES.map((idx) => (
          <div
            key={idx.name}
            className="p-3 rounded-2xl bg-white border border-[#ECEFF4] hover:border-[#3478CC]/30 transition-all shadow-2xs"
          >
            <div className="text-[11px] font-semibold text-[#7B8290] uppercase tracking-wider">{idx.name}</div>
            <div className="text-base font-extrabold text-[#181A24] mt-0.5">{idx.value}</div>
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs font-bold flex items-center ${
                  idx.change >= 0 ? 'text-[#27AE60]' : 'text-[#F36F69]'
                }`}
              >
                {idx.change >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                )}
                {formatPercentDirectSigned(idx.change)}
              </span>
              <span className="text-[10px] text-[#7B8290] truncate max-w-[70px] font-medium">{idx.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Macro Regime & AI Portfolio Impact Summary ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Fear & Greed Index Gauge */}
        <div className="bg-white rounded-[20px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#3478CC]" />
                <h3 className="text-sm font-bold text-[#181A24]">Market Sentiment Regime</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF8F0] text-[#27AE60] border border-[#27AE60]/20 font-bold">
                Greed
              </span>
            </div>

            <div className="mt-4 text-center">
              <div className="text-4xl font-extrabold text-[#181A24] tracking-tight">68</div>
              <div className="text-xs text-[#7B8290] mt-0.5 font-medium">Fear & Greed Index (0–100)</div>

              {/* Visual meter bar */}
              <div className="w-full bg-[#F4F5F8] h-3 rounded-full mt-3.5 overflow-hidden relative p-0.5 flex">
                <div className="h-full rounded-full bg-gradient-to-r from-[#F36F69] via-[#F0B74B] to-[#27AE60] w-full opacity-85" />
                <div
                  className="absolute top-0 bottom-0 w-2 bg-[#181A24] shadow-md rounded-full border border-white"
                  style={{ left: '68%' }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-[#7B8290] mt-1.5 font-semibold">
                <span>Extreme Fear (0)</span>
                <span>Neutral (50)</span>
                <span>Extreme Greed (100)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0F2F6] text-xs text-[#7B8290] space-y-1.5">
            <div className="flex justify-between">
              <span>Previous Close</span>
              <span className="text-[#181A24] font-bold">65 (Greed)</span>
            </div>
            <div className="flex justify-between">
              <span>1 Month Ago</span>
              <span className="text-[#181A24] font-bold">52 (Neutral)</span>
            </div>
            <div className="flex justify-between">
              <span>Primary Driver</span>
              <span className="text-[#27AE60] font-bold">Institutional Inflows & Low VIX</span>
            </div>
          </div>
        </div>

        {/* AI Portfolio Impact Diagnosis */}
        <div className="bg-white rounded-[20px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)] lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#3478CC]" />
                <h3 className="text-sm font-bold text-[#181A24]">AI Portfolio Sentiment Impact</h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${portfolioImpacts.impactBg} ${portfolioImpacts.impactColor}`}>
                {portfolioImpacts.overallImpact}
              </span>
            </div>

            <p className="text-xs text-[#181A24] mt-2.5 leading-relaxed font-medium">
              Based on news scanning across your <strong className="text-[#3478CC]">{portfolio.holdings?.length || 0} active holdings</strong>,
              we detected <strong className="text-[#181A24] font-bold">{portfolioImpacts.count} directly relevant news events</strong> over the last 72 hours.
            </p>

            {/* Quick Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-3.5">
              <div className="p-3 rounded-xl bg-[#EAF8F0] border border-[#27AE60]/20">
                <div className="text-[11px] font-bold text-[#27AE60]">Bullish Catalysts</div>
                <div className="text-xl font-extrabold text-[#181A24] mt-0.5">{portfolioImpacts.positiveCount}</div>
                <div className="text-[10px] text-[#7B8290] mt-0.5">Automotive, Banking, CapEx</div>
              </div>
              <div className="p-3 rounded-xl bg-[#FDF0F0] border border-[#F36F69]/20">
                <div className="text-[11px] font-bold text-[#F36F69]">Headwinds / Risks</div>
                <div className="text-xl font-extrabold text-[#181A24] mt-0.5">{portfolioImpacts.negativeCount}</div>
                <div className="text-[10px] text-[#7B8290] mt-0.5">IT Discretionary Spend</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F4F5F8] border border-[#E5E7EB]">
                <div className="text-[11px] font-bold text-[#7B8290]">Neutral Events</div>
                <div className="text-xl font-extrabold text-[#181A24] mt-0.5">{portfolioImpacts.neutralCount}</div>
                <div className="text-[10px] text-[#7B8290] mt-0.5">RBI Rate Hold (Priced in)</div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-[#EAF2FF] border border-[#3478CC]/20 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#3478CC] shrink-0 mt-0.5" />
            <p className="text-xs text-[#17365A] leading-relaxed">
              <strong>Risk Recommendation:</strong> Indian banking and auto exposure remain well-supported by domestic credit growth and festive demand. Keep stop-losses monitored on Tech exporter allocations (TCS, INFY) until US discretionary budgets clarify.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sector Momentum Radar ─────────────────────────────── */}
      <div className="bg-white rounded-[20px] p-5 border border-[#ECEFF4] shadow-[0_2px_8px_rgba(8,11,71,0.03)]">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3478CC]" />
            <h3 className="text-sm font-bold text-[#181A24]">Sector Momentum & Volatility Radar</h3>
          </div>
          <span className="text-xs text-[#7B8290] font-medium">Updated today</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTOR_PERFORMANCE.map((sec) => (
            <div
              key={sec.sector}
              className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#ECEFF4] hover:border-[#3478CC]/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#181A24]">{sec.sector}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    sec.sentiment === 'Bullish'
                      ? 'bg-[#EAF8F0] text-[#27AE60] border border-[#27AE60]/30'
                      : sec.sentiment === 'Bearish'
                      ? 'bg-[#FDF0F0] text-[#F36F69] border border-[#F36F69]/30'
                      : 'bg-[#FEF8EA] text-[#D99120] border border-[#D99120]/30'
                  }`}
                >
                  {sec.sentiment}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#7B8290] block font-medium">1-Day Change</span>
                  <span
                    className={`font-bold ${
                      sec.return1D >= 0 ? 'text-[#27AE60]' : 'text-[#F36F69]'
                    }`}
                  >
                    {formatPercentDirectSigned(sec.return1D)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7B8290] block font-medium">1-Month Momentum</span>
                  <span
                    className={`font-bold ${
                      sec.return1M >= 0 ? 'text-[#27AE60]' : 'text-[#F36F69]'
                    }`}
                  >
                    {formatPercentDirectSigned(sec.return1M)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#7B8290] block font-medium">Risk Tier</span>
                  <span className="text-[#181A24] font-bold">{sec.risk}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Intelligence News Feed Header & Controls ──────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[#3478CC]" />
            <h2 className="text-base font-bold text-[#181A24]">Live News & Intelligence Wire</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F4F5F8] text-[#7B8290] font-semibold">
              {filteredNews.length} articles
            </span>
          </div>

          {/* Toggle for My Holdings only */}
          <button
            onClick={() => setFilterMyHoldings((prev) => !prev)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              filterMyHoldings
                ? 'bg-[#EAF2FF] text-[#3478CC] border-[#3478CC]/40 shadow-xs'
                : 'bg-white text-[#7B8290] border-[#E1E7EF] hover:text-[#181A24] hover:bg-[#F4F5F8]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Only My Portfolio Holdings</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-[#7B8290] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search news, tickers (e.g. RELIANCE, TCS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#E1E7EF] text-[#181A24] text-xs placeholder:text-[#7B8290] focus:outline-none focus:border-[#3478CC]"
            />
          </div>

          {/* Category Select */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E1E7EF] text-[#181A24] text-xs focus:outline-none focus:border-[#3478CC]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          {/* Sentiment Select */}
          <div>
            <select
              value={selectedSentiment}
              onChange={(e) => setSelectedSentiment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-[#E1E7EF] text-[#181A24] text-xs focus:outline-none focus:border-[#3478CC]"
            >
              <option value="ALL">Sentiment: All</option>
              <option value="positive">Bullish / Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Bearish / Negative</option>
            </select>
          </div>
        </div>

        {/* News Feed Stream */}
        <div className="space-y-3 pt-1">
          {filteredNews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#ECEFF4] p-12 text-center shadow-2xs">
              <Globe className="w-8 h-8 text-[#A0AEC0] mx-auto mb-2" />
              <div className="text-sm font-bold text-[#181A24]">No news articles match your filter</div>
              <p className="text-xs text-[#7B8290] mt-1 max-w-sm mx-auto">
                Try clearing search terms or unticking "Only My Portfolio Holdings" to view broader market updates.
              </p>
              <button
                className="mt-4 px-4 py-2 rounded-lg bg-[#3478CC] text-white text-xs font-semibold hover:bg-[#2968b8] transition-colors"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedSentiment('ALL');
                  setFilterMyHoldings(false);
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            filteredNews.map((article, index) => {
              const hasUserTicker = (article.relatedTickers || []).some((t) =>
                userHoldingsSymbols.has(t.toUpperCase())
              );

              return (
                <motion.div
                  key={article.id || index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <div className="bg-white rounded-2xl border border-[#ECEFF4] p-4 sm:p-5 hover:border-[#3478CC]/30 hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Sentiment Tag */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              article.sentiment === 'positive'
                                ? 'bg-[#EAF8F0] text-[#27AE60] border-[#27AE60]/30'
                                : article.sentiment === 'negative'
                                ? 'bg-[#FDF0F0] text-[#F36F69] border-[#F36F69]/30'
                                : 'bg-[#F4F5F8] text-[#7B8290] border-[#E1E7EF]'
                            }`}
                          >
                            {article.sentiment.toUpperCase()}
                          </span>

                          {/* Category */}
                          {article.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F4F5F8] text-[#7B8290] border border-[#E1E7EF]">
                              {article.category}
                            </span>
                          )}

                          {/* Holding match badge */}
                          {hasUserTicker && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF2FF] text-[#3478CC] border border-[#3478CC]/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Portfolio Impact
                            </span>
                          )}

                          <span className="text-[11px] text-[#7B8290] font-medium">
                            {article.publisher} &bull;{' '}
                            {new Date(article.publishedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm sm:text-base font-bold text-[#181A24] group-hover:text-[#3478CC] transition-colors leading-snug">
                          {article.headline}
                        </h4>

                        {/* Summary */}
                        <p className="text-xs text-[#7B8290] leading-relaxed">
                          {article.summary}
                        </p>

                        {/* Related Tickers */}
                        {article.relatedTickers && article.relatedTickers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-[#7B8290] font-medium">Related Assets:</span>
                            {article.relatedTickers.map((t) => {
                              const isOwned = userHoldingsSymbols.has(t.toUpperCase());
                              return (
                                <span
                                  key={t}
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                    isOwned
                                      ? 'bg-[#EAF2FF] text-[#3478CC] border border-[#3478CC]/30 font-bold'
                                      : 'bg-[#F4F5F8] text-[#7B8290] border border-[#E1E7EF]'
                                  }`}
                                >
                                  {t} {isOwned && '✓'}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div className="sm:self-center shrink-0">
                        <a
                          href={article.url || '#'}
                          onClick={(e) => {
                            if (article.url === '#') e.preventDefault();
                          }}
                          className="inline-flex items-center gap-1 text-xs text-[#3478CC] hover:underline font-semibold p-1.5 rounded-lg transition-colors"
                        >
                          Read Story
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
