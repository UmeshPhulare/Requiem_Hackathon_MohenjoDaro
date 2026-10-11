# RiskLens — System Audit & Implementation Status Report

> **Project:** RiskLens — Explainable Investment Risk Prediction System  
> **Timestamp:** October 11, 2026  
> **Repository:** `Requiem_Hackathon_MohenjoDaro`  
> **Current Active Branch:** `phase14-market-intelligence-nlp`  
> **Reference Documents:** [RiskLens Project Blueprint](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/RiskLens_Project_Blueprint.md) · [RiskLens Build Plan](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/RiskLens_Build_Plan.md)

---

## 1. Executive Summary

This document provides a comprehensive audit of all backend engines, quantitative analytics, machine learning models, and REST endpoints built to date, as well as an itemized breakdown of what remains to be completed.

- **Completed & Verified Modules:** 7 full phases (Phases 0, 1, 2, 4, 6, 9, 10, 11, and 14).
- **Test Status:** **100% Passing** across all 30 unit tests (`pytest tests/unit/ -v`) and live end-to-end integration tests (`test_endpoints.py`).
- **Core Principle Maintained:** The quantitative engine remains the strict source of truth for financial numbers; ML models classify and explain risk; FinBERT/NLP sentiment provides qualitative context only without fabricating metrics.

---

## 2. Operational & Verified Modules

### 2.1. Market Data Adapter (Phase 1)
* **Underlying Service:** [`yfinance_client.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/market_data/yfinance_client.py) & [`benchmark.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/market_data/benchmark.py)
* **Capabilities:**
  * Fetches historical adjusted closing prices and latest live quotes using `yfinance` with `curl-cffi` support.
  * Curated 12-ticker universe of Indian NSE large-cap equities (`RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `INFY.NS`, `ICICIBANK.NS`, `ITC.NS`, `BHARTIARTL.NS`, `LT.NS`, `SBIN.NS`, `HINDUNILVR.NS`, `ONGC.NS`, `SUNPHARMA.NS`).
  * Dynamic symbol lookup supporting US/global assets (`AAPL`, `MSFT`, `GOOGL`, etc.).
  * Aligned historical series with Indian benchmark index (`^NSEI` NIFTY 50).
  * Data freshness tracker (`status: "fresh"`, date window alignment, missing-history warnings).
* **Endpoints:**
  * `GET /api/market/quotes?symbols=RELIANCE.NS,TCS.NS`
  * `GET /api/market/supported`
  * `GET /api/market/search?q=tata`
  * `GET /api/market/history?symbols=RELIANCE.NS&start_date=2024-01-01`

---

### 2.2. Quantitative Risk Engine (Phase 2)
* **Underlying Service:** [`risk_metrics.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/finance/risk_metrics.py)
* **Capabilities:**
  * **Annualized Returns & Volatility:** 252-day business calendar convention.
  * **Max Drawdown:** Peak-to-trough drop with high-water mark series.
  * **Downside Risk:** Semi-deviation / downside deviation thresholded at risk-free rate (6.5%).
  * **Tail Losses:** Historical Value-at-Risk (VaR at 95% & 99%) and Conditional VaR (CVaR / Expected Shortfall).
  * **Risk-Adjusted Ratios:** Sharpe Ratio, Sortino Ratio.
  * **Market Sensitivity:** Benchmark Beta and Jensen's Alpha against NIFTY 50.
  * **Concentration:** Herfindahl-Hirschman Index (HHI) for asset concentration.
  * **Euler Risk Contribution:** Exact decomposition calculating each asset’s marginal and percentage contribution to total portfolio volatility.
* **Endpoints:**
  * `POST /api/analysis/quant`

---

