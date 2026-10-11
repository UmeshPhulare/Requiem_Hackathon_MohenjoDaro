# ============================================================
# RiskLens — Pydantic Schemas: Risk Analysis (Phase 1 + ML)
# Request / Response shapes for POST /api/analysis/risk
# ============================================================

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, model_validator


class RiskAnalysisRequest(BaseModel):
    """Request payload for POST /api/analysis/risk."""
    symbols:         list[str]         = Field(..., min_length=1, description="Ticker symbols from the supported universe")
    weights:         dict[str, float]  = Field(..., description="Allocation weights per ticker (must sum to 1.0 ± 0.5%)")
    benchmark:       str               = Field("^NSEI", description="Benchmark ticker (default: NIFTY 50)")
    start_date:      Optional[date]    = Field(None,  description="Historical window start (ISO date). Defaults to 5 years ago.")
    end_date:        Optional[date]    = Field(None,  description="Historical window end   (ISO date). Defaults to today.")
    risk_preference: str               = Field("Moderate", description="Conservative | Moderate | Aggressive")

    @model_validator(mode="after")
    def check_weights_keys_match_symbols(self) -> "RiskAnalysisRequest":
        extra   = set(self.weights.keys()) - set(self.symbols)
        missing = set(self.symbols) - set(self.weights.keys())
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


class HistoricalMetrics(BaseModel):
    """Key quantitative metrics computed from historical returns."""
    annualized_return:     float
    annualized_volatility: float
    max_drawdown:          float
    sharpe_ratio:          float
    var_95:                float
    cvar_95:               float
    beta:                  float
    downside_deviation:    float


class RiskAnalysisResponse(BaseModel):
    """Full response from POST /api/analysis/risk."""
    # ── ML prediction ──────────────────────────────────────────────────────
    risk_class:                   str
    class_id:                     int
    probabilities:                dict[str, float]
    prediction_horizon_trading_days: int           = 20
    model_version:                str

    # ── Quantitative metrics ────────────────────────────────────────────────
    historical_metrics:           HistoricalMetrics
    features_used:                dict[str, float]

    # ── Explanations ────────────────────────────────────────────────────────
    explanations:                 list[FeatureExplanation]

    # ── Data provenance ─────────────────────────────────────────────────────
    data_source:  str  = "yfinance"
    data_as_of:   Optional[str] = None
    data_status:  str  = "fresh"
    warnings:     list[str] = Field(default_factory=list)
