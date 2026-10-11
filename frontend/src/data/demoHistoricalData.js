// demoHistoricalData.js — Simulated historical price data for demo purposes
// All values are deterministically generated demo data. Not real market prices.
// Trading assumption: 252 days/year.

import { addDays, format, subDays } from 'date-fns';

/**
 * Seeded pseudo-random number generator (Mulberry32)
 */
function createRng(seed) {
  let s = seed;
  return function() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate deterministic daily price series using GBM
 * @param {number} initialPrice
 * @param {number} mu - annualized drift
 * @param {number} sigma - annualized volatility
 * @param {number} days
 * @param {number} seed
 */
function generatePriceSeries(initialPrice, mu, sigma, days, seed) {
  const rng = createRng(seed);
  const dt = 1 / 252;
  const prices = [initialPrice];
  for (let i = 0; i < days; i++) {
    const u1 = rng();
    const u2 = rng();
    // Box-Muller transform for normal random variate
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    const drift = (mu - 0.5 * sigma * sigma) * dt;
    const diffusion = sigma * Math.sqrt(dt) * z;
    const nextPrice = prices[prices.length - 1] * Math.exp(drift + diffusion);
    prices.push(Math.max(nextPrice, 1)); // floor at 1
  }
  return prices;
}

// Generate 756 days (~3 years) of data ending today
const TOTAL_DAYS = 756;
const TODAY = new Date('2026-10-11');
const START_DATE = subDays(TODAY, TOTAL_DAYS);

// Generate dates array (only trading-ish days, simplified: exclude weekends)
function getTradingDates(startDate, days) {
  const dates = [];
  let current = new Date(startDate);
  let count = 0;
  while (count < days) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(format(current, 'yyyy-MM-dd'));
      count++;
    }
    current = addDays(current, 1);
  }
  return dates;
}

export const TRADING_DATES = getTradingDates(START_DATE, TOTAL_DAYS);

// Asset price series (seeded, deterministic)
const ASSET_SERIES = {
  RELIANCE:  generatePriceSeries(2200, 0.14, 0.224, TOTAL_DAYS - 1, 1001),
  HDFCBANK:  generatePriceSeries(1420, 0.11, 0.188, TOTAL_DAYS - 1, 1002),
  INFY:      generatePriceSeries(1560, 0.15, 0.244, TOTAL_DAYS - 1, 1003),
  TCS:       generatePriceSeries(3680, 0.13, 0.219, TOTAL_DAYS - 1, 1004),
  TATAMOTORS:generatePriceSeries(750,  0.22, 0.341, TOTAL_DAYS - 1, 1005),
  SUNPHARMA: generatePriceSeries(1510, 0.10, 0.182, TOTAL_DAYS - 1, 1006),
  GOLDBEES:  generatePriceSeries(48,   0.09, 0.131, TOTAL_DAYS - 1, 1007),
  WIPRO:     generatePriceSeries(480,  0.12, 0.232, TOTAL_DAYS - 1, 1008),
  HCLTECH:   generatePriceSeries(1650, 0.13, 0.228, TOTAL_DAYS - 1, 1009),
  ICICIBANK: generatePriceSeries(1080, 0.14, 0.199, TOTAL_DAYS - 1, 1010),
  NIFTY50:   generatePriceSeries(20200, 0.12, 0.163, TOTAL_DAYS - 1, 1011),
};

/**
 * Get historical price series for a symbol
 * @param {string} symbol
 * @returns {{ dates: string[], prices: number[] }}
 */
export function getHistoricalPrices(symbol) {
  const prices = ASSET_SERIES[symbol];
  if (!prices) return { dates: [], prices: [] };
  return {
    dates: TRADING_DATES.slice(0, prices.length),
    prices,
  };
}

/**
 * Get portfolio performance series given holdings and weights
 * @param {Array<{symbol: string, weight: number}>} holdings
 * @param {number} initialValue
 * @param {string} [startDate]
 * @param {string} [endDate]
 */
export function getPortfolioPerformance(holdings, initialValue = 1000000, startDate = null, endDate = null) {
  const validHoldings = holdings.filter((h) => ASSET_SERIES[h.symbol]);
  if (validHoldings.length === 0) return { dates: [], portfolioValues: [], benchmarkValues: [] };

  // Align on available dates
  let dates = TRADING_DATES;
  if (startDate) dates = dates.filter((d) => d >= startDate);
  if (endDate) dates = dates.filter((d) => d <= endDate);

  const startIdx = TRADING_DATES.indexOf(dates[0]);
  const endIdx = TRADING_DATES.indexOf(dates[dates.length - 1]);

  if (startIdx === -1 || endIdx === -1) return { dates: [], portfolioValues: [], benchmarkValues: [] };

  // Get price slices
  const priceSlices = validHoldings.map((h) => ({
    weight: h.weight,
    prices: ASSET_SERIES[h.symbol].slice(startIdx, endIdx + 1),
  }));

  const benchmarkPrices = ASSET_SERIES['NIFTY50'].slice(startIdx, endIdx + 1);
  const len = Math.min(...priceSlices.map((p) => p.prices.length), benchmarkPrices.length);

  const portfolioValues = [];
  const benchmarkValues = [];

  for (let i = 0; i < len; i++) {
    let portValue = 0;
    for (const { weight, prices } of priceSlices) {
      const ret = prices[i] / prices[0];
      portValue += weight * initialValue * ret;
    }
    portfolioValues.push(portValue);
    benchmarkValues.push(initialValue * (benchmarkPrices[i] / benchmarkPrices[0]));
  }

  return { dates: dates.slice(0, len), portfolioValues, benchmarkValues };
}

/**
 * Get date range presets
 */
export function getDateRange(preset) {
  const end = TRADING_DATES[TRADING_DATES.length - 1];
  const endDate = new Date(end);
  let startDate;

  switch (preset) {
    case '1D': startDate = format(subDays(endDate, 2), 'yyyy-MM-dd'); break;
    case '1W': startDate = format(subDays(endDate, 7), 'yyyy-MM-dd'); break;
    case '1M': startDate = format(subDays(endDate, 30), 'yyyy-MM-dd'); break;
    case '3M': startDate = format(subDays(endDate, 90), 'yyyy-MM-dd'); break;
    case '6M': startDate = format(subDays(endDate, 180), 'yyyy-MM-dd'); break;
    case '1Y': startDate = format(subDays(endDate, 365), 'yyyy-MM-dd'); break;
    default:   startDate = TRADING_DATES[0];
  }

  return { startDate, endDate: end };
}
