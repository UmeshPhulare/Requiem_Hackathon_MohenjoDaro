# ============================================================
# RiskLens — Unit Tests: Quantitative Risk Engine (Phase 2)
# ============================================================

import numpy as np
import pandas as pd
import pytest

from app.services.finance.risk_metrics import (
    annualized_return,
    annualized_volatility,
    max_drawdown,
    drawdown_series,
    sharpe_ratio,
    sortino_ratio,
    downside_deviation,
    historical_var,
    cvar,
    beta,
    alpha,
    hhi_concentration,
    asset_risk_contribution,
    compute_portfolio_metrics,
)
from app.utils.helpers import calc_returns, align_price_series, handle_missing_prices


def test_flat_prices_zero_vol_and_drawdown():
    """Flat prices must yield exactly zero volatility and zero drawdown."""
    dates = pd.date_range("2024-01-01", periods=100, freq="B")
    flat_returns = pd.Series(0.0, index=dates)

    assert annualized_volatility(flat_returns) == 0.0
    assert max_drawdown(flat_returns) == 0.0
    assert annualized_return(flat_returns) == 0.0


def test_max_drawdown_calculation():
    """Verify known drawdown scenario: 100 -> 120 -> 90 -> 110."""
    prices = pd.Series([100.0, 120.0, 90.0, 110.0])
    returns = prices.pct_change().dropna()
    # Peak is 120, trough is 90 -> Drawdown = (90 - 120) / 120 = -0.25 (-25%)
    mdd = max_drawdown(returns)
    assert pytest.approx(mdd, 0.001) == -0.25


def test_sharpe_ratio():
    """Verify Sharpe ratio = (R_ann - Rf) / Vol_ann."""
    # Synthetic daily returns with known mean and std
    np.random.seed(42)
    daily = pd.Series(np.random.normal(0.0008, 0.01, 252))
    vol = annualized_volatility(daily)
    ann_ret = annualized_return(daily)
    rf = 0.05
    expected_sharpe = (ann_ret - rf) / vol

    computed_sharpe = sharpe_ratio(daily, risk_free_rate=rf)
    assert pytest.approx(computed_sharpe, 0.001) == expected_sharpe


def test_sortino_ratio_handles_no_downside():
    """If all returns are strictly positive, downside deviation is 0 and Sortino is 0.0."""
    positive_returns = pd.Series([0.01, 0.02, 0.015, 0.005] * 20)
    assert downside_deviation(positive_returns, target_return=0.0) == 0.0
    assert sortino_ratio(positive_returns, risk_free_rate=0.0) == 0.0


def test_var_and_cvar():
    """CVaR must always be worse than (<=) VaR."""
    np.random.seed(42)
    returns = pd.Series(np.random.normal(0.0005, 0.015, 500))
    v95 = historical_var(returns, confidence_level=0.95)
    cv95 = cvar(returns, confidence_level=0.95)

    # VaR and CVaR are signed negative numbers
    assert v95 < 0.0
    assert cv95 <= v95


def test_beta_calculation():
    """Beta of market with itself must be 1.0; double market moves should yield beta ~ 2.0."""
    dates = pd.date_range("2024-01-01", periods=200, freq="B")
    market = pd.Series(np.random.normal(0.0005, 0.01, 200), index=dates)
    leveraged = market * 2.0

    assert pytest.approx(beta(market, market), 0.001) == 1.0
    assert pytest.approx(beta(leveraged, market), 0.001) == 2.0


def test_hhi_concentration():
    """Equal weights across 4 assets = 0.25; 100% in one asset = 1.0."""
    equal_weights = {"A": 0.25, "B": 0.25, "C": 0.25, "D": 0.25}
    single_weight = {"A": 1.0}

    assert pytest.approx(hhi_concentration(equal_weights), 0.001) == 0.25
    assert pytest.approx(hhi_concentration(single_weight), 0.001) == 1.0


def test_euler_risk_contribution_sums_to_100_percent():
    """The sum of percentage risk contributions (%RC) across all assets must equal 100%."""
    np.random.seed(42)
    dates = pd.date_range("2024-01-01", periods=252, freq="B")
    df_returns = pd.DataFrame({
        "A": np.random.normal(0.0005, 0.015, 252),
        "B": np.random.normal(0.0008, 0.020, 252),
        "C": np.random.normal(0.0003, 0.010, 252),
    }, index=dates)

    weights = {"A": 0.50, "B": 0.30, "C": 0.20}
    contributions = asset_risk_contribution(df_returns, weights)

    total_rc_pct = sum(item["risk_contribution_pct"] for item in contributions)
    assert pytest.approx(total_rc_pct, 0.01) == 100.0


def test_helpers_align_price_series():
    """Ensure align_price_series inner joins on common dates."""
    dates_a = pd.date_range("2024-01-01", "2024-01-10", freq="D")
    dates_b = pd.date_range("2024-01-05", "2024-01-15", freq="D")

    df_a = pd.DataFrame({"asset": range(len(dates_a))}, index=dates_a)
    series_b = pd.Series(range(len(dates_b)), index=dates_b)

    aligned_a, aligned_b = align_price_series(df_a, series_b)

    assert len(aligned_a) == 6
    assert len(aligned_b) == 6
    assert (aligned_a.index == aligned_b.index).all()


def test_helpers_missing_prices():
    """Ensure handle_missing_prices issues warning if missing exceeds 5%."""
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    df = pd.DataFrame({
        "good": [10.0] * 100,
        "bad": [10.0] * 80 + [np.nan] * 20,  # 20% missing
    }, index=dates)

    cleaned, warnings = handle_missing_prices(df, max_allowed_missing_pct=0.05)
    assert len(warnings) > 0
    assert "bad" in warnings[0]
