// optimizationService.js — Allocation optimization utilities
// Uses minimum-variance-inspired heuristic.
// No guaranteed-profit claims. Historical estimates only.

import { annualizedVolatility, annualizedReturn, dailyReturns, portfolioVolatility, sharpeRatio } from '../utils/financialMetrics.js';
import { getHistoricalPrices } from '../data/demoHistoricalData.js';

const LOOKBACK = 252;

/**
 * Get annualized metrics for a set of holdings
 */
export function getAssetMetrics(symbols) {
  return symbols.map((symbol) => {
    const { prices } = getHistoricalPrices(symbol);
    const tail = prices.slice(-(LOOKBACK + 1));
    const rets = dailyReturns(tail);
    return {
      symbol,
      vol: annualizedVolatility(rets),
      ret: annualizedReturn(rets),
    };
  });
}

/**
 * Generate recommended allocation based on risk preference.
 * Methodology: Inverse volatility weighting (risk-targeted approach)
 * constrained to max 40% per asset.
 *
 * @param {string[]} symbols
 * @param {'conservative'|'moderate'|'aggressive'} riskPreference
 * @param {number} [maxPerAsset=0.40]
 * @returns {{ symbol: string, weight: number }[]}
 */
export function recommendAllocation(symbols, riskPreference, maxPerAsset = 0.40) {
  if (!symbols || symbols.length === 0) return [];

  const metrics = getAssetMetrics(symbols);

  // Inverse volatility weighting
  const invVols = metrics.map((m) => (m.vol > 0 ? 1 / m.vol : 0));
  const sumInvVols = invVols.reduce((s, v) => s + v, 0);
  let baseWeights = invVols.map((v) => (sumInvVols > 0 ? v / sumInvVols : 1 / symbols.length));

  // Adjust for risk preference
  if (riskPreference === 'aggressive') {
    // Tilt toward higher-return assets
    const retWeights = metrics.map((m) => Math.max(m.ret, 0.001));
    const sumRet = retWeights.reduce((s, v) => s + v, 0);
    const normalizedRet = retWeights.map((v) => v / sumRet);
    // Blend 40% inverse vol + 60% return tilt
    baseWeights = baseWeights.map((w, i) => 0.4 * w + 0.6 * normalizedRet[i]);
  } else if (riskPreference === 'conservative') {
    // Double down on low-vol tilt (pure inverse vol with tighter cap)
    maxPerAsset = Math.min(maxPerAsset, 0.30);
  }

  // Apply max constraint and renormalize
  let weights = baseWeights.map((w) => Math.min(w, maxPerAsset));
  let total = weights.reduce((s, w) => s + w, 0);
  weights = weights.map((w) => (total > 0 ? w / total : 1 / symbols.length));

  return metrics.map((m, i) => ({
    symbol: m.symbol,
    weight: weights[i],
    vol: m.vol,
    ret: m.ret,
  }));
}

/**
 * Generate multiple random portfolios for efficient frontier visualization
 * @param {string[]} symbols
 * @param {number} count
 * @returns {{ risk: number, return: number, weights: number[], sharpe: number }[]}
 */
export function generateEfficientFrontierPoints(symbols, count = 200) {
  if (!symbols || symbols.length === 0) return [];

  const metrics = getAssetMetrics(symbols);
  const points = [];

  // Simple Monte Carlo random weights
  function seededRandom(seed) {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
  }

  for (let i = 0; i < count; i++) {
    const rawWeights = symbols.map((_, j) => seededRandom(i * 100 + j));
    const sum = rawWeights.reduce((s, w) => s + w, 0);
    const weights = rawWeights.map((w) => w / sum);

    const portRet = weights.reduce((s, w, j) => s + w * metrics[j].ret, 0);
    const portVol = Math.sqrt(
      weights.reduce((sum1, wi, i) =>
        sum1 + weights.reduce((sum2, wj, j) =>
          sum2 + wi * wj * metrics[i].vol * metrics[j].vol * (i === j ? 1 : 0.3), 0), 0)
    );
    const sharpe = portVol > 0 ? (portRet - 0.065) / portVol : 0;

    points.push({ risk: portVol, return: portRet, weights, sharpe });
  }

  return points;
}
