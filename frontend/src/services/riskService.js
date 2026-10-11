// riskService.js — Heuristic risk classification and analysis
// Label: Rule-based heuristic classifier (not an ML model)
// Configuration is exposed so a future ML model can replace this module.

import {
  annualizedVolatility,
  annualizedReturn,
  maxDrawdown,
  sharpeRatio,
  dailyReturns,
  correlationMatrix,
  riskContributions,
  herfindahlIndex,
  effectiveHoldings,
  portfolioVolatility,
} from '../utils/financialMetrics.js';
import { getHistoricalPrices } from '../data/demoHistoricalData.js';

// ── Classification thresholds ─────────────────────────────────
// These are the observable thresholds for the heuristic classifier.
// Future: replace with trained model predictions.
export const RISK_THRESHOLDS = {
  low: { maxVol: 0.12, maxHHI: 0.15, maxDrawdown: -0.10 },
  medium: { maxVol: 0.22, maxHHI: 0.30, maxDrawdown: -0.20 },
  // above medium thresholds → High
};

/**
 * Classify portfolio risk using transparent heuristics.
 * @param {{ annualizedVol: number, maxDD: number, hhi: number }} metrics
 * @returns {{ category: 'Low'|'Medium'|'High', score: number, factors: string[] }}
 */
export function classifyRisk(metrics) {
  const { annualizedVol, maxDD, hhi } = metrics;
  const factors = [];
  let riskPoints = 0;

  // Volatility contribution
  if (annualizedVol >= RISK_THRESHOLDS.medium.maxVol) {
    riskPoints += 40;
    factors.push(`High annualized volatility (${(annualizedVol * 100).toFixed(1)}%)`);
  } else if (annualizedVol >= RISK_THRESHOLDS.low.maxVol) {
    riskPoints += 20;
    factors.push(`Moderate annualized volatility (${(annualizedVol * 100).toFixed(1)}%)`);
  }

  // Drawdown contribution
  if (maxDD <= RISK_THRESHOLDS.medium.maxDrawdown) {
    riskPoints += 35;
    factors.push(`Significant historical drawdown (${(maxDD * 100).toFixed(1)}%)`);
  } else if (maxDD <= RISK_THRESHOLDS.low.maxDrawdown) {
    riskPoints += 15;
    factors.push(`Moderate historical drawdown (${(maxDD * 100).toFixed(1)}%)`);
  }

  // Concentration contribution
  if (hhi >= RISK_THRESHOLDS.medium.maxHHI) {
    riskPoints += 25;
    factors.push(`High portfolio concentration (HHI: ${hhi.toFixed(3)})`);
  } else if (hhi >= RISK_THRESHOLDS.low.maxHHI) {
    riskPoints += 10;
    factors.push(`Moderate portfolio concentration (HHI: ${hhi.toFixed(3)})`);
  }

  let category;
  if (riskPoints >= 60) category = 'High';
  else if (riskPoints >= 25) category = 'Medium';
  else category = 'Low';

  return { category, score: riskPoints, factors };
}

/**
 * Analyze portfolio risk from holdings
 * @param {Array<{symbol: string, weight: number}>} holdings
 * @returns {object} Full risk analysis result
 */
export function analyzePortfolioRisk(holdings) {
  const validHoldings = holdings.filter(
    (h) => h.weight > 0 && getHistoricalPrices(h.symbol).prices.length > 0
  );

  if (validHoldings.length === 0) {
    return { error: 'No valid holdings with historical data.' };
  }

  // Get daily returns for each asset (1 year = last ~252 points)
  const returnsMap = {};
  const LOOKBACK = 252;
  for (const h of validHoldings) {
    const { prices } = getHistoricalPrices(h.symbol);
    const tail = prices.slice(-LOOKBACK - 1);
    returnsMap[h.symbol] = dailyReturns(tail);
  }

  // Portfolio-level daily returns (weighted sum)
  const lengths = Object.values(returnsMap).map((r) => r.length);
  const minLen = Math.min(...lengths);

  const portfolioRets = Array.from({ length: minLen }, (_, i) =>
    validHoldings.reduce((sum, h) => {
      const rets = returnsMap[h.symbol];
      return sum + h.weight * (rets[i] || 0);
    }, 0)
  );

  // Key metrics
  const annVol = annualizedVolatility(portfolioRets);
  const annRet = annualizedReturn(portfolioRets);
  const sharpe = sharpeRatio(portfolioRets);

  // Cumulative portfolio values for drawdown
  let cum = 100;
  const cumValues = portfolioRets.map((r) => (cum = cum * (1 + r)));
  const maxDD = maxDrawdown([100, ...cumValues]);

  // Concentration
  const weights = validHoldings.map((h) => h.weight);
  const hhi = herfindahlIndex(weights);
  const effHoldings = effectiveHoldings(weights);

  // Correlation matrix
  const { symbols, matrix } = correlationMatrix(returnsMap);

  // Individual asset vols
  const assetVols = validHoldings.map((h) => annualizedVolatility(returnsMap[h.symbol]));

  // Risk contributions
  const corrMatrixOrdered = validHoldings.map((h1) =>
    validHoldings.map((h2) => {
      const i1 = symbols.indexOf(h1.symbol);
      const i2 = symbols.indexOf(h2.symbol);
      return i1 >= 0 && i2 >= 0 ? matrix[i1][i2] : (h1.symbol === h2.symbol ? 1 : 0);
    })
  );

  const riskContribs = riskContributions(weights, assetVols, corrMatrixOrdered);

  const riskByAsset = validHoldings.map((h, i) => ({
    symbol: h.symbol,
    name: h.name || h.symbol,
    weight: h.weight,
    individualVol: assetVols[i],
    riskContribution: riskContribs[i],
  }));

  // Classification
  const classification = classifyRisk({ annualizedVol: annVol, maxDD, hhi });

  return {
    annualizedVol: annVol,
    annualizedReturn: annRet,
    maxDrawdown: maxDD,
    sharpeRatio: sharpe,
    hhi,
    effectiveHoldings: effHoldings,
    correlationSymbols: symbols,
    correlationMatrix: matrix,
    riskByAsset,
    classification,
    lookbackDays: minLen,
    methodology: 'Historical simulation — 252 trading days/year assumption. Heuristic risk classifier.',
  };
}
