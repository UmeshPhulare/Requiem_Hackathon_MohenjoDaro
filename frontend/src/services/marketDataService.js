// ============================================================
// RiskLens — Market Data & AI Intelligence Service
// Connects to FastAPI /api/market endpoints
// ============================================================

import api from './api.js';

/**
 * Fetch supported 12 Indian equity tickers.
 */
export async function getSupportedAssets() {
  return await api.get('/api/market/assets');
}

/**
 * Search assets by partial query.
 */
export async function searchAssets(query) {
  return await api.get(`/api/market/assets/search?q=${encodeURIComponent(query)}`);
}

/**
 * Fetch live market quotes for given symbols.
 * @param {string[]} symbols
 */
export async function getLiveQuotes(symbols) {
  const symStr = symbols.join(',');
  return await api.get(`/api/market/quotes?symbols=${encodeURIComponent(symStr)}`);
}

/**
 * Fetch AI-powered market intelligence & news sentiment (Finnhub + Gemini AI).
 * @param {string} [category='general']
 * @param {string[]} [symbols]
 * @param {number} [limit=20]
 */
export async function getMarketIntelligence(category = 'general', symbols = [], limit = 20) {
  let endpoint = `/api/market/intelligence?category=${encodeURIComponent(category)}&limit=${limit}`;
  if (symbols && symbols.length > 0) {
    endpoint += `&symbols=${encodeURIComponent(symbols.join(','))}`;
  }
  return await api.get(endpoint);
}

/**
 * Fetch high-level aggregated market sentiment summary.
 */
export async function getMarketSentimentSummary() {
  return await api.get('/api/market/intelligence/sentiment');
}
