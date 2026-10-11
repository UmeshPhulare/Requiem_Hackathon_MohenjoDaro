// PortfolioContext.jsx — Real-time user portfolio state connected to MongoDB Atlas
import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { enrichPortfolio } from '../data/demoPortfolio.js';
import { DEMO_ASSETS } from '../data/demoAssets.js';
import { portfolioApi } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

// ── Actions ──────────────────────────────────────────────────
export const ACTIONS = {
  SET_PORTFOLIO: 'SET_PORTFOLIO',
  ADD_HOLDING: 'ADD_HOLDING',
  UPDATE_HOLDING: 'UPDATE_HOLDING',
  REMOVE_HOLDING: 'REMOVE_HOLDING',
  SET_RISK_PREFERENCE: 'SET_RISK_PREFERENCE',
  SET_INVESTMENT_AMOUNT: 'SET_INVESTMENT_AMOUNT',
  SET_BENCHMARK: 'SET_BENCHMARK',
  SET_DATE_RANGE: 'SET_DATE_RANGE',
  RESET_PORTFOLIO: 'RESET_PORTFOLIO',
};

// ── Real clean initial user portfolio (Zero dummy holdings) ───
const createEmptyPortfolio = () => ({
  id: 'user-portfolio',
  name: 'My Investment Portfolio',
  currency: 'INR',
  investedAmount: 0,
  lastUpdated: new Date().toISOString(),
  isDemo: false,
  holdings: [],
});

const initialState = {
  portfolio: enrichPortfolio(createEmptyPortfolio()),
  riskPreference: 'moderate',
  benchmark: 'NIFTY50',
  dateRange: '1Y',
  investmentAmount: 0,
  isDemo: false,
  availableAssets: DEMO_ASSETS,
  isLoading: false,
};

// ── Reducer ───────────────────────────────────────────────────
function portfolioReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PORTFOLIO: {
      const enriched = enrichPortfolio(action.payload || createEmptyPortfolio());
      return {
        ...state,
        portfolio: enriched,
        investmentAmount: enriched.totalCostBasis || 0,
        isDemo: !!action.payload?.isDemo,
      };
    }

    case ACTIONS.ADD_HOLDING: {
      const existing = (state.portfolio.holdings || []).find(
        (h) => h.symbol === action.payload.symbol
      );
      let updatedHoldings;
      if (existing) {
        updatedHoldings = state.portfolio.holdings.map((h) =>
          h.symbol === action.payload.symbol
            ? { ...h, quantity: Number(h.quantity) + Number(action.payload.quantity) }
            : h
        );
      } else {
        updatedHoldings = [
          ...(state.portfolio.holdings || []),
          { ...action.payload, id: action.payload.id || `h-${Date.now()}` },
        ];
      }
      const enriched = enrichPortfolio({
        ...state.portfolio,
        holdings: updatedHoldings,
      });
      return {
        ...state,
        portfolio: enriched,
        investmentAmount: enriched.totalCostBasis || 0,
      };
    }

    case ACTIONS.UPDATE_HOLDING: {
      const updatedHoldings = (state.portfolio.holdings || []).map((h) =>
        h.id === action.payload.id ? { ...h, ...action.payload } : h
      );
      const enriched = enrichPortfolio({
        ...state.portfolio,
        holdings: updatedHoldings,
      });
      return {
        ...state,
        portfolio: enriched,
        investmentAmount: enriched.totalCostBasis || 0,
      };
    }

    case ACTIONS.REMOVE_HOLDING: {
      const filtered = (state.portfolio.holdings || []).filter(
        (h) => h.id !== action.payload && h.symbol !== action.payload
      );
      const enriched = enrichPortfolio({
        ...state.portfolio,
        holdings: filtered,
      });
      return {
        ...state,
        portfolio: enriched,
        investmentAmount: enriched.totalCostBasis || 0,
      };
    }

    case ACTIONS.RESET_PORTFOLIO:
      return {
        ...state,
        portfolio: enrichPortfolio(createEmptyPortfolio()),
        investmentAmount: 0,
      };

    case ACTIONS.SET_RISK_PREFERENCE:
      return { ...state, riskPreference: action.payload };

    case ACTIONS.SET_INVESTMENT_AMOUNT:
      return { ...state, investmentAmount: action.payload };

    case ACTIONS.SET_BENCHMARK:
      return { ...state, benchmark: action.payload };

    case ACTIONS.SET_DATE_RANGE:
      return { ...state, dateRange: action.payload };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────
