# ============================================================
# RiskLens — Unit Tests: Historical Backtesting & Stress Lab
# Phase 10 & Phase 11
# ============================================================

import numpy as np
import pandas as pd
import pytest

from app.services.finance.backtester import (
    simulate_strategy_path,
    run_multi_strategy_backtest,
    run_scenario_stress_test,
    get_asset_sector,
)


@pytest.fixture
def sample_market_data():
    """Synthetic returns for 3 assets + 1 benchmark over 252 trading days."""
    np.random.seed(42)
    dates = pd.date_range("2023-01-01", periods=252, freq="B")
    ret_a = np.random.normal(0.0005, 0.010, 252) # Low vol (FMCG)
    ret_b = np.random.normal(0.0008, 0.018, 252) # Moderate vol (Banking)
    ret_c = np.random.normal(0.0012, 0.024, 252) # High vol (Tech)
    bm = np.random.normal(0.0006, 0.012, 252)    # Market benchmark

    df = pd.DataFrame({"ITC.NS": ret_a, "HDFCBANK.NS": ret_b, "TCS.NS": ret_c}, index=dates)
    bm_series = pd.Series(bm, index=dates, name="^NSEI")
    return df, bm_series


def test_simulate_strategy_path_rebalancing(sample_market_data):
    """Test rebalancing frequencies and transaction cost impact."""
    df, _ = sample_market_data
    weights = {"ITC.NS": 0.4, "HDFCBANK.NS": 0.3, "TCS.NS": 0.3}

    # 1. Buy and hold
    res_bah = simulate_strategy_path(
        df, weights, initial_capital=1000000.0, rebalance_freq="buy_and_hold", tx_cost_pct=0.001
    )
    # 2. Monthly rebalanced
    res_monthly = simulate_strategy_path(
        df, weights, initial_capital=1000000.0, rebalance_freq="monthly", tx_cost_pct=0.001
    )

    # Monthly should pay rebalancing fees over time
    assert res_monthly["metrics"]["total_tx_costs"] >= res_bah["metrics"]["total_tx_costs"]
    assert res_monthly["metrics"]["final_value"] > 0
    assert len(res_monthly["values_series"]) == 252
    assert res_monthly["metrics"]["max_drawdown"] <= 0.0
    assert 0.0 <= res_monthly["metrics"]["win_rate_pct"] <= 100.0


def test_higher_tx_cost_reduces_returns(sample_market_data):
    """Higher transaction costs must penalize net terminal value."""
    df, _ = sample_market_data
    weights = {"ITC.NS": 0.33, "HDFCBANK.NS": 0.33, "TCS.NS": 0.34}

    low_cost = simulate_strategy_path(df, weights, initial_capital=1000000.0, rebalance_freq="monthly", tx_cost_pct=0.0005)
    high_cost = simulate_strategy_path(df, weights, initial_capital=1000000.0, rebalance_freq="monthly", tx_cost_pct=0.0100)

    assert low_cost["metrics"]["final_value"] > high_cost["metrics"]["final_value"]
    assert high_cost["metrics"]["total_tx_costs"] > low_cost["metrics"]["total_tx_costs"]


def test_multi_strategy_backtest(sample_market_data):
    """Ensure all 4 strategies (original, recommended, equal, benchmark) are backtested."""
    df, bm = sample_market_data
    weights = {"ITC.NS": 0.5, "HDFCBANK.NS": 0.25, "TCS.NS": 0.25}

    result = run_multi_strategy_backtest(
        returns_df=df,
        current_weights=weights,
        benchmark_returns=bm,
        initial_capital=1000000.0,
        rebalance_freq="monthly",
    )

    assert "strategies" in result
    assert "original" in result["strategies"]
    assert "recommended" in result["strategies"]
    assert "equal" in result["strategies"]
    assert "benchmark" in result["strategies"]

    assert len(result["series"]) > 0
    first_pt = result["series"][0]
    assert "portfolio_value" in first_pt
    assert "benchmark_value" in first_pt
    assert "drawdown" in first_pt
    assert "benchmark_drawdown" in first_pt


def test_scenario_stress_test_presets(sample_market_data):
    """Verify market shock calculations in stress lab presets."""
    df, bm = sample_market_data
    weights = {"ITC.NS": 0.4, "HDFCBANK.NS": 0.3, "TCS.NS": 0.3}

    res = run_scenario_stress_test(
        returns_df=df,
        weights=weights,
        capital=1000000.0,
        scenario_id="mild_correction",
        benchmark_returns=bm,
    )

    assert res["is_hypothetical"] is True
    assert res["portfolio_impact_pct"] < 0.0
    assert res["post_shock_value"] < res["pre_shock_value"]
    assert len(res["asset_impacts"]) == 3

    # Total loss contribution should sum to 100%
    loss_contribs = [item["contribution_to_loss_pct"] for item in res["asset_impacts"]]
    assert pytest.approx(sum(loss_contribs), 0.01) == 100.0

    # Stressed vol should be elevated
    assert res["stressed_volatility"] > 0


def test_scenario_stress_test_custom_shock(sample_market_data):
    """Custom shocks apply correctly to single assets and sectors."""
    df, bm = sample_market_data
    weights = {"ITC.NS": 0.5, "HDFCBANK.NS": 0.5, "TCS.NS": 0.0}

    custom_params = {
        "market_shock": -0.15,
        "sector_shocks": {"Banking & Finance": -0.10}, # extra -10% on banking
        "asset_shocks": {"ITC.NS": 0.05},              # +5% idiosyncratic gain on ITC
        "vol_multiplier": 2.0,
    }

    res = run_scenario_stress_test(
        returns_df=df,
        weights=weights,
        capital=500000.0,
        scenario_id="custom",
        params=custom_params,
        benchmark_returns=bm,
    )

    assert res["scenario_id"] == "custom"
    assert res["pre_shock_value"] == 500000.0
    assert "Hypothetical Estimate" in res["disclaimer"]


def test_get_asset_sector():
    """Verify sector mappings for Indian blue chips."""
    assert get_asset_sector("TCS.NS") == "Information Technology"
    assert get_asset_sector("HDFCBANK.NS") == "Banking & Finance"
    assert get_asset_sector("ITC.NS") == "Consumer Goods"
