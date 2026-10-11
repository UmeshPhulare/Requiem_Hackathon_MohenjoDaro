# ============================================================
# RiskLens — Pydantic Schemas: Historical Backtesting & Stress Lab
# Phase 10 & Phase 11
# ============================================================

from datetime import date
from typing import Any, Optional
from pydantic import BaseModel, Field, model_validator


class BacktestRequest(BaseModel):
    """Payload for POST /api/backtests."""
    symbols:         list[str]         = Field(..., min_length=1, description="Portfolio symbols")
    weights:         dict[str, float]  = Field(..., description="Allocation weights summing to 1.0 ± 0.5%")
    benchmark:       str               = Field("^NSEI", description="Benchmark symbol (default: NIFTY 50)")
    initial_capital: float             = Field(1000000.0, gt=0, description="Starting portfolio capital in currency")
    start_date:      Optional[date]    = Field(None, description="Backtest start date")
    end_date:        Optional[date]    = Field(None, description="Backtest end date")
    rebalance_freq:  str               = Field("monthly", description="'buy_and_hold' | 'monthly' | 'quarterly' | 'annual'")
    tx_cost_pct:     float             = Field(0.001, ge=0.0, le=0.05, description="Per-turnover transaction cost fee (e.g. 0.001 = 0.1%)")
    risk_free_rate:  float             = Field(0.065, description="Annualized risk-free rate")

    @model_validator(mode="after")
    def check_weights(self) -> "BacktestRequest":
        norm_syms = [s.strip().upper() for s in self.symbols]
        norm_weights = {k.strip().upper(): v for k, v in self.weights.items()}
        extra = set(norm_weights.keys()) - set(norm_syms)
        missing = set(norm_syms) - set(norm_weights.keys())
        if extra or missing:
            raise ValueError(f"Weights keys must match symbols. Extra: {extra}, Missing: {missing}")
        return self


class BacktestMetrics(BaseModel):
    """Comprehensive performance and risk metrics evaluated over backtest simulation."""
    total_return_pct:      float = Field(..., description="Cumulative percentage return over backtest period")
    cagr:                  float = Field(..., description="Compound annual growth rate")
    annualized_volatility: float = Field(..., description="Annualized standard deviation of daily returns")
    sharpe_ratio:          float = Field(..., description="Sharpe ratio against risk-free rate")
    sortino_ratio:         float = Field(..., description="Sortino ratio (downside risk only)")
    calmar_ratio:          float = Field(..., description="Calmar ratio (CAGR / |Max Drawdown|)")
    max_drawdown:          float = Field(..., description="Largest peak-to-trough decline")
    cvar_95:               float = Field(..., description="1-day Expected Shortfall / CVaR at 95%")
    win_rate_pct:          float = Field(..., description="Percentage of positive daily trading sessions")
    total_tx_costs:        float = Field(..., description="Total cumulative fees paid during rebalancing")
    final_value:           float = Field(..., description="Terminal portfolio wealth value")


class BacktestSeriesPoint(BaseModel):
    """Daily trajectory point for cumulative wealth and drawdown charts."""
    date:                 str
    portfolio_value:      float
    benchmark_value:      float
    drawdown:             float
    benchmark_drawdown:   float
    recommended_value:    Optional[float] = None
    equal_value:          Optional[float] = None
    recommended_drawdown: Optional[float] = None
    equal_drawdown:       Optional[float] = None


class StrategyBacktestSummary(BaseModel):
    """Summary of one strategy backtested over the period."""
    name:         str
    description:  str
    weights:      dict[str, float]
    metrics:      BacktestMetrics


class BacktestResponse(BaseModel):
    """Response returned from POST /api/backtests."""
    start_date:      str
    end_date:        str
    trading_days:    int
    initial_capital: float
    rebalance_freq:  str
    tx_cost_pct:     float
    strategies:      dict[str, StrategyBacktestSummary]
    series:          list[BacktestSeriesPoint]
    data_source:     str       = "yfinance"
    warnings:        list[str] = Field(default_factory=list)


# ── Stress Lab / Scenario Schemas (Phase 11) ───────────────────────────────────

class ScenarioShockParams(BaseModel):
    """Parameters defining custom market/sector/asset shocks."""
    market_shock:   float             = Field(0.0, description="Overall market shock fraction (e.g. -0.15 for -15%)")
    sector_shocks:  dict[str, float]  = Field(default_factory=dict, description="Sector shocks {sector: shock_fraction}")
    asset_shocks:   dict[str, float]  = Field(default_factory=dict, description="Single asset shocks {symbol: shock_fraction}")
    vol_multiplier: float             = Field(1.0, ge=0.5, le=5.0, description="Multiplier for post-shock volatility regime")


class ScenarioRequest(BaseModel):
    """Payload for POST /api/scenarios."""
    symbols:      list[str]                      = Field(..., min_length=1)
    weights:      dict[str, float]               = Field(...)
    capital:      float                          = Field(1000000.0, gt=0)
    scenario_id:  str                            = Field("mild_correction", description="Preset ID or 'custom'")
    params:       Optional[ScenarioShockParams]  = None
    benchmark:    str                            = Field("^NSEI")


class AssetShockImpact(BaseModel):
    """Individual holding impact breakdown under simulated stress."""
    symbol:                   str
    name:                     str
    sector:                   str
    weight:                   float
    pre_value:                float
    post_value:               float
    return_impact_pct:        float
    contribution_to_loss_pct: float


class ScenarioResponse(BaseModel):
    """Response returned from POST /api/scenarios."""
    scenario_id:          str
    scenario_name:        str
    description:          str
    is_hypothetical:      bool  = True
    pre_shock_value:      float
    post_shock_value:     float
    portfolio_impact_pct: float
    benchmark_impact_pct: float
    stressed_volatility:  float
    stressed_var_95:      float
    stressed_cvar_95:     float
    asset_impacts:        list[AssetShockImpact]
    ai_stress_briefing:   Optional[str] = None
    disclaimer:           str   = "Hypothetical Estimate — Past scenarios and stress projections are mathematical models, not guaranteed outcomes."
    data_as_of:           Optional[str] = None
    warnings:             list[str]     = Field(default_factory=list)
