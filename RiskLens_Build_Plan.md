# RiskLens — Build Plan & Phase Roadmap

> Step-by-step module breakdown for the entire RiskLens system.  
> Work through phases **in order** — each phase builds on the previous one.  
> ✅ = Done &nbsp;|&nbsp; 🔄 = In Progress &nbsp;|&nbsp; ⬜ = Not Started

---

## ✅ Phase 0 — Project Setup & Infrastructure
> **Goal:** Repo, directory structure, MongoDB connection, server running.

| # | Task | Branch | Status |
|---|---|---|---|
| 0.1 | Create project directory structure (frontend + backend + docs) | `main` | ✅ |
| 0.2 | Initialize `.gitignore`, `README.md`, `docker-compose.yml` | `main` | ✅ |
| 0.3 | Move structure into `Requiem_Hackathon_MohenjoDaro/` | `main` | ✅ |
| 0.4 | Write `requirements.txt` with all backend dependencies | `functionality` | ✅ |
| 0.5 | Create Python `.venv` and install all packages | `functionality` | ✅ |
| 0.6 | Write `app/core/config.py` (Pydantic BaseSettings + `.env`) | `functionality` | ✅ |
| 0.7 | Write `app/db/connection.py` (Motor async MongoDB client) | `functionality` | ✅ |
| 0.8 | Write `main.py` (FastAPI app + lifespan + CORS + `/health`) | `functionality` | ✅ |
| 0.9 | Verify MongoDB Atlas connection via `/health` endpoint | `functionality` | ✅ |

---

## ✅ Phase 1 — Market Data Adapter
> **Goal:** Fetch, cache and serve real stock/benchmark price data via yfinance.  
> **Blueprint ref:** §10 — Data Sources & APIs

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 1.1 | `app/services/market_data/yfinance_client.py` | `get_prices()`, `get_live_quotes()` — live market share values, adjusted OHLCV | ✅ |
| 1.2 | `app/services/market_data/benchmark.py` | Fetch NIFTY 50 (`^NSEI`), NASDAQ-100 (`^NDX`), align dates to portfolio window | ✅ |
| 1.3 | `app/api/routes/market_data.py` | `GET /api/market/assets/search`, `GET /api/market/prices`, `GET /api/market/quotes` | ✅ |
| 1.4 | `app/schemas/market_data.py` | Pydantic schemas: `PriceResponse`, `AssetSearchResult`, `DataFreshnessInfo`, `LiveQuote` | ✅ |
| 1.5 | `app/utils/validators.py` | Validate tickers, date ranges, minimum history length | ✅ |

---

## ✅ Phase 2 — Quantitative Risk Engine
> **Goal:** Compute all financial metrics server-side. Frontend never calculates metrics.  
> **Blueprint ref:** §7 — Quantitative Risk Engine

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 2.1 | `app/services/finance/risk_metrics.py` | `annualized_return()`, `annualized_volatility()`, `max_drawdown()`, `sharpe_ratio()`, `sortino_ratio()`, `historical_var()`, `cvar()`, `beta()`, `correlation_matrix()`, `hhi_concentration()` | ✅ |
| 2.2 | `app/services/finance/risk_metrics.py` | `asset_risk_contribution()` — Euler risk decomposition (% risk contribution to volatility) | ✅ |
| 2.3 | `app/schemas/risk.py` | Pydantic schemas: `QuantitativeMetrics`, `AssetRiskContribution`, `QuantAnalysisResponse` | ✅ |
| 2.4 | `app/utils/helpers.py` | `align_price_series()`, `calc_returns()`, `handle_missing_prices()` | ✅ |
| 2.5 | `tests/unit/test_risk_metrics.py` | 10 unit tests verifying calculations and edge cases | ✅ |


### Rules (from blueprint §7)
- One consistent return convention (log or simple — document it)
- Use adjusted prices where available
- Aligned calendars — no silent date mismatches
- Return `"insufficient_data"` warning — never fabricate prices

---

## ⬜ Phase 3 — Portfolio CRUD & MongoDB Collections
> **Goal:** Save/load portfolios and analysis runs from MongoDB.  
> **Blueprint ref:** §10 — MongoDB Collections

