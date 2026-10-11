// financialMetrics.js — Core financial calculations
// All calculations use 252 trading days per year assumption.

/**
 * Calculate daily returns from a price series
 * @param {number[]} prices
 * @returns {number[]}
 */
export function dailyReturns(prices) {
  if (!prices || prices.length < 2) return [];
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

/**
 * Calculate mean of an array
 */
export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Calculate variance
 */
export function variance(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / (arr.length - 1);
}

/**
 * Standard deviation
 */
export function stdDev(arr) {
  return Math.sqrt(variance(arr));
}

/**
 * Annualized volatility from daily returns
 * Assumption: 252 trading days/year
 * @param {number[]} dailyRets
 * @returns {number} annualized volatility as decimal (e.g. 0.18 = 18%)
 */
export function annualizedVolatility(dailyRets) {
  if (!dailyRets || dailyRets.length < 2) return 0;
  return stdDev(dailyRets) * Math.sqrt(252);
}

/**
 * Annualized return from daily returns
 * @param {number[]} dailyRets
 * @returns {number} annualized return as decimal
 */
export function annualizedReturn(dailyRets) {
  if (!dailyRets || dailyRets.length < 2) return 0;
  const totalReturn = dailyRets.reduce((acc, r) => acc * (1 + r), 1) - 1;
  const years = dailyRets.length / 252;
  if (years <= 0) return 0;
  return Math.pow(1 + totalReturn, 1 / years) - 1;
}

/**
 * Maximum drawdown from a cumulative value series
 * @param {number[]} values - portfolio values over time
 * @returns {number} max drawdown as negative decimal (e.g. -0.15 = -15%)
 */
export function maxDrawdown(values) {
  if (!values || values.length < 2) return 0;
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD;
}

/**
 * Sharpe ratio
 * @param {number[]} dailyRets
 * @param {number} [riskFreeRate=0.065] — Indian risk-free rate approximation (6.5% annual)
 * @returns {number}
 */
export function sharpeRatio(dailyRets, riskFreeRate = 0.065) {
  if (!dailyRets || dailyRets.length < 2) return 0;
  const annRet = annualizedReturn(dailyRets);
  const annVol = annualizedVolatility(dailyRets);
  if (annVol === 0) return 0;
  return (annRet - riskFreeRate) / annVol;
}

/**
 * Pearson correlation between two arrays
 */
export function correlation(a, b) {
  if (!a || !b || a.length !== b.length || a.length < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0, da2 = 0, db2 = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i] - ma;
    const db = b[i] - mb;
    num += da * db;
    da2 += da * da;
    db2 += db * db;
  }
  const denom = Math.sqrt(da2 * db2);
  if (denom === 0) return 0;
  return num / denom;
}

/**
 * Correlation matrix for multiple assets
 * @param {Object.<string, number[]>} returnsMap — { symbol: dailyReturns[] }
 * @returns {{ symbols: string[], matrix: number[][] }}
 */
export function correlationMatrix(returnsMap) {
  const symbols = Object.keys(returnsMap);
  const matrix = symbols.map((s1) =>
    symbols.map((s2) => {
      if (s1 === s2) return 1;
      return correlation(returnsMap[s1], returnsMap[s2]);
    })
  );
  return { symbols, matrix };
}

/**
 * Portfolio variance given weights and covariance info
 * Simplified: use weighted sum of individual variances × correlation
 */
export function portfolioVariance(weights, vols, corrMatrix) {
  const n = weights.length;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * vols[i] * vols[j] * corrMatrix[i][j];
    }
  }
  return variance;
}

/**
 * Portfolio volatility (annualized)
 */
export function portfolioVolatility(weights, vols, corrMatrix) {
  return Math.sqrt(portfolioVariance(weights, vols, corrMatrix));
}

/**
 * Component risk contribution (simplified marginal contribution × weight)
 * @param {number[]} weights
 * @param {number[]} vols
 * @param {number[][]} corrMatrix
 * @returns {number[]} risk contributions that sum to portfolio variance
 */
export function riskContributions(weights, vols, corrMatrix) {
  const n = weights.length;
  const portVar = portfolioVariance(weights, vols, corrMatrix);
  if (portVar === 0) return weights.map(() => 0);

  return weights.map((wi, i) => {
    let covContrib = 0;
    for (let j = 0; j < n; j++) {
      covContrib += weights[j] * vols[i] * vols[j] * corrMatrix[i][j];
    }
    return (wi * covContrib) / portVar;
  });
}

/**
 * Value at Risk (historical simulation, 95% confidence)
 * @param {number[]} dailyRets
 * @param {number} portfolioValue
 * @returns {number} VaR as a positive loss amount
 */
export function valueAtRisk95(dailyRets, portfolioValue) {
  if (!dailyRets || dailyRets.length < 20) return 0;
  const sorted = [...dailyRets].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.05);
  return Math.abs(sorted[idx] * portfolioValue);
}

/**
 * Weighted portfolio return from holdings
 * @param {Array<{weight: number, return: number}>} holdings
 * @returns {number}
 */
export function weightedReturn(holdings) {
  return holdings.reduce((acc, h) => acc + h.weight * h.return, 0);
}

/**
 * Generate cumulative growth series from daily returns
 * @param {number[]} dailyRets
 * @param {number} initialValue
 * @returns {number[]}
 */
export function cumulativeGrowth(dailyRets, initialValue = 10000) {
  const values = [initialValue];
  for (const r of dailyRets) {
    values.push(values[values.length - 1] * (1 + r));
  }
  return values;
}

/**
 * Calculate Herfindahl-Hirschman Index (concentration measure)
 * @param {number[]} weights
 * @returns {number} 0=perfect diversification, 1=full concentration
 */
export function herfindahlIndex(weights) {
  return weights.reduce((s, w) => s + w * w, 0);
}

/**
 * Effective number of holdings (1/HHI)
 */
export function effectiveHoldings(weights) {
  const hhi = herfindahlIndex(weights);
  if (hhi === 0) return weights.length;
  return 1 / hhi;
}
