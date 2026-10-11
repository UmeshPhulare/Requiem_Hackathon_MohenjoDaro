# RiskLens — Presentation Master Brief & Judges Q&A Defense Guide

> **Project:** RiskLens — Explainable Investment Risk Prediction & Allocation Optimization System  
> **Team:** Requiem Hackathon (`Requiem_Hackathon_MohenjoDaro`)  
> **Tagline:** *"See what drives your portfolio risk — before the market shows you."*  
> **Platform URL:** `http://localhost:5173` · **API Docs:** `http://127.0.0.1:8000/docs`  
> **Current Date:** October 2026

---

## 1. Executive Summary & 60-Second Elevator Pitch

### The Core Problem
Retail and wealth management investors face a dangerous **"Black Box Dilemma"**:
1. Basic brokerage apps show backward-looking P&L and simple volatility, completely failing to reveal hidden tail risks, correlation spikes, or sector concentrations.
2. Complex institutional systems or modern AI platforms often treat risk as an opaque number (e.g. *"Your Risk Score is 7.4/10"*), without explaining **why** the portfolio is risky, **which specific asset** is driving the danger, or **what exact trades** would fix it under real-world constraints.
3. Emerging GenAI tools frequently hallucinate financial calculations by mixing subjective news commentary directly into quantitative figures.

### The RiskLens Solution
**RiskLens** is an institutional-grade, explainable investment risk prediction and allocation platform. It enforces a strict **separation of concerns**:
- **Quantitative Engine (Ground Truth):** Calculates mathematically rigorous metrics—Annualized Volatility, Conditional Value-at-Risk (CVaR / Expected Shortfall), Maximum Drawdown, Sharpe/Sortino ratios, and exact **Euler Marginal Risk Contributions**.
- **Machine Learning (Predictive Classification):** A 20-feature Random Forest classifier predicts risk categories (`Low`, `Medium`, `High`) with calibrated confidence.
- **TreeSHAP Explainability:** Mathematically attributes the risk classification down to individual financial drivers (e.g., *Drawdown Volatility pushed risk up by +38%*).
- **Convex Portfolio Optimizer (CVXPY):** Solves constrained convex optimization problems (CVaR minimization and Mean-Variance) with regulatory guardrails (long-only, no leverage, max 60% per-asset cap), providing transparent *"Why This Weight?"* qualitative rationales.
- **AI Market Intelligence (Context-Only):** Combines live Finnhub news with the **Loughran-McDonald Financial Lexicon NLP engine** and Google Gemini AI to provide qualitative market catalysts without ever contaminating quantitative math.
- **Cloud Persistence:** Backed by MongoDB Atlas cloud database with real user holdings—**zero mock data for logged-in users**.

---

## 2. System Architecture & Pipeline Flow

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       RISKLENS SYSTEM TOPOLOGY                                     │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
   │                           FRONTEND: React 18 + Vite + Tailwind CSS                          │
   │      [Overview] • [Portfolio Builder] • [Risk Analysis] • [Optimizer] • [Backtesting]       │
   │             [Stress Lab] • [Market Intelligence] • [Reports] • [Auth / Register]            │
   └──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                  │ REST / JSON (JWT Authenticated)
                                                  ▼
   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
   │                         BACKEND: FastAPI High-Performance Asynchronous Core                 │
   │                                     (Uvicorn • Python 3.11)                                 │
   └───────────────┬──────────────────────────────┬───────────────────────────────┬──────────────┘
                   │                              │                               │
                   ▼                              ▼                               ▼
    ┌─────────────────────────────┐┌─────────────────────────────┐┌──────────────────────────────┐
    │    QUANTITATIVE ENGINE      ││     MACHINE LEARNING        ││      CONVEX OPTIMIZER        │
    │  (Strict Source of Truth)   ││    (Classification & XAI)   ││           (CVXPY)            │
    ├─────────────────────────────┤├─────────────────────────────┤├──────────────────────────────┤
    │ • 252-Day Annualized Vol    ││ • Random Forest Classifier  ││ • Expected Shortfall (CVaR)   │
    │ • Hist. VaR (95% & 99%)     ││ • 20 Engineered Features    ││ • Long-Only (w_i >= 0)       │
    │ • Expected Shortfall (CVaR) ││ • Calibrated Probabilities  ││ • Full Investment (Σw_i = 1) │
    │ • Sortino & Sharpe Ratios   ││ • TreeSHAP Attribution      ││ • Max Asset Cap (<= 60%)     │
    │ • Euler Risk Decomposition  ││ • Retail XAI Explanations   ││ • 4-Strategy Multi-Compare   │
    │ • Jensen's Alpha & Beta     ││                             ││ • "Why This Weight?" Engine  │
    └──────────────┬──────────────┘└──────────────┬──────────────┘└──────────────┬───────────────┘
                   │                              │                               │
                   └──────────────────────────────┼───────────────────────────────┘
                                                  │
                                                  ▼
   ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
   │                                  DATA & PERSISTENCE LAYER                                   │
   ├──────────────────────────────┬──────────────────────────────┬───────────────────────────────┤
   │      MongoDB Atlas Cloud     │     Market Data Adapter      │     AI Market Intelligence    │
   │  • User Auth (BCrypt/JWT)    │  • yfinance (NSE + Global)   │  • Finnhub Live News Feed     │
   │  • Real Portfolios & Assets  │  • NIFTY 50 Benchmark        │  • Loughran-McDonald NLP      │
   │  • Analysis Run History      │  • Multi-Tier Memory Cache   │  • Google Gemini AI Fallback  │
   └──────────────────────────────┴──────────────────────────────┴───────────────────────────────┘
