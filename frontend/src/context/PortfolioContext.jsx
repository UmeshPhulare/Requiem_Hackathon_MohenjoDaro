// PortfolioContext.jsx — Shared portfolio state across all pages
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { DEMO_PORTFOLIO, enrichPortfolio } from '../data/demoPortfolio';
import { DEMO_ASSETS } from '../data/demoAssets';

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
  SET_SELECTED_PORTFOLIO: 'SET_SELECTED_PORTFOLIO',
};

// ── Initial state ─────────────────────────────────────────────
const initialPortfolio = enrichPortfolio(DEMO_PORTFOLIO);

const initialState = {
  portfolio: initialPortfolio,
  riskPreference: 'moderate', // conservative | moderate | aggressive
  benchmark: 'NIFTY50',
  dateRange: '1Y',
  investmentAmount: 1100000,
  isDemo: true,
  availableAssets: DEMO_ASSETS,
};

// ── Reducer ───────────────────────────────────────────────────
function portfolioReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_PORTFOLIO: {
      return { ...state, portfolio: enrichPortfolio(action.payload) };
    }
    case ACTIONS.ADD_HOLDING: {
      const existing = state.portfolio.holdings.find(
        (h) => h.symbol === action.payload.symbol
      );
      if (existing) {
        // Merge: increase quantity
        const updated = state.portfolio.holdings.map((h) =>
          h.symbol === action.payload.symbol
            ? { ...h, quantity: h.quantity + action.payload.quantity }
            : h
        );
        return {
          ...state,
          portfolio: enrichPortfolio({ ...state.portfolio, holdings: updated }),
        };
      }
      const newHoldings = [...state.portfolio.holdings, { ...action.payload, id: `h-${Date.now()}` }];
      return {
        ...state,
        portfolio: enrichPortfolio({ ...state.portfolio, holdings: newHoldings }),
      };
    }
    case ACTIONS.UPDATE_HOLDING: {
      const updated = state.portfolio.holdings.map((h) =>
        h.id === action.payload.id ? { ...h, ...action.payload } : h
      );
      return {
        ...state,
        portfolio: enrichPortfolio({ ...state.portfolio, holdings: updated }),
      };
    }
    case ACTIONS.REMOVE_HOLDING: {
      const filtered = state.portfolio.holdings.filter((h) => h.id !== action.payload);
      return {
        ...state,
        portfolio: enrichPortfolio({ ...state.portfolio, holdings: filtered }),
      };
    }
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

  const addHolding = useCallback((holding) => {
    dispatch({ type: ACTIONS.ADD_HOLDING, payload: holding });
  }, []);

  const updateHolding = useCallback((holding) => {
    dispatch({ type: ACTIONS.UPDATE_HOLDING, payload: holding });
  }, []);

  const removeHolding = useCallback((holdingId) => {
    dispatch({ type: ACTIONS.REMOVE_HOLDING, payload: holdingId });
  }, []);

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

  const setPortfolio = useCallback((portfolio) => {
    dispatch({ type: ACTIONS.SET_PORTFOLIO, payload: portfolio });
  }, []);

  return (
    <PortfolioContext.Provider
      value={{
        ...state,
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
