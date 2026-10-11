# ============================================================
# RiskLens — Pydantic Schemas: Risk Analysis (Phase 1 & 2)
# Quantitative Risk Engine & ML Inference Schemas
# ============================================================

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class RiskAnalysisRequest(BaseModel):
    """Request payload for POST /api/analysis/risk and /api/analysis/quant."""
    symbols:         list[str]         = Field(..., min_length=1, description="Ticker symbols, e.g. ['RELIANCE.NS', 'TCS.NS']")
    weights:         dict[str, float]  = Field(..., description="Allocation weights per ticker (must sum to 1.0 ± 0.5%)")
    benchmark:       str               = Field("^NSEI", description="Benchmark ticker (default: NIFTY 50)")
    start_date:      Optional[date]    = Field(None,  description="Historical window start (ISO date). Defaults to 5 years ago.")
    end_date:        Optional[date]    = Field(None,  description="Historical window end   (ISO date). Defaults to today.")
    risk_preference: str               = Field("Moderate", description="Conservative | Moderate | Aggressive")
    risk_free_rate:  float             = Field(0.065, description="Annualized risk-free rate (e.g. 0.065 for 6.5% Indian 10y G-sec yield)")

    @model_validator(mode="after")
    def check_weights_keys_match_symbols(self) -> "RiskAnalysisRequest":
        # Case normalize
        norm_symbols = [s.strip().upper() for s in self.symbols]
        norm_weights = {k.strip().upper(): v for k, v in self.weights.items()}

        extra   = set(norm_weights.keys()) - set(norm_symbols)
        missing = set(norm_symbols) - set(norm_weights.keys())
        if extra or missing:
            raise ValueError(
                f"Weights keys must match symbols exactly. "
                f"Extra in weights: {extra}. Missing from weights: {missing}."
            )
        return self


class FeatureExplanation(BaseModel):
    """One SHAP / feature-importance explanation item."""
    feature:          str
    shap_value:       Optional[float]
    impact:           str            = Field(..., description="positive | negative")
    importance_score: float
    description:      str


class AssetRiskContribution(BaseModel):
    """Euler Risk Decomposition (Risk Attribution) for one portfolio holding."""
    symbol:                str   = Field(..., description="Ticker symbol")
    weight:                float = Field(..., description="Normalized portfolio weight")
    marginal_contribution: float = Field(..., description="Marginal Contribution to Risk (MCR)")
    risk_contribution:     float = Field(..., description="Absolute Risk Contribution (ARC)")
    risk_contribution_pct: float = Field(..., description="Percentage contribution to portfolio total volatility (%RC, sums to 100%)")


class DrawdownPoint(BaseModel):
    """Single date point in the historical drawdown series."""
    date:     str   = Field(..., description="ISO date string")
    drawdown: float = Field(..., description="Drawdown fraction (e.g. -0.12 for -12%)")


class QuantitativeMetrics(BaseModel):
    """Core mathematical metrics produced by the server-side Quantitative Risk Engine."""
    annualized_return:     float = Field(..., description="Compound annual growth rate (CAGR)")
    annualized_volatility: float = Field(..., description="Annualized standard deviation (daily std * sqrt(252))")
    sharpe_ratio:          float = Field(..., description="Sharpe ratio against specified risk-free rate")
    sortino_ratio:         float = Field(..., description="Sortino ratio penalizing only downside deviation")
    max_drawdown:          float = Field(..., description="Maximum peak-to-trough drop over period")
    downside_deviation:    float = Field(..., description="Annualized downside volatility")
    var_95:                float = Field(..., description="1-day Historical Value at Risk at 95% confidence")
    var_99:                float = Field(..., description="1-day Historical Value at Risk at 99% confidence")
    cvar_95:               float = Field(..., description="1-day Expected Shortfall / CVaR at 95% confidence")
    cvar_99:               float = Field(..., description="1-day Expected Shortfall / CVaR at 99% confidence")
    beta:                  float = Field(..., description="Portfolio beta sensitivity to benchmark")
    alpha:                 float = Field(..., description="Jensen's alpha annualized excess return")
    hhi_concentration:     float = Field(..., description="Herfindahl-Hirschman Index concentration score")


# Alias for backwards compatibility
HistoricalMetrics = QuantitativeMetrics


class QuantAnalysisResponse(BaseModel):
    """Response for POST /api/analysis/quant (pure Quantitative Risk Engine)."""
    metrics:             QuantitativeMetrics
    risk_contributions:  list[AssetRiskContribution]
    correlation_matrix:  dict[str, dict[str, float]]
    drawdown_series:     list[DrawdownPoint] = Field(default_factory=list)
    data_source:         str                 = "yfinance"
    data_as_of:          Optional[str]       = None
    data_status:         str                 = "fresh"
    warnings:            list[str]           = Field(default_factory=list)


class RiskAnalysisResponse(BaseModel):
    """Full unified response from POST /api/analysis/risk (ML + Quantitative Engine)."""
    model_config = {"protected_namespaces": ()}

    # ── ML prediction ──────────────────────────────────────────────────────
    risk_class:                      str
    class_id:                        int
    probabilities:                   dict[str, float]
    prediction_horizon_trading_days: int           = 20
    model_version:                   str


    # ── Quantitative engine results ─────────────────────────────────────────
    historical_metrics:              QuantitativeMetrics
    features_used:                   dict[str, float]
    risk_contributions:              list[AssetRiskContribution]
    correlation_matrix:              dict[str, dict[str, float]]

    # ── Explanations & AI Synthesis ─────────────────────────────────────────
    explanations:                    list[FeatureExplanation]
    ai_executive_briefing:           Optional[str] = None

    # ── Data provenance ─────────────────────────────────────────────────────
    data_source:                     str           = "yfinance"
    data_as_of:                      Optional[str] = None
    data_status:                     str           = "fresh"
    warnings:                        list[str]     = Field(default_factory=list)