### Backend
| # | File | What to build |
|---|---|---|
| 3.1 | `app/models/portfolio.py` | MongoEngine/PyMongo doc: `user_id`, `name`, `holdings[]`, `currency`, `benchmark`, `updated_at` |
| 3.2 | `app/models/user.py` | `username`, `email`, `risk_preference`, `created_at` |
| 3.3 | `app/models/risk_analysis.py` | `portfolio_id`, `as_of`, `date_window`, `metrics`, `risk_class`, `probabilities`, `warnings`, `model_version` |
| 3.4 | `app/db/repositories/portfolio_repo.py` | `create()`, `get_by_id()`, `list_by_user()`, `update()`, `delete()` |
| 3.5 | `app/db/repositories/user_repo.py` | `create_user()`, `get_by_id()`, `update_preferences()` |
| 3.6 | `app/db/repositories/risk_repo.py` | `save_analysis()`, `get_latest()`, `list_history()` |
| 3.7 | `app/schemas/portfolio.py` | `PortfolioCreate`, `PortfolioResponse`, `HoldingItem` |
| 3.8 | `app/api/routes/portfolio.py` | `POST /api/portfolios`, `GET /api/portfolios/{id}`, `GET /api/analysis/{id}` |

### MongoDB Collections (from blueprint §10)
```
users            portfolios        analysis_runs
recommendations  simulations
```

---

## ✅ Phase 4 — Risk Analysis API & Strategy Comparison (MVP 1 Complete)
> **Goal:** Single endpoint that runs full quantitative analysis and returns dashboard data.  
> **Blueprint ref:** §5.2, §10

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 4.1 | `app/api/routes/risk.py` | `POST /api/analysis/risk` — accepts portfolio, returns full metrics object | ✅ |
| 4.2 | `app/api/routes/optimization.py` | `POST /api/analysis/compare` — side-by-side multi-asset/strategy comparison | ✅ |
| 4.3 | `app/schemas/risk.py` | `RiskAnalysisRequest`, `RiskAnalysisResponse` (metrics + growth_series + allocation + freshness) | ✅ |


### Response shape (key fields)
```json
{
  "risk_class": "Medium",
  "probabilities": { "Low": 0.12, "Medium": 0.71, "High": 0.17 },
  "metrics": { "volatility": 0.18, "sharpe": 1.2, "var_95": -0.032, ... },
  "growth_series": [{ "date": "2023-01-01", "portfolio": 100000, "benchmark": 100000 }],
  "allocation": [{ "symbol": "AAPL", "weight": 0.25, "risk_contribution": 0.31 }],
  "data_freshness": { "as_of": "2024-10-10", "status": "fresh" },
  "warnings": []
}
```

---

## ⬜ Phase 5 — Frontend Core (Dashboard Vertical Slice)
> **Goal:** Wire Portfolio Builder → Dashboard with real backend data. No hardcoded numbers.  
> **Blueprint ref:** §5.1, §5.2, §12 Phase 3

### Frontend
| # | File | What to build |
|---|---|---|
| 5.1 | `frontend/.env` | `VITE_API_URL=http://localhost:8000` |
| 5.2 | `src/services/api.js` | Axios base instance with base URL + error interceptors |
| 5.3 | `src/services/portfolioService.js` | `createPortfolio()`, `getAnalysis()` |
| 5.4 | `src/services/riskService.js` | `analyzeRisk()`, `compareAssets()` |
| 5.5 | `src/services/marketDataService.js` | `searchAssets()`, `getPrices()` |
| 5.6 | `src/store/portfolioStore.js` | Zustand store: holdings, capital, benchmark, dateRange, riskPreference |
| 5.7 | `src/store/riskStore.js` | Zustand store: analysisResult, loading, error |
| 5.8 | `src/components/portfolio/PortfolioForm.jsx` | Ticker search, add/remove assets, capital, benchmark, date range, risk preference |
| 5.9 | `src/components/dashboard/MetricsPanel.jsx` | Display all 8 metrics from API (no calculations in JS) |
| 5.10 | `src/components/charts/PerformanceLineChart.jsx` | Portfolio vs benchmark growth (Recharts LineChart) |
| 5.11 | `src/components/charts/AllocationPieChart.jsx` | Asset weight donut chart (Recharts PieChart) |
| 5.12 | `src/pages/Dashboard.jsx` | Assemble: risk badge + MetricsPanel + PerformanceLineChart + AllocationPieChart + freshness badge |
| 5.13 | `src/components/common/LoadingSpinner.jsx` | Skeleton loader for async states |
| 5.14 | `src/components/common/ErrorBoundary.jsx` | Graceful error fallback for every panel |

