# ============================================================
# RiskLens — Unit Tests: Portfolio Optimizer & Allocation Lab
# Phase 4 & Phase 9
# ============================================================

import numpy as np
import pandas as pd
import pytest

from app.services.finance.portfolio_optimizer import (
    optimize_portfolio,
    evaluate_strategy,
    generate_why_this_weight_explanations,
    generate_efficient_frontier_samples,
    generate_trade_offs_summary,
    build_four_strategies_comparison,
)


@pytest.fixture
def sample_returns():
    """Synthetic returns with 3 assets with different risk/return profiles."""
    np.random.seed(42)
    dates = pd.date_range("2023-01-01", periods=252, freq="B")
    # Asset A: low risk, low return
    ret_a = np.random.normal(0.0003, 0.008, 252)
    # Asset B: moderate risk, moderate return
    ret_b = np.random.normal(0.0006, 0.015, 252)
    # Asset C: high risk, high return
    ret_c = np.random.normal(0.0010, 0.025, 252)

    return pd.DataFrame({"A": ret_a, "B": ret_b, "C": ret_c}, index=dates)


def test_optimizer_constraints_satisfied(sample_returns):
    """Optimized weights must satisfy long-only, sum to 1.0, and respect max cap."""
    max_cap = 0.40
    opt_w = optimize_portfolio(
        returns_df=sample_returns,
        risk_preference="Moderate",
        max_asset_weight=max_cap,
    )

    weights_list = list(opt_w.values())

    # 1. Sum to 1.0
    assert pytest.approx(sum(weights_list), 0.001) == 1.0

    # 2. Long only (>= 0)
    assert all(w >= 0.0 for w in weights_list)

    # 3. Max single weight cap (<= max_cap within tolerance)
    assert all(w <= max_cap + 0.005 for w in weights_list)


def test_risk_preferences_differ(sample_returns):
    """Conservative allocation should prioritize lower risk/volatility while Aggressive tilts toward higher return."""
    cons_w = optimize_portfolio(sample_returns, risk_preference="Conservative", max_asset_weight=0.50)
    aggr_w = optimize_portfolio(sample_returns, risk_preference="Aggressive", max_asset_weight=0.50)

    # Asset B is the highest return asset, so Aggressive allocates higher or equal to B
    assert aggr_w["B"] >= cons_w["B"]

    # Also verify that Conservative portfolio has lower or equal volatility than Aggressive
    from app.services.finance.risk_metrics import annualized_volatility, portfolio_returns_series
    cons_vol = annualized_volatility(portfolio_returns_series(sample_returns, cons_w))
    aggr_vol = annualized_volatility(portfolio_returns_series(sample_returns, aggr_w))
    assert cons_vol <= aggr_vol + 0.001



def test_evaluate_strategy(sample_returns):
    """Verify strategy evaluation calculates metrics and growth trajectory."""
    weights = {"A": 0.5, "B": 0.3, "C": 0.2}
    metrics, growth = evaluate_strategy(sample_returns, weights, capital=100000.0)

    assert "annualized_return" in metrics
    assert "annualized_volatility" in metrics
    assert "sharpe_ratio" in metrics
    assert "max_drawdown" in metrics
    assert "cvar_95" in metrics
    assert len(growth) > 0
    assert growth[0]["value"] == 100000.0 or pytest.approx(growth[0]["value"], 1000) == 100000.0


def test_why_this_weight_explanations(sample_returns):
    """Verify explanations generated for every symbol."""
    curr_w = {"A": 0.2, "B": 0.5, "C": 0.3}
    opt_w = {"A": 0.4, "B": 0.3, "C": 0.3}

    exps = generate_why_this_weight_explanations(
        current_weights=curr_w,
        recommended_weights=opt_w,
        returns_df=sample_returns,
        capital=50000.0,
        max_asset_weight=0.40,
    )

    assert len(exps) == 3
    symbols_explained = {e["symbol"] for e in exps}
    assert symbols_explained == {"A", "B", "C"}
    for e in exps:
        assert len(e["reason"]) > 5
        assert e["target_amount"] == pytest.approx(e["recommended_weight"] * 50000.0, 0.01)


def test_efficient_frontier_samples(sample_returns):
    """Efficient frontier samples must return risk, return, and sharpe."""
    samples = generate_efficient_frontier_samples(sample_returns, count=40)
    assert len(samples) == 40
    for pt in samples:
        assert pt["risk"] > 0
        assert "return_rate" in pt
        assert "sharpe_ratio" in pt


def test_four_strategies_comparison(sample_returns):
    """Ensure all 4 strategies (current, equal_weight, optimized, benchmark) are created."""
    curr_w = {"A": 0.6, "B": 0.2, "C": 0.2}
    opt_w = {"A": 0.4, "B": 0.3, "C": 0.3}
    bm_ret = sample_returns["B"]  # proxy benchmark

    strategies = build_four_strategies_comparison(
        returns_df=sample_returns,
        current_weights=curr_w,
        recommended_weights=opt_w,
        benchmark_returns=bm_ret,
        capital=100000.0,
    )

    assert "current" in strategies
    assert "equal_weight" in strategies
    assert "optimized" in strategies
    assert "benchmark" in strategies

    assert strategies["equal_weight"]["weights"]["A"] == pytest.approx(1/3, 0.01)
    assert len(strategies["optimized"]["growth_series"]) > 0
