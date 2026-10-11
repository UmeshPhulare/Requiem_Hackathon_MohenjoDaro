// demoPortfolio.js — Default demo portfolio for RiskLens
// All values are illustrative demo data, not real market prices.

export const DEMO_PORTFOLIO = {
  id: 'demo-portfolio-1',
  name: 'My Growth Portfolio',
  currency: 'INR',
  investedAmount: 1100000,
  lastUpdated: '2026-10-11T05:30:00Z',
  isDemo: true,
  holdings: [
    {
      id: 'h1',
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      sector: 'Energy & Petrochemicals',
      type: 'Equity',
      quantity: 80,
      avgBuyPrice: 2640.00,
      currentPrice: 2945.80,
      exchange: 'NSE',
    },
    {
      id: 'h2',
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      sector: 'Banking & Finance',
      type: 'Equity',
      quantity: 120,
      avgBuyPrice: 1580.00,
      currentPrice: 1748.55,
      exchange: 'NSE',
    },
    {
      id: 'h3',
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      sector: 'Information Technology',
      type: 'Equity',
      quantity: 90,
      avgBuyPrice: 1710.00,
      currentPrice: 1924.40,
      exchange: 'NSE',
    },
    {
      id: 'h4',
      symbol: 'TCS',
      name: 'Tata Consultancy Services Ltd.',
      sector: 'Information Technology',
      type: 'Equity',
      quantity: 40,
      avgBuyPrice: 3860.00,
      currentPrice: 4218.60,
      exchange: 'NSE',
    },
    {
      id: 'h5',
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      sector: 'Automotive',
      type: 'Equity',
      quantity: 150,
      avgBuyPrice: 920.00,
      currentPrice: 1082.35,
      exchange: 'NSE',
    },
    {
      id: 'h6',
      symbol: 'SUNPHARMA',
      name: 'Sun Pharmaceutical Industries Ltd.',
      sector: 'Pharmaceuticals',
      type: 'Equity',
      quantity: 70,
      avgBuyPrice: 1620.00,
      currentPrice: 1782.50,
      exchange: 'NSE',
    },
    {
      id: 'h7',
      symbol: 'GOLDBEES',
      name: 'Nippon India ETF Gold BeES',
      sector: 'Commodities',
      type: 'ETF',
      quantity: 400,
      avgBuyPrice: 54.20,
      currentPrice: 62.48,
      exchange: 'NSE',
    },
  ],
};

// Compute derived fields
export function enrichPortfolio(portfolio) {
  const holdings = portfolio.holdings.map((h) => {
    const marketValue = h.quantity * h.currentPrice;
    const costBasis = h.quantity * h.avgBuyPrice;
    const unrealizedPL = marketValue - costBasis;
    const unrealizedPLPct = costBasis > 0 ? (unrealizedPL / costBasis) : 0;
    return { ...h, marketValue, costBasis, unrealizedPL, unrealizedPLPct };
  });

  const totalMarketValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const totalCostBasis = holdings.reduce((s, h) => s + h.costBasis, 0);
  const totalUnrealizedPL = totalMarketValue - totalCostBasis;
  const totalUnrealizedPLPct = totalCostBasis > 0 ? totalUnrealizedPL / totalCostBasis : 0;

  const holdingsWithWeight = holdings.map((h) => ({
    ...h,
    weight: totalMarketValue > 0 ? h.marketValue / totalMarketValue : 0,
  }));

  return {
    ...portfolio,
    holdings: holdingsWithWeight,
    totalMarketValue,
    totalCostBasis,
    totalUnrealizedPL,
    totalUnrealizedPLPct,
  };
}