---

## ⬜ Phase 6 — ML Risk Classifier (MVP 2 Starts)
> **Goal:** Train Random Forest + XGBoost, expose predictions via API, add SHAP explanations.  
> **Blueprint ref:** §8 — ML Model Specifications

### ML Training (`backend/ml/`)
| # | File | What to build |
|---|---|---|
| 6.1 | `ml/data/sample_data.csv` | Collect training data (portfolio feature snapshots with future risk labels) |
| 6.2 | `ml/training/train_rf.py` | Random Forest: 300 trees, `class_weight="balanced"`, chronological split, macro F1 eval |
| 6.3 | `ml/training/train_xgb.py` | XGBoost: same features/splits as RF, comparative evaluation |
| 6.4 | `ml/training/evaluate.py` | Confusion matrix, per-class precision/recall, balanced accuracy, model comparison |
| 6.5 | `ml/models/model_metadata.json` | Record: model version, training date, features used, eval metrics |
| 6.6 | `ml/explainability/shap_explainer.py` | `explain_prediction(features)` → SHAP values per feature |

### Backend Inference
| # | File | What to build |
|---|---|---|
| 6.7 | `app/services/ml/feature_engineering.py` | Build feature vector from portfolio metrics (20d/60d/252d returns, vol, drawdown, VaR, correlation, beta, HHI) |
| 6.8 | `app/services/ml/model_loader.py` | Load `.pkl` model at startup using joblib |
| 6.9 | `app/services/ml/risk_predictor.py` | `predict(features)` → class + probabilities + SHAP values |

### Rules (from blueprint §8.4)
- Chronological train/val/test split — **never shuffle time series**
- Leakage rule: future outcomes = labels only, never features
- Keep a simple rules-based baseline to beat

---

## ⬜ Phase 7 — Asset Comparison & Correlation
> **Goal:** Multi-asset side-by-side performance and correlation matrix.  
> **Blueprint ref:** §5.3

### Backend
| # | File | What to build |
|---|---|---|
| 7.1 | `app/api/routes/risk.py` | `POST /api/analysis/compare` — returns per-asset metrics + correlation matrix + benchmark overlay |

### Frontend
| # | File | What to build |
|---|---|---|
| 7.2 | `src/components/charts/CorrelationHeatmap.jsx` | Plotly.js grid heatmap of correlation matrix |
| 7.3 | `src/components/charts/BenchmarkComparisonChart.jsx` | Multi-strategy line chart (Recharts) |
| 7.4 | `src/pages/Benchmarks.jsx` | Metrics table + CorrelationHeatmap + BenchmarkComparisonChart |

---

## ⬜ Phase 8 — Risk DNA Screen
> **Goal:** Explain WHY portfolio risk is Low/Med/High. Dual explanation — ML (SHAP) + Quant (attribution).  
> **Blueprint ref:** §5, §8.5, USP #1 & #2

### Frontend
| # | File | What to build |
|---|---|---|
| 8.1 | `src/components/charts/RiskContributionChart.jsx` | Horizontal waterfall bar — asset quantitative risk contribution |
| 8.2 | `src/components/charts/ShapBarChart.jsx` *(new)* | Horizontal bar — SHAP feature importance (ML explanation) |
| 8.3 | `src/pages/RiskAnalysis.jsx` | SHAP chart + Risk Contribution waterfall + Concentration gauge + Risk Budget Guardrails panel |

> ⚠️ **Critical:** Label these clearly as separate things — "ML Model Explanation (SHAP)" vs "Quantitative Risk Attribution"

---

## ✅ Phase 9 — Portfolio Optimization & Allocation Lab
> **Goal:** CVaR optimizer, 4-strategy comparison, "Why this weight?" explanations.  
> **Blueprint ref:** §5.4, §9

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 9.1 | `app/services/finance/portfolio_optimizer.py` | CVaR optimization via CVXPY: long-only, weights sum to 1, per-asset caps, sector limits | ✅ |
| 9.2 | `app/services/finance/portfolio_optimizer.py` | Generate 4 strategies: original, equal-weight, optimized, benchmark | ✅ |
| 9.3 | `app/api/routes/optimization.py` | `POST /api/portfolio/optimize` | ✅ |
| 9.4 | `app/schemas/optimization.py` | `OptimizationRequest`, `OptimizationResponse` (weights, amounts, metrics, explanations) | ✅ |


