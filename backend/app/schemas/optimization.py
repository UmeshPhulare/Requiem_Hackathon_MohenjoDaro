# ============================================================
# RiskLens — Pydantic Schemas: Allocation Optimization & Strategy Comparison
# Phase 4 & Phase 9
# ============================================================

from datetime import date
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


class OptimizationRequest(BaseModel):
    """Payload for POST /api/portfolio/optimize."""
    symbols:          list[str]         = Field(..., min_length=2, description="Portfolio ticker symbols (minimum 2)")
    weights:          dict[str, float]  = Field(..., description="Current weights summing to 1.0 ± 0.5%")
    capital:          float             = Field(100000.0, gt=0, description="Total investment capital in currency (default: 100,000)")
    risk_preference:  str               = Field("Moderate", description="Conservative | Moderate | Aggressive")
    benchmark:        str               = Field("^NSEI", description="Benchmark symbol (default: NIFTY 50)")
    max_asset_weight: float             = Field(0.40, ge=0.10, le=1.0, description="Maximum allocation allowed for any single asset (e.g. 0.40 for 40%)")
    start_date:       Optional[date]    = Field(None, description="Historical window start date")
    end_date:         Optional[date]    = Field(None, description="Historical window end date")
    risk_free_rate:   float             = Field(0.065, description="Annualized risk-free rate (e.g. 0.065 for 6.5%)")

    @model_validator(mode="after")
    def check_weights_keys_match(self) -> "OptimizationRequest":
        norm_syms = [s.strip().upper() for s in self.symbols]
        norm_weights = {k.strip().upper(): v for k, v in self.weights.items()}
        extra = set(norm_weights.keys()) - set(norm_syms)
        missing = set(norm_syms) - set(norm_weights.keys())
        if extra or missing:
            raise ValueError(f"Weights keys must match symbols. Extra: {extra}, Missing: {missing}")
        return self


class StrategyMetrics(BaseModel):
    """Core financial metrics evaluated for a strategy."""
    annualized_return:     float
    annualized_volatility: float
    sharpe_ratio:          float
    sortino_ratio:         float
    max_drawdown:          float
    cvar_95:               float
    hhi_concentration:     float


class GrowthPoint(BaseModel):
    """Growth trajectory point for multi-strategy charting."""
    date:  str
    value: float


class StrategyDetail(BaseModel):
    """Complete detail for one compared strategy."""
    name:           str
    description:    str
    weights:        dict[str, float]
    target_amounts: dict[str, float]
    metrics:        StrategyMetrics
    growth_series:  list[GrowthPoint] = Field(default_factory=list)


class WeightExplanation(BaseModel):
    """Detailed 'Why This Weight?' explanation for one asset holding."""
    symbol:             str
    name:               str
    current_weight:     float
    recommended_weight: float
    weight_delta:       float
    target_amount:      float
    reason:             str
    volatility:         float
    sharpe_ratio:       float
    avg_correlation:    float


class EfficientFrontierPoint(BaseModel):
    """Monte Carlo simulation point for risk-return efficient frontier chart."""
    risk:         float
    return_rate:  float
    sharpe_ratio: float


class TradeOffsSummary(BaseModel):
    """Comparative trade-off summary between Current vs Recommended."""
    volatility_change_pct: float
    return_change_pct:     float
    sharpe_change:         float
    cvar_reduction_pct:    float
    hhi_change:            float
    narrative:             str
    ai_narrative:          Optional[str] = None


class OptimizationResponse(BaseModel):
    """Full response from POST /api/portfolio/optimize."""
    objective:                str
    risk_preference:          str
    capital:                  float
    strategies:               dict[str, StrategyDetail]
    weight_explanations:      list[WeightExplanation]
    trade_offs_summary:       TradeOffsSummary
    efficient_frontier:       list[EfficientFrontierPoint] = Field(default_factory=list)
    data_source:              str                          = "yfinance"
    data_as_of:               Optional[str]                = None
    warnings:                 list[str]                    = Field(default_factory=list)


# ── Strategy Comparison Schemas (Phase 4: /api/analysis/compare) ───────────────

class CompareRequest(BaseModel):
    """Payload for POST /api/analysis/compare."""
    symbols:        list[str]         = Field(..., min_length=2)
    weights:        dict[str, float]  = Field(...)
    benchmark:      str               = Field("^NSEI")
    start_date:     Optional[date]    = Field(None)
    end_date:       Optional[date]    = Field(None)
    risk_free_rate: float             = Field(0.065)


class AssetPerformanceItem(BaseModel):
    """Individual asset comparison metrics."""
    symbol:                str
    name:                  str
    weight:                float
    annualized_return:     float
    annualized_volatility: float
    sharpe_ratio:          float
    max_drawdown:          float
    beta:                  float


class CompareResponse(BaseModel):
    """Response for POST /api/analysis/compare."""
    assets:              list[AssetPerformanceItem]
    correlation_matrix:  dict[str, dict[str, float]]
    strategies:          dict[str, StrategyDetail]
    data_as_of:          Optional[str]             = None
    warnings:            list[str]                 = Field(default_factory=list)