### 2.3. ML Risk Classifier & SHAP Explainability (Phases 4 & 6)
* **Underlying Service:** [`risk_predictor.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/ml/risk_predictor.py), [`model_loader.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/ml/model_loader.py), and [`feature_engineering.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/ml/feature_engineering.py)
* **Capabilities:**
  * **Model:** Pre-trained Random Forest Classifier loaded via `joblib` (`risklens_model.joblib`).
  * **Predictions:** Portfolio Risk Category (`Low`, `Medium`, `High`) with calibrated probabilities.
  * **Features:** 20 statistical features engineered from returns, volatility, drawdowns, correlation, sector concentrations, and tail losses.
  * **Explainability:** SHAP feature importance rankings identifying which characteristics pushed the portfolio into its risk category (with safe fallback).
* **Endpoints:**
  * `POST /api/analysis/risk`

---

### 2.4. Portfolio Optimizer & Allocation Lab (Phase 9)
* **Underlying Service:** [`portfolio_optimizer.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/finance/portfolio_optimizer.py)
* **Capabilities:**
  * **Optimization Engine:** Convex optimization via **CVXPY** optimizing CVaR (Expected Shortfall) and Mean-Variance trade-offs.
  * **Strict Financial Guardrails:**
    * Long-only (weights $\ge 0$, no shorting/leverage).
    * Full investment (weights sum strictly to 1.0 within tolerance).
    * Per-asset maximum concentration cap (default 60%).
    * Sector concentration limits (default 70%).
  * **Four-Strategy Comparison:** Concurrently calculates:
    1. *Original Allocation* (user's input)
    2. *Recommended Allocation* (CVaR risk-optimized)
    3. *Equal-Weight Benchmark* ($1/N$ baseline)
    4. *Market Benchmark* (NIFTY 50 `^NSEI`)
  * **"Why This Weight?" Explanations:** Automated qualitative commentary explaining every reweighting decision (e.g., correlation benefits, tail risk reduction, single-asset capping).
* **Endpoints:**
  * `POST /api/portfolio/optimize`
  * `POST /api/analysis/compare`

---

### 2.5. Historical Backtesting Engine (Phase 10)
* **Underlying Service:** [`backtester.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/finance/backtester.py)
* **Capabilities:**
  * Multi-period backtesting comparing the 4 strategies over historical data.
  * Dynamic rebalancing frequencies: `buy_and_hold`, `monthly`, `quarterly`, `annual`.
  * Realistic transaction drag / slippage penalty modeling (e.g. 0.1% per turnover).
  * Trajectory series: Cumulative equity curves, growth indexes ($100k normalized), and continuous rolling drawdowns.
* **Endpoints:**
  * `POST /api/backtests`

---

### 2.6. Stress Lab & Scenario Simulator (Phase 11)
* **Underlying Service:** [`backtester.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/finance/backtester.py)
* **Capabilities:**
  * **Preset Crises:**
    * `mild_correction`: -10% cyclical pullback
    * `bear_market`: -20% prolonged economic contraction
    * `market_recovery`: +15% post-crisis risk rally
    * `tech_crash`: -35% IT sector de-rating
    * `banking_crisis`: -25% financial liquidity strain
    * `high_volatility`: Macro volatility explosion (2.5x multiplier)
    * `covid_crash_2020`: March 2020 historical crisis liquidation replay
  * **Custom Scenarios:** User-defined market % shock, sector % shocks, and volatility multipliers.
  * **Asset-Level Stress Breakdown:** Computes individual asset responses using historical beta sensitivities.
  * **Mandatory Compliance Disclaimer:** Strictly enforces `is_hypothetical: true` and `"Hypothetical Estimate"` labelling.
* **Endpoints:**
  * `POST /api/scenarios`

---

### 2.7. AI Market Intelligence & Financial Sentiment NLP (Phase 14)
* **Underlying Service:** [`sentiment_analyzer.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/ai/sentiment_analyzer.py), [`news_fetcher.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/ai/news_fetcher.py), and [`market_intelligence.py`](file:///c:/Users/Umesh%20Phulare/Desktop/Requiem%20Hackathon/Requiem_Hackathon_MohenjoDaro/backend/app/services/ai/market_intelligence.py)
* **Capabilities:**
  * **Loughran-McDonald Financial Lexicon:** Calibrated sentiment analysis tailored to financial journalism.
  * **Linguistic Modifiers:** Negation polarity flipping (*"failed to grow"* scored as negative) and intensity scaling.
  * **Catalyst & Theme Mining:** Auto-extracts catalysts (`Earnings & Results`, `M&A & Expansion`, `Dividends & Buybacks`, `Regulatory & Legal`, `IPO & Fundraise`, `Analyst Ratings`).
  * **Live News Integration:** Google News RSS integration with ticker resolution and offline cached fallback.
  * **Portfolio Sentiment Aggregation:** Computes holding-weighted portfolio sentiment score and sentiment distribution.
  * **Strict Non-Interference Guardrail:** Formatted strictly with `context_only: true` and compliance disclaimer.
* **Endpoints:**
  * `POST /api/intelligence/portfolio`
  * `POST /api/intelligence/news`
  * `GET /api/intelligence/headlines`

---

## 3. What Remains to Be Implemented

The following modules remain to complete the full project specification:

### 3.1. Phase 3: Portfolio CRUD & MongoDB Persistence
* **Current Status:** In progress on a separate branch (user/teammate branch).
* **Scope to Integrate:**
  * MongoEngine / Motor models: `users`, `portfolios`, `analysis_runs`, `simulations`.
  * Repositories in `app/db/repositories/`: `portfolio_repo.py`, `user_repo.py`, `risk_repo.py`.
  * REST Endpoints: `POST /api/portfolios`, `GET /api/portfolios/{id}`, `GET /api/portfolios/user/{user_id}`.

### 3.2. Phase 8: Risk DNA Screen (USP #1)
* **Blueprint Reference:** §6 USP #1 — *Portfolio Risk DNA*
* **Scope to Build:**
  * 5-Axis normalized quantitative radar breakdown (scale 0 to 100):
    1. **Volatility Risk:** Portfolio annualized volatility vs. benchmark.
    2. **Tail Loss Risk:** CVaR severity.
    3. **Drawdown Depth:** Maximum historical drawdown.
    4. **Concentration Risk:** Asset and sector HHI scores.
    5. **Correlation / Co-movement:** Portfolio diversification ratio.
  * **Planned Endpoint:** `POST /api/analysis/risk-dna`.

### 3.3. Phase 12: Saved Analyses & Export Engine (USP #7)
* **Blueprint Reference:** §5.8 & §10 — *Data Provenance & Export*
* **Scope to Build:**
  * PDF and CSV export generator.
  * Inclusion of Data Trust Meter (freshness timestamp, date window, ticker coverage, model version `risklens-rf-1.0`, assumptions, and disclaimers).
  * **Planned Endpoints:** `GET /api/reports/export/pdf`, `GET /api/reports/export/csv`.

### 3.4. Phase 13: Hardening & Cloud Deployment Configurations
* **Scope to Build:**
  * Production CORS and rate-limiting middleware.
  * Dockerfile / Render deploy manifest for Python backend.
  * Vercel build script configuration for React frontend.
  * Final API documentation.

### 3.5. Frontend UI Integration
* **Current Status:** Frontend redesign is running in development mode (`npm run dev`) on another branch.
* **Scope to Wire:**
  * Replace mock data in frontend components with live calls to the FastAPI backend:
    * `PortfolioBuilder.jsx` → `GET /api/market/quotes` & `GET /api/market/search`
    * `Dashboard.jsx` / `RiskAnalysis.jsx` → `POST /api/analysis/risk`
    * `AllocationOptimizer.jsx` → `POST /api/portfolio/optimize`
    * `Backtesting.jsx` → `POST /api/backtests`
    * `ScenarioSimulator.jsx` → `POST /api/scenarios`
    * `MarketIntelligence.jsx` → `POST /api/intelligence/portfolio`

---

## 4. Test Verification Summary

| Test Suite | Path | Tests | Result | Notes |
|---|---|:---:|:---:|---|
| Quantitative Risk Metrics | `tests/unit/test_risk_metrics.py` | 10 | **PASS** | Validates flat prices, vol, drawdowns, VaR/CVaR, beta, Euler decomposition |
| Portfolio Optimizer | `tests/unit/test_optimizer.py` | 6 | **PASS** | Validates CVaR bounds, weights sum to 100%, caps, 4-strategy comparisons |
| Historical Backtester | `tests/unit/test_backtester.py` | 6 | **PASS** | Validates drift, rebalancing frequencies, tx slippage drag, scenario shocks |
| Market Intelligence & NLP | `tests/unit/test_intelligence.py` | 8 | **PASS** | Validates Loughran-McDonald scoring, negations, catalysts, news retrieval |
| End-to-End Integration | `tests/integration/test_endpoints.py` | 8 | **PASS** | Live API test across `RELIANCE.NS`, `TCS.NS`, and `^NSEI` returning HTTP 200 OK |
| **Total Test Count** | — | **38** | **100% PASS** | Zero errors, zero deprecation halts |

---

## 5. Git Branch Hierarchy

```
main (frontend codebase)
  └── phase-0-to-phase-2-complete (setup, yfinance, quant engine)
       └── phase4-and-9-optimization-strategy-comparison (ML classifier, CVaR optimizer)
            └── phase10-11-backtesting-stress-lab (backtester, scenario stress engine)
                 └── phase14-market-intelligence-nlp (CURRENT: financial sentiment, news NLP)
```