### Frontend
| # | File | What to build |
|---|---|---|
| 9.5 | `src/components/portfolio/OptimizationPanel.jsx` | 4-column weight comparison + "Why this weight?" per asset |
| 9.6 | `src/pages/Optimization.jsx` | Allocation Lab — risk preference toggle, before/after metrics, constraint display |
| 9.7 | `src/services/mlService.js` | `getOptimization(payload)` → `POST /api/portfolio/optimize` |

### Constraint rules (from blueprint §9)
- Long-only (no short/leverage)
- Weights sum to 100% within tolerance
- Configurable per-asset max
- Risk preference changes objective — not just a label

---

## ✅ Phase 10 — Historical Backtesting (Backend Complete)
> **Goal:** Simulate strategy returns over a user-selected historical period.  
> **Blueprint ref:** §5.5, §12 Phase 5

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 10.1 | `app/services/finance/backtester.py` | Multi-strategy simulation (`original`, `recommended`, `equal`, `benchmark`), drift tracking, rebalancing frequencies (`buy_and_hold`, `monthly`, `quarterly`, `annual`), transaction fee penalties, cumulative series, drawdown series | ✅ |
| 10.2 | `app/api/routes/backtesting.py` | `POST /api/backtests` endpoint with full strategy comparison metrics & timeseries | ✅ |
| 10.3 | `app/schemas/backtesting.py` | Complete Pydantic request & response schemas with data validation | ✅ |
| 10.4 | `tests/unit/test_backtester.py` | 6 unit tests validating rebalancing, tx cost impact, multi-strategy metrics | ✅ |

### Frontend
| # | File | What to build |
|---|---|---|
| 10.5 | `src/components/charts/DrawdownChart.jsx` *(new)* | Area chart for drawdown series |
| 10.6 | `src/pages/Backtesting.jsx` | Date picker + strategy selector + rebalance toggle + tx cost input + cumulative chart + drawdown chart |
| 10.7 | `src/services/backtestService.js` *(new)* | `runBacktest()`, `runScenario()` |

---

## ✅ Phase 11 — Stress Lab (Backend Complete)
> **Goal:** Custom market shocks and historical scenario replay.  
> **Blueprint ref:** §5.6, USP #4 & #5

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 11.1 | `app/services/finance/backtester.py` | Preset shocks (`mild_correction`, `bear_market`, `market_recovery`, `tech_crash`, `banking_crisis`, `high_volatility`, `covid_crash_2020`), custom shocks, sector shocks, asset beta sensitivity, stressed volatility | ✅ |
| 11.2 | `app/api/routes/backtesting.py` | `POST /api/scenarios` — apply user-defined or preset shocks to portfolio with per-asset breakdowns | ✅ |
| 11.3 | Disclaimer Engine | Strict mandate: every response labelled `is_hypothetical=True` and `disclaimer="Hypothetical Estimate..."` | ✅ |

### Frontend
| # | File | What to build |
|---|---|---|
| 11.4 | Add Stress Lab panel to `src/pages/Backtesting.jsx` | Shock inputs (market %, sector %, single-asset %), historical period replay |

> ⚠️ Every stress result must be labelled **"Hypothetical Estimate"** — never presented as fact

---

## ⬜ Phase 12 — Saved Analyses & Export
> **Goal:** Persist runs, list history, export PDF/CSV.  
> **Blueprint ref:** §5.8, §10 MongoDB Collections

### Backend
| # | File | What to build |
|---|---|---|
| 12.1 | `app/api/routes/portfolio.py` | `GET /api/analysis/{analysis_id}` — retrieve saved run |
| 12.2 | `backend/reports/` *(new dir)* | PDF/CSV generator with metrics, assumptions, disclaimers, model version |

### Frontend
| # | File | What to build |
|---|---|---|
| 12.3 | `src/pages/Portfolio.jsx` | Saved analyses list — timestamp, inputs, risk class, export button |

---

## ⬜ Phase 13 — Hardening, Tests & Deployment
> **Goal:** All tests pass. App deployable. README complete.  
> **Blueprint ref:** §12 — Definition of Done

### Tests
| # | File | What to test |
|---|---|---|
| 13.1 | `tests/unit/test_risk_metrics.py` | Flat prices → zero vol; severe drop → correct drawdown; equal-weight sums to 1 |
| 13.2 | `tests/unit/test_ml_models.py` | No future leakage; model loads without error; prediction shape correct |
| 13.3 | `tests/integration/test_portfolio_api.py` | Full POST → save → GET round-trip |
| 13.4 | `tests/integration/test_market_data_api.py` | Invalid ticker → 422; short history → warning in response |