```

---

## 3. Core Feature Walkthrough (What Judges See on Screen)

### 1. Institutional Authentication & Live Cloud Storage
- Secure registration and login backed by **MongoDB Atlas** (`risklens` database).
- Zero mock numbers: Real stock holdings, transaction prices, and risk preferences stored per authenticated user.
- Seamless guest fallback for live demo evaluations.

### 2. Live Market Data & Indian Large-Cap Universe
- Curated 12-ticker Indian NSE blue-chip equities (`RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `INFY.NS`, `ICICIBANK.NS`, `ITC.NS`, `BHARTIARTL.NS`, `LT.NS`, `SBIN.NS`, `HINDUNILVR.NS`, `ONGC.NS`, `SUNPHARMA.NS`).
- Real-time quote lookups and dynamic global ticker expansion (`AAPL`, `MSFT`, `GOOGL`, etc.).
- Benchmark alignment against Indian benchmark index **NIFTY 50 (`^NSEI`)**.

### 3. Quantitative Risk Engine & Euler Risk Contribution
- **Risk Metrics:** Annualized returns, standard deviation, max drawdown with high-water marks, semi-deviation (downside risk thresholded at 6.5% risk-free rate), historical VaR (95%/99%), and CVaR.
- **Euler Decomposition:** Computes exact Marginal Risk Contribution ($\text{MRC}_i$) showing how much volatility each stock adds to total portfolio variance ($w_i \cdot \frac{\partial \sigma_p}{\partial w_i}$). Unveils "hidden risk hogs" where a 15% weight asset contributes 35% of total portfolio risk!

### 4. ML Risk Classifier & TreeSHAP Explainability
- Trained Random Forest classifier categorizes portfolio risk into `Low`, `Medium`, or `High`.
- Generates exact **SHAP (SHapley Additive exPlanations)** waterfall rankings that explain *which exact feature* pushed the portfolio into its risk bracket.
- Plain-English translations generated automatically for retail comprehension.

