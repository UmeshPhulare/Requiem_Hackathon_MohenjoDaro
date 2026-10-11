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
    let impactColor = 'text-amber-400';
    let impactBg = 'bg-amber-500/10 border-amber-500/30';
    if (positiveCount > negativeCount) {
      overallImpact = 'Favorable Outlook';
      impactColor = 'text-emerald-400';
      impactBg = 'bg-emerald-500/10 border-emerald-500/30';
    } else if (negativeCount > positiveCount) {
      overallImpact = 'Cautionary Exposure';
      impactColor = 'text-rose-400';
      impactBg = 'bg-rose-500/10 border-rose-500/30';
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Market Intelligence & Sentiment</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sentiment
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Real-time financial news, market regimes, sector momentum, and AI-driven portfolio impact analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 text-xs text-slate-300 border-slate-700/60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh Feed
          </Button>
        </div>
      </div>

      {/* Market Indices Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MARKET_INDICES.map((idx) => (
          <div
            key={idx.name}
            className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all backdrop-blur-sm"
          >
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{idx.name}</div>
            <div className="text-base font-bold text-white mt-0.5">{idx.value}</div>
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs font-semibold flex items-center ${
                  idx.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {idx.change >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 mr-0.5" />
                )}
                {formatPercentDirectSigned(idx.change)}
              </span>
              <span className="text-[10px] text-slate-500 truncate max-w-[70px]">{idx.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Macro Regime & AI Portfolio Impact Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fear & Greed Index Gauge */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Market Sentiment Regime</h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Greed
              </span>
            </div>

            <div className="mt-5 text-center">
              <div className="text-4xl font-extrabold text-white tracking-tight">68</div>
              <div className="text-xs text-slate-400 mt-1">Fear & Greed Index (0–100)</div>

              {/* Visual meter bar */}
              <div className="w-full bg-slate-800/80 h-3 rounded-full mt-4 overflow-hidden relative p-0.5 flex">
                <div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 w-full opacity-80" />
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white shadow-lg rounded-full"
                  style={{ left: '68%' }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
                <span>Extreme Fear (0)</span>
                <span>Neutral (50)</span>
                <span>Extreme Greed (100)</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Previous Close</span>
              <span className="text-slate-300 font-medium">65 (Greed)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">1 Month Ago</span>
              <span className="text-slate-300 font-medium">52 (Neutral)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Primary Driver</span>
              <span className="text-emerald-400 font-medium">Institutional Inflows & Low VIX</span>
            </div>
          </div>
        </Card>

        {/* AI Portfolio Impact Diagnosis */}
        <Card className="p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">AI Portfolio Sentiment Impact</h3>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${portfolioImpacts.impactBg} ${portfolioImpacts.impactColor}`}>
                {portfolioImpacts.overallImpact}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              Based on news scanning across your <strong className="text-white">{portfolio.holdings?.length || 0} active holdings</strong>,
              we detected <strong className="text-cyan-400">{portfolioImpacts.count} directly relevant news events</strong> over the last 72 hours.
            </p>

            {/* Quick Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[11px] font-medium text-emerald-400">Bullish Catalysts</div>
                <div className="text-xl font-bold text-white mt-0.5">{portfolioImpacts.positiveCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Automotive, Banking, CapEx</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/20">
                <div className="text-[11px] font-medium text-rose-400">Headwinds / Risks</div>
                <div className="text-xl font-bold text-white mt-0.5">{portfolioImpacts.negativeCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">IT Discretionary Spend</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/60">
                <div className="text-[11px] font-medium text-slate-300">Neutral Events</div>
                <div className="text-xl font-bold text-white mt-0.5">{portfolioImpacts.neutralCount}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">RBI Rate Hold (Priced in)</div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/30 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs text-cyan-200/90 leading-relaxed">
              <strong>Risk Recommendation:</strong> Indian banking and auto exposure remain well-supported by domestic credit growth and festival demand. Keep stop-losses monitored on Tech exporter allocations (TCS, INFY) until US discretionary budgets clarify.
            </p>
          </div>
        </Card>
      </div>

      {/* Sector Momentum Radar */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Sector Momentum & Volatility Radar</h3>
          </div>
          <span className="text-xs text-slate-400">Updated today</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTOR_PERFORMANCE.map((sec) => (
            <div
              key={sec.sector}
              className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 hover:border-slate-700/80 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">{sec.sector}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    sec.sentiment === 'Bullish'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : sec.sentiment === 'Bearish'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {sec.sentiment}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">1-Day Change</span>
                  <span
                    className={`font-semibold ${
                      sec.return1D >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatPercentDirectSigned(sec.return1D)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">1-Month Momentum</span>
                  <span
                    className={`font-semibold ${
                      sec.return1M >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatPercentDirectSigned(sec.return1M)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Risk Tier</span>
                  <span className="text-slate-300 font-medium">{sec.risk}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Intelligence News Feed Header & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Live News & Intelligence Wire</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {filteredNews.length} articles
            </span>
          </div>

          {/* Toggle for My Holdings only */}
          <button
            onClick={() => setFilterMyHoldings((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border ${
              filterMyHoldings
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-900/40'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Only My Portfolio Holdings
          </button>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search news, tickers (e.g. RELIANCE, TCS), or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Category Select */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50"
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
              className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ALL">Sentiment: All</option>
              <option value="positive">Bullish / Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Bearish / Negative</option>
            </select>
          </div>
        </div>

        {/* News Feed Stream */}
        <div className="space-y-3">
          {filteredNews.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-300">No news articles match your filter</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try clearing search terms or unticking "Only My Portfolio Holdings" to view broader market updates.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedSentiment('ALL');
                  setFilterMyHoldings(false);
                }}
              >
                Reset All Filters
              </Button>
            </Card>
          ) : (
            filteredNews.map((article, index) => {
              const hasUserTicker = (article.relatedTickers || []).some((t) =>
                userHoldingsSymbols.has(t.toUpperCase())
              );

              return (
                <motion.div
                  key={article.id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                >
                  <Card className="p-4 sm:p-5 hover:border-slate-700/80 transition-all group">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Sentiment Tag */}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              article.sentiment === 'positive'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : article.sentiment === 'negative'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {article.sentiment.toUpperCase()}
                          </span>

                          {/* Category */}
                          {article.category && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/50">
                              {article.category}
                            </span>
                          )}

                          {/* Holding match badge */}
                          {hasUserTicker && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              Portfolio Impact
                            </span>
                          )}

                          <span className="text-[11px] text-slate-500">
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
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                          {article.headline}
                        </h4>

                        {/* Summary */}
                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                          {article.summary}
                        </p>

                        {/* Related Tickers */}
                        {article.relatedTickers && article.relatedTickers.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] text-slate-500">Related Assets:</span>
                            {article.relatedTickers.map((t) => {
                              const isOwned = userHoldingsSymbols.has(t.toUpperCase());
                              return (
                                <span
                                  key={t}
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                    isOwned
                                      ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 font-semibold'
                                      : 'bg-slate-800/60 text-slate-400 border border-slate-800'
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
                          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 p-2 rounded-lg hover:bg-slate-800/60 transition-colors"
                        >
                          Read Story
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