### Deployment
| # | Task | Tool |
|---|---|---|
| 13.5 | Deploy frontend | Vercel |
| 13.6 | Deploy backend API | Render (or Railway) |
| 13.7 | Set env vars in deployment platform | Vercel + Render dashboards |
| 13.8 | Update `README.md` with setup + deployment steps | — |

---

## ✅ Phase 14 — Market Intelligence & Financial NLP (Bonus Backend Complete)
> **Goal:** Financial news sentiment and catalyst extraction as supplemental context only.  
> **Blueprint ref:** §1 Bonus, §2 Context-only, §3 Optional news NLP

### Backend
| # | File | What to build | Status |
|---|---|---|---|
| 14.1 | `app/services/ai/sentiment_analyzer.py` | Loughran-McDonald financial lexicon scoring, negation handling, intensity multipliers, and catalyst/topic detectors | ✅ |
| 14.2 | `app/services/ai/news_fetcher.py` | Google News RSS live fetcher with ticker resolution, parsing, and offline fallback | ✅ |
| 14.3 | `app/services/ai/market_intelligence.py` | Consolidated portfolio sentiment aggregation, holding weighting, and signal mining | ✅ |
| 14.4 | `app/schemas/intelligence.py` | Complete Pydantic schemas (`PortfolioIntelligenceResponse`, `NewsSentimentItem`, etc.) | ✅ |
| 14.5 | `app/api/routes/intelligence.py` | `POST /api/intelligence/portfolio`, `POST /api/intelligence/news`, `GET /api/intelligence/headlines` | ✅ |
| 14.6 | `tests/unit/test_intelligence.py` | 8 unit tests covering positive/negative/neutral scoring, negation, catalysts, and fetchers | ✅ |

### Frontend
| # | File | What to build |
|---|---|---|
| 14.7 | Frontend UI Widget | Sentiment pill (positive/neutral/negative) + headline + date + context disclaimer |

> ⚠️ Strict Rule Enforced: Sentiment is **context only** — it never generates or modifies quantitative financial risk metrics or returns.

---

## 📊 Progress Tracker

```
Phase 0  — Setup & Infrastructure        ████████████  ✅ DONE
Phase 1  — Market Data Adapter           ████████████  ✅ DONE
Phase 2  — Quantitative Risk Engine      ████████████  ✅ DONE
Phase 3  — Portfolio CRUD + MongoDB      ░░░░░░░░░░░░  🔄 IN PROGRESS (parallel branch)
Phase 4  — Risk Analysis & Comparison    ████████████  ✅ DONE
Phase 5  — Frontend Core (Dashboard)     ░░░░░░░░░░░░  ⬜ TODO
Phase 6  — ML Classifier + SHAP         ████████████  ✅ DONE (baseline loaded)
Phase 7  — Asset Comparison             ████████████  ✅ DONE
Phase 8  — Risk DNA Screen              ░░░░░░░░░░░░  ⬜ TODO
Phase 9  — Optimization & Allocation Lab ████████████  ✅ DONE

Phase 10 — Historical Backtesting        ████████████  ✅ DONE (Backend API)
Phase 11 — Stress Lab                    ████████████  ✅ DONE (Backend API)
Phase 12 — Saved Analyses & Export       ░░░░░░░░░░░░  ⬜ TODO
Phase 13 — Hardening, Tests & Deploy     ░░░░░░░░░░░░  ⬜ TODO
Phase 14 — [Bonus] Market Intelligence   ████████████  ✅ DONE (Backend API)
```

---

## 🔑 Key Engineering Rules (from Blueprint §2 & §14)

1. **Backend is source of truth** — frontend displays, never calculates financial metrics.
2. **No fabricated data** — missing prices return a warning, never a synthetic fill.
3. **Chronological ML splits** — never shuffle time series; no future leakage into features.
4. **SHAP ≠ Risk Attribution** — label them separately; SHAP explains ML; quant engine explains asset risk.
5. **Aligned dates** — portfolio and benchmark always use the same date window.
6. **Optimizer constraints** — weights always sum to 100%; long-only enforced.
7. **Hypothetical vs Historical** — stress/scenario outputs always labelled as estimates.
8. **Thin routes** — all logic lives in service modules, not in FastAPI route handlers.