### 5. CVXPY Allocation Lab & "Why This Weight?"
- Employs convex programming to compute optimal risk-adjusted weights.
- Enforces strict regulatory parameters: Long-only ($w_i \ge 0$), full investment ($\sum w_i = 1$), per-asset cap ($\le 60\%$), and sector concentration limits.
- Simultaneous 4-strategy matrix:
  1. **Original Allocation** (User's active holdings)
  2. **Recommended Allocation** (CVaR risk-optimized)
  3. **Equal-Weight Benchmark** ($1/N$ baseline)
  4. **Market Benchmark** (NIFTY 50 `^NSEI`)
- Provides human-readable *"Why This Weight?"* rationales for every asset trade.

### 6. Historical Backtesting Engine
- Multi-period strategy replay across custom timeframes.
- Dynamic rebalancing frequencies: `buy_and_hold`, `monthly`, `quarterly`, `annual`.
- Realistic transaction drag (0.1% slippage/turnover penalty).
- Visualizes growth indices ($100k normalized), cumulative returns, and continuous rolling drawdowns.

### 7. Stress Lab & Crisis Scenario Simulator
- Historical replay of landmark crashes:
  - **COVID-19 Crash (March 2020)**
  - **Tech Sector De-Rating (-35%)**
  - **Banking Liquidity Crisis (-25%)**
  - **Macro Bear Market (-20%) & Cyclical Correction (-10%)**
  - **Volatility Shock (2.5x Multiplier)**
- Custom stress testing: Simulate arbitrary market drops and sector-specific shocks with asset beta sensitivity adjustments.
- Mandatory compliance watermark: Explicitly tagged as `Hypothetical Estimate`.

### 8. AI Market Intelligence & Financial Sentiment NLP
- Live Finnhub news stream tagged by asset and sector.
- Powered by **Loughran-McDonald Financial Lexicon NLP Engine** with fast Google Gemini AI fallback.
- Detects market catalysts: M&A, Earnings, Legal/Regulatory, Macro Policy.
- Strict compliance guardrail: Sentiment is contextual only and never mutates quantitative risk figures.

---

## 4. The Mathematical & Financial Foundations

| Metric | Mathematical Definition | Financial Purpose |
| :--- | :--- | :--- |
| **Annualized Volatility** | $\sigma_{\text{ann}} = \sigma_{\text{daily}} \times \sqrt{252}$ | Standard business-day convention measuring annualized total portfolio dispersion. |
| **Downside Semi-Deviation** | $\sqrt{\frac{1}{N}\sum_{t=1}^N \min(R_t - R_f, 0)^2}$ | Penalizes only negative volatility below the 6.5% risk-free rate; ignores upside volatility. |
| **Historical VaR (95%)** | $\text{VaR}_{0.95} = -\text{Percentile}(R, 5\%)$ | The threshold loss that will not be exceeded with 95% statistical confidence over 1 day. |
| **Conditional VaR (CVaR)** | $\text{CVaR}_\alpha = -\mathbb{E}[R \mid R \le -\text{VaR}_\alpha]$ | The **Expected Shortfall**; measures the average loss on the days when VaR is breached. |
| **Sharpe Ratio** | $\frac{R_p - R_f}{\sigma_p}$ | Risk-adjusted return against total volatility using RBI 6.5% repo baseline. |
| **Sortino Ratio** | $\frac{R_p - R_f}{\text{Semi-Deviation}}$ | Risk-adjusted return against downside volatility only (preferred by hedge funds). |
| **Euler Marginal Risk** | $\text{MRC}_i = \frac{(\Sigma w)_i}{\sigma_p}$ | The change in total portfolio standard deviation caused by a 1% increase in asset $i$'s weight. |
| **Percentage Risk Contribution** | $\%RC_i = \frac{w_i \times \text{MRC}_i}{\sigma_p} \times 100$ | Exact additive decomposition; ensures $\sum \%RC_i = 100\%$. Identifies true risk drivers. |
| **Herfindahl Index (HHI)** | $\sum_{i=1}^n w_i^2$ | Quantifies capital concentration ($1/N$ = perfectly diversified, $1.0$ = single-asset concentration). |

---

## 5. 4-Minute Presentation Script & Live Demo Guide

| Time | Slide / Screen | Speaker Dialogue & Key Actions |
| :--- | :--- | :--- |
| **0:00 – 0:45** | **Problem & Hook** (Slide / Home) | *"Judges, when retail investors buy 5 stocks across tech and banking, they think they are diversified. But during the 2020 crash or a liquidity squeeze, correlations spike to 0.9, and their portfolio drops 35%. Existing brokerage apps only show trailing P&L. RiskLens solves the black-box dilemma: we show what drives your portfolio risk—before the market crashes."* |
| **0:45 – 1:30** | **Live Portfolio & Quant Engine** (`/overview` & `/risk`) | *(Action: Show active portfolio with Reliance, TCS, HDFC Bank).*<br>*"Here is our live dashboard connected to MongoDB Atlas and real NSE market data. Our Quantitative Engine computes 252-day annualized metrics, 95% and 99% Value-at-Risk, and Expected Shortfall. Notice this Euler Risk Decomposition chart: Reliance is only 25% of capital, but contributes 42% of total portfolio volatility due to its covariance structure."* |
| **1:30 – 2:30** | **ML Classifier & TreeSHAP** (`/risk`) | *(Action: Scroll to ML Risk Card and SHAP Feature Importance).*<br>*"Next, our Machine Learning engine: a Random Forest classifier evaluates 20 statistical features and classifies this portfolio as 'Medium Risk' with 78% confidence. But we don't stop at a score. We run TreeSHAP to explain why: 30-day downside semi-deviation and sector concentration are the two primary drivers pushing risk upward, explained in plain English for retail users."* |
| **2:30 – 3:15** | **CVXPY Optimizer & Comparison** (`/optimizer`) | *(Action: Click Optimize Portfolio).*<br>*"Now, how does the user fix this? We use CVXPY convex optimization to minimize Expected Shortfall under regulatory constraints: long-only, 100% invested, and max 60% concentration caps. The system immediately compares 4 strategies: Original, Optimized, Equal-Weight, and NIFTY 50. Notice our automated 'Why This Weight?' commentary explains every rebalancing trade."* |
| **3:15 – 3:45** | **Stress Lab & Market Intelligence** (`/scenarios` & `/intelligence`) | *(Action: Switch to Scenario Simulator, trigger COVID Crash).*<br>*"Under our Stress Lab, we simulate historical shocks like the COVID March 2020 crash using historical betas. In our Market Intelligence feed, live Finnhub news is analyzed using Loughran-McDonald financial NLP, surfacing qualitative risk catalysts without ever hallucinating our quantitative math."* |
| **3:45 – 4:00** | **Conclusion & Impact** | *"RiskLens combines institutional quant finance, explainable machine learning, and convex optimization in a production-grade web application. Thank you, and we welcome your questions!"* |

---

## 6. Comprehensive Judges Q&A Bank (18 Strategic Defenses)

### Category A: Quantitative Finance & Mathematical Integrity

#### Q1: "Why do you use Conditional Value-at-Risk (CVaR) instead of standard Value-at-Risk (VaR)?"
> **Answer:**  
> "VaR has a major mathematical flaw: it is **not a coherent risk measure** because it is not sub-additive. VaR only tells you the minimum threshold loss at the 95th percentile, but tells you absolutely nothing about the magnitude of losses in the tail beyond that threshold.  
> **CVaR (Expected Shortfall)** computes the conditional expectation of losses *given* that the loss exceeds VaR ($\mathbb{E}[L \mid L \ge \text{VaR}_\alpha]$). It is sub-additive, convex, and captures fat-tailed distributions common in financial crashes. Furthermore, CVaR can be efficiently minimized using convex linear programming in CVXPY, whereas VaR optimization is NP-hard and non-convex."

#### Q2: "Explain your Euler Risk Contribution formula. How is it calculated?"
> **Answer:**  
> "Euler's homogeneous function theorem states that for a linearly homogeneous function like portfolio standard deviation $\sigma_p(w)$, the total risk can be decomposed into:
> $$\sigma_p = \sum_{i=1}^n w_i \frac{\partial \sigma_p}{\partial w_i}$$
> The Marginal Risk Contribution ($\text{MRC}_i$) of asset $i$ is calculated as:
> $$\text{MRC}_i = \frac{(\Sigma w)_i}{\sigma_p}$$
> where $\Sigma$ is the covariance matrix and $w$ is the weight vector. Multiplying by weight $w_i$ yields the absolute risk contribution, and dividing by $\sigma_p$ gives the exact percentage risk contribution ($\%RC_i$). This guarantees that the sum of percentage risk contributions equals exactly 100%, allowing us to identify assets whose risk contribution significantly outstrips their capital weight."

#### Q3: "What risk-free rate do you use, and why?"
> **Answer:**  
> "We use **6.5% annualised**, which reflects the prevailing Reserve Bank of India (RBI) repo rate convention for Indian rupee-denominated assets. This baseline is applied consistently across Sharpe ratio, Sortino semi-deviation thresholding, and Jensen's Alpha against the NIFTY 50 index."

#### Q4: "How do you handle correlation breakdown during market crashes?"
> **Answer:**  
> "During stress events, asset correlations typically spike towards 1.0, destroying historical diversification benefits. We address this directly in our **Stress Lab (Phase 11)**: rather than assuming static historical correlation, our stress simulator models market-wide beta shocks and volatility multipliers (up to 2.5x), accurately re-estimating portfolio drawdowns when assets move synchronously."

#### Q5: "Why do you use 252 business days instead of 365 calendar days for annualization?"
> **Answer:**  
> "Equity markets (NSE, BSE, NYSE) are only open approximately 252 trading days per year after subtracting weekends and market holidays. Standardizing by $\sqrt{252}$ is the universal institutional standard (CFA Institute convention) to avoid artificially diluting daily volatility."

---

### Category B: Machine Learning & Explainable AI (XAI)

#### Q6: "Why did you choose Random Forest over Deep Learning (LSTM, Transformers) for risk classification?"
> **Answer:**  
> "For tabular financial features with 20 engineered metrics, ensemble tree models (Random Forest / XGBoost) consistently outperform deep neural networks in sample efficiency, resistance to overfitting, and inference speed.  
> More importantly, **explainability is a non-negotiable requirement** for regulatory financial systems. Random Forest enables exact, mathematically grounded **TreeSHAP** computation in polynomial time ($O(TLD^2)$), allowing us to provide verifiable Shapley additive explanations for every classification. Neural networks rely on gradient-based approximations like Integrated Gradients, which are computationally expensive, noisy, and uncalibrated on tabular ratios."

#### Q7: "How did you prevent lookahead bias and data leakage during ML training?"
> **Answer:**  
> "We enforced strict temporal train/validation splitting using chronological forward windows rather than random k-fold shuffling. All statistical features (rolling volatility, drawdown, semi-deviation) were engineered strictly using backward-looking windows ($t-k$ to $t$). No future price information was present in feature calculations."

#### Q8: "How does SHAP explain your model predictions to non-technical retail users?"
> **Answer:**  
> "TreeSHAP calculates the exact marginal contribution of each feature to the difference between the base value (average portfolio prediction) and the actual prediction:
> $$f(x) = \phi_0 + \sum_{i=1}^M \phi_i$$
> While our technical view exposes exact Shapley values and feature rankings, our UI translates this into plain language. For example, if $\phi_{\text{drawdown}} = +0.28$, RiskLens displays: *'Recent peak-to-trough decline (24.1%) was the largest driver pushing your portfolio into High Risk (+28% impact)'*."

---

### Category C: Optimization & Mathematical Constraints

#### Q9: "How does your optimizer prevent unrealistic portfolio recommendations?"
> **Answer:**  
> "Traditional Mean-Variance optimizers often produce extreme, concentrated allocations (e.g. 98% in a single high-Sharpe stock). We enforce five strict convex constraints in **CVXPY**:
> 1. **Long-Only:** $w_i \ge 0$ (no short selling or borrowing).
> 2. **Full Investment:** $\sum_{i=1}^n w_i = 1.0$ (no uninvested cash drag).
> 3. **Single-Asset Cap:** $w_i \le 0.60$ (default 60% maximum cap to enforce diversification).
> 4. **Sector Concentration Limit:** Sector aggregate $\sum_{i \in \text{sector}} w_i \le 0.70$.
> 5. **CVaR Minimization:** Formulated as a convex linear program using Rockafellar-Uryasev auxiliary variables, guaranteeing global convergence without local-minima traps."

#### Q10: "What is your 'Why This Weight?' explanation engine?"
> **Answer:**  
> "Instead of simply displaying new weights, RiskLens analyzes the delta ($\Delta w_i = w_i^{\text{rec}} - w_i^{\text{orig}}$) against asset covariance and risk contributions:
> - If an asset is trimmed: It states whether it was capped by single-asset concentration or due to disproportionate Euler risk contribution.
> - If an asset is boosted: It explains the diversification benefit (low correlation with high-volatility holdings) and tail-loss reduction.
> This demystifies the optimizer's decisions for institutional clients and retail investors alike."

---

### Category D: Engineering, Architecture & Reliability

#### Q11: "What happens if external APIs (Finnhub, Gemini, Yahoo Finance) fail or rate-limit?"
> **Answer:**  
> "We built multi-tiered fallback pipelines across every external touchpoint:
> 1. **Market Data:** Cached historical price series in memory; fallback to local synthetic quotes if Yahoo Finance blocks requests.
> 2. **AI News & Sentiment:** If Google Gemini hits rate limits (HTTP 429), the system instantly falls back to the local **Loughran-McDonald Financial Lexicon NLP engine**, which runs in < 2ms without external API calls.
> 3. **Database:** If MongoDB Atlas experiences a brief network partition, the backend continues in stateless read-only mode while logging the event."

#### Q12: "How do you guarantee that AI sentiment does not hallucinate or alter financial metrics?"
> **Answer:**  
> "We enforced an architectural **one-way boundary**:
> - The Quantitative Risk Engine (`risk_metrics.py`) and CVXPY Optimizer (`portfolio_optimizer.py`) have **zero dependencies** on NLP or LLM modules.
> - Sentiment outputs are strictly typed under `context_only: true` and rendered in the UI with a compliance disclaimer: *'Supplemental qualitative market intelligence only; does not alter quant risk metrics or return calculations.'*"

#### Q13: "How is user data secured and stored?"
> **Answer:**  
> "All user credentials use standard **BCrypt password hashing** (salt rounds 12). Authentication issues signed **JWT tokens** with expiration. User portfolios and historical analysis runs are stored in encrypted **MongoDB Atlas** clusters using TLS 1.3 with automated connection retry logic."

---

### Category E: Product, Compliance & Business Viability

#### Q14: "Is RiskLens compliant with financial advisory regulations (like SEBI or SEC)?"
> **Answer:**  
> "Yes. Under SEBI / SEC guidelines, tools that provide algorithmic analysis are categorized as **Analytical & Decision-Support Tools**, provided they do not execute trades on behalf of users without explicit consent.  
> RiskLens strictly displays:
> - Clear educational disclaimers (*'Hypothetical Estimate'* labels on all scenario simulations).
> - Transparent assumptions (data freshness, 252-day business convention, risk-free rate disclosure).
> - Audit trails showing the mathematical methodology behind every recommendation."

#### Q15: "What is your commercialization roadmap and monetization strategy?"
> **Answer:**  
> "We target a B2B2C model:
> 1. **Freemium Retail Tier:** Core portfolio builder, basic quant metrics, and educational SHAP explanations.
> 2. **Pro Investor Tier (SaaS):** Advanced CVXPY custom constraint optimization, multi-crisis stress testing, and real-time Finnhub/Gemini news intelligence.
> 3. **WealthTech B2B API:** Licensing our explainable risk prediction and Euler decomposition engine to digital wealth platforms, mutual fund distributors, and PMS providers."

#### Q16: "How did you validate your calculations for mathematical correctness?"
> **Answer:**  
> "Our codebase is validated by an automated test suite of **39 passing unit and end-to-end integration tests** (`pytest tests/ -v`). We validated:
> - Euler risk contributions strictly sum to total portfolio volatility ($\sum w_i \cdot \text{MRC}_i = \sigma_p$).
> - CVXPY weights strictly satisfy $\sum w_i = 1.0$ and $w_i \ge 0$.
> - Downside semi-deviation matches manual calculations under negative return deviations.
> - Sharpe and Sortino ratios match benchmark financial libraries (such as `scipy` and `numpy`)."

---

## 7. Metrics & Formula Cheat Sheet (For Quick Recall During Pitch)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              KEY NUMERICAL PARAMETERS                                  │
├────────────────────────────────┬───────────────────────────────────────────────────────┤
│ Risk-Free Rate ($R_f$)         │ 6.5% annualised (RBI Repo Rate convention)            │
│ Trading Days ($N$)             │ 252 business days / year                              │
│ VaR Confidence Levels          │ 95% ($\alpha = 0.05$) and 99% ($\alpha = 0.01$)       │
│ Max Single Asset Cap           │ 60% (Default regulatory diversification guardrail)    │
│ Max Sector Cap                 │ 70% (Aggregate industry exposure ceiling)             │
│ Transaction Drag Penalty       │ 0.10% (10 bps) per turnover during rebalancing        │
│ Finnhub Cache TTL              │ 300 seconds (5 minutes)                               │
│ Unit Test Coverage             │ 39 / 39 Passing (100% test suite completion)          │
└────────────────────────────────┴───────────────────────────────────────────────────────┘
```

---

## 8. Presentation Checklist

- [ ] Backend running on `http://127.0.0.1:8000` with active MongoDB connection (`GET /health` returns `database: "connected"`).
- [ ] Frontend running on `http://localhost:5173`.
- [ ] Have an active registered user or sample portfolio loaded with 3–4 assets across different sectors (`RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `SUNPHARMA.NS`).
- [ ] Tab ready on **Risk Analysis** page showing the **Euler Risk Breakdown** and **SHAP waterfall chart**.
- [ ] Tab ready on **Allocation Optimizer** showing the **4-Strategy Comparison** and **"Why This Weight?"** panel.
- [ ] Tab ready on **Scenario Simulator** to demonstrate the **COVID-19 Crash Replay**.
- [ ] Keep this cheat sheet handy during the judges' Q&A round!