const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);
  const { user, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  // Load authenticated user's portfolio from MongoDB Atlas
  const loadPortfolioFromDb = useCallback(async () => {
    if (!token) {
      dispatch({ type: ACTIONS.RESET_PORTFOLIO });
      return;
    }

    setLoading(true);
    try {
      const data = await portfolioApi.get();
      if (data) {
        dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: data });
      }
    } catch (err) {
      console.warn('Could not fetch portfolio from MongoDB:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPortfolioFromDb();
    } else {
      dispatch({ type: ACTIONS.RESET_PORTFOLIO });
    }
  }, [isAuthenticated, loadPortfolioFromDb]);

  // Synchronize holding addition with MongoDB Atlas
  const addHolding = useCallback(
    async (holding) => {
      dispatch({ type: ACTIONS.ADD_HOLDING, payload: holding });
      if (token) {
        try {
          await portfolioApi.addHolding(holding);
        } catch (err) {
          console.error('Failed to sync holding addition to MongoDB:', err.message);
        }
      }
    },
    [token]
  );

  // Synchronize holding update with MongoDB Atlas
  const updateHolding = useCallback(
    async (holding) => {
      dispatch({ type: ACTIONS.UPDATE_HOLDING, payload: holding });
      if (token) {
        try {
          // Sync full updated holdings
          const updatedHoldings = state.portfolio.holdings.map((h) =>
            h.id === holding.id ? { ...h, ...holding } : h
          );
          await portfolioApi.update({
            ...state.portfolio,
            holdings: updatedHoldings,
          });
        } catch (err) {
          console.error('Failed to sync holding update to MongoDB:', err.message);
        }
      }
    },
    [token, state.portfolio]
  );

  // Synchronize holding deletion with MongoDB Atlas
  const removeHolding = useCallback(
    async (holdingId) => {
      dispatch({ type: ACTIONS.REMOVE_HOLDING, payload: holdingId });
      if (token) {
        try {
          await portfolioApi.deleteHolding(holdingId);
        } catch (err) {
          console.error('Failed to sync holding deletion to MongoDB:', err.message);
        }
      }
    },
    [token]
  );

  // Seed sample positions into the user's MongoDB account on request
  const seedSamplePortfolio = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await portfolioApi.seedSample();
      if (data) {
        dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: data });
      }
    } catch (err) {
      console.error('Failed to seed sample holdings:', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const setRiskPreference = useCallback((pref) => {
    dispatch({ type: ACTIONS.SET_RISK_PREFERENCE, payload: pref });
  }, []);

  const setInvestmentAmount = useCallback((amount) => {
    dispatch({ type: ACTIONS.SET_INVESTMENT_AMOUNT, payload: amount });
  }, []);

  const setBenchmark = useCallback((benchmark) => {
    dispatch({ type: ACTIONS.SET_BENCHMARK, payload: benchmark });
  }, []);

  const setDateRange = useCallback((range) => {
    dispatch({ type: ACTIONS.SET_DATE_RANGE, payload: range });
  }, []);

  const setPortfolio = useCallback(
    async (portfolio) => {
      dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: portfolio });
      if (token) {
        try {
          await portfolioApi.update(portfolio);
        } catch (err) {
          console.error('Failed to update portfolio in MongoDB:', err.message);
        }
      }
    },
    [token]
  );

  return (
    <PortfolioContext.Provider
      value={{
        ...state,
        isLoading: loading,
        refreshPortfolio: loadPortfolioFromDb,
        seedSamplePortfolio,
        addHolding,
        updateHolding,
        removeHolding,
        setRiskPreference,
        setInvestmentAmount,
        setBenchmark,
        setDateRange,
        setPortfolio,
        dispatch,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
}
