# ============================================================
# RiskLens — Historical Backtesting & Stress Lab Service
# Phase 10 & Phase 11
# Blueprint Ref: §5.5 — Backtesting, §5.6 — Stress Lab
# ============================================================

import logging
from typing import Any, Optional
import numpy as np
import pandas as pd

from app.services.finance.risk_metrics import (
    annualized_return,
    annualized_volatility,
    sharpe_ratio,
    sortino_ratio,
    max_drawdown,
    cvar,
    historical_var,
    beta,
)
from app.services.finance.portfolio_optimizer import optimize_portfolio
from app.services.market_data.yfinance_client import SUPPORTED_TICKERS
from app.services.ml.feature_engineering import SECTOR_MAP

logger = logging.getLogger(__name__)


# ── Canonical Sector Normalization ─────────────────────────────────────────────
SECTOR_NORMALIZE = {
    "IT": "Information Technology",
    "Banking": "Banking & Finance",
    "FMCG": "Consumer Goods",
    "Energy": "Energy & Petrochemicals",
    "Pharma": "Pharmaceuticals",
    "Infrastructure": "Infrastructure & Capital Goods",
    "Telecom": "Telecommunications",
}


def get_asset_sector(symbol: str) -> str:
    """Return human-readable sector name for an asset."""
    raw = SECTOR_MAP.get(symbol, "Other")
    return SECTOR_NORMALIZE.get(raw, raw)


# ── Historical Backtesting Engine ──────────────────────────────────────────────

def simulate_strategy_path(
    returns_df: pd.DataFrame,
    weights: dict[str, float],
    initial_capital: float = 1000000.0,
    rebalance_freq: str = "monthly",
    tx_cost_pct: float = 0.001,
    risk_free_rate: float = 0.065,
) -> dict[str, Any]:
    """
    Simulate a portfolio path accounting for drift, periodic rebalancing, and transaction fees.

    Args:
        returns_df: DataFrame of daily simple returns, columns = symbols, index = DatetimeIndex.
        weights: Target allocation weights summing to 1.0.
        initial_capital: Initial portfolio value.
        rebalance_freq: 'buy_and_hold' | 'monthly' | 'quarterly' | 'annual'
        tx_cost_pct: Proportional cost fee on rebalancing turnover.
        risk_free_rate: Annualized risk-free rate.

    Returns:
        dict containing 'metrics' and 'series' (date, portfolio_value, drawdown).
    """
    symbols = [s for s in returns_df.columns if s in weights]
    norm_w = np.array([weights[s] for s in symbols], dtype=float)
    total_w = np.sum(norm_w)
    if total_w > 0:
        norm_w = norm_w / total_w
    target_weights = {symbols[i]: norm_w[i] for i in range(len(symbols))}

    dates = returns_df.index
    T = len(dates)

    # Initial dollar holdings
    initial_fee = initial_capital * tx_cost_pct
    curr_capital = initial_capital - initial_fee
    total_fees = initial_fee

    holdings = np.array([target_weights[s] * curr_capital for s in symbols], dtype=float)

    portfolio_values = []
    portfolio_daily_returns = []

    last_month = dates[0].month
    last_quarter = (dates[0].month - 1) // 3 + 1
    last_year = dates[0].year

    for t in range(T):
        current_date = dates[t]
        daily_asset_ret = returns_df.loc[current_date, symbols].values

        # Asset values drift with daily returns
        holdings = holdings * (1.0 + daily_asset_ret)
        v_t = float(np.sum(holdings))

        # Check if rebalancing is triggered today (not on day 0)
        rebalance_due = False
        if t > 0:
            if rebalance_freq == "monthly" and current_date.month != last_month:
                rebalance_due = True
                last_month = current_date.month
            elif rebalance_freq == "quarterly":
                curr_q = (current_date.month - 1) // 3 + 1
                if curr_q != last_quarter:
                    rebalance_due = True
                    last_quarter = curr_q
            elif rebalance_freq == "annual" and current_date.year != last_year:
                rebalance_due = True
                last_year = current_date.year

        if rebalance_due and v_t > 0:
            drift_weights = holdings / v_t
            # Turnover = 0.5 * sum(|w_drift - w_target|)
            turnover = 0.5 * float(np.sum(np.abs(drift_weights - norm_w)))
            fee = v_t * turnover * tx_cost_pct
            total_fees += fee
            v_t = max(0.0, v_t - fee)
            holdings = norm_w * v_t

        prev_v = portfolio_values[-1] if portfolio_values else initial_capital
        r_t = (v_t - prev_v) / prev_v if prev_v > 0 else 0.0

        portfolio_values.append(v_t)
        portfolio_daily_returns.append(r_t)

    values_series = pd.Series(portfolio_values, index=dates)
    ret_series = pd.Series(portfolio_daily_returns, index=dates)

    # Compute Drawdown Series
    peak_series = values_series.cummax()
    drawdown_series = (values_series - peak_series) / peak_series

    # Metrics
    final_val = float(values_series.iloc[-1])
    total_ret_pct = float((final_val / initial_capital - 1.0) * 100.0)
    cagr_val = annualized_return(ret_series)
    vol_val = annualized_volatility(ret_series)
    sr_val = sharpe_ratio(ret_series, risk_free_rate=risk_free_rate)
    sortino_val = sortino_ratio(ret_series, risk_free_rate=risk_free_rate)
    mdd_val = max_drawdown(ret_series)
    cvar_val = cvar(ret_series, confidence_level=0.95)
    calmar_val = float(abs(cagr_val / mdd_val)) if mdd_val != 0 else 0.0

    pos_days = int((ret_series > 0).sum())
    win_rate = float((pos_days / T) * 100.0) if T > 0 else 0.0

    metrics = {
        "total_return_pct":      round(total_ret_pct, 2),
        "cagr":                  round(cagr_val, 4),
        "annualized_volatility": round(vol_val, 4),
        "sharpe_ratio":          round(sr_val, 4),
        "sortino_ratio":         round(sortino_val, 4),
        "calmar_ratio":          round(calmar_val, 4),
        "max_drawdown":          round(mdd_val, 4),
        "cvar_95":               round(cvar_val, 4),
        "win_rate_pct":          round(win_rate, 2),
        "total_tx_costs":        round(total_fees, 2),
        "final_value":           round(final_val, 2),
    }

    return {
        "metrics": metrics,
        "values_series": values_series,
        "drawdown_series": drawdown_series,
    }


def run_multi_strategy_backtest(
    returns_df: pd.DataFrame,
    current_weights: dict[str, float],
    benchmark_returns: pd.Series,
    initial_capital: float = 1000000.0,
    rebalance_freq: str = "monthly",
    tx_cost_pct: float = 0.001,
    risk_free_rate: float = 0.065,
) -> dict[str, Any]:
    """
    Run backtesting for 4 strategies:
    1. Original (current weights)
    2. Recommended (CVaR optimized)
    3. Equal Weight (1/N)
    4. Benchmark (^NSEI)
    """
    symbols = list(returns_df.columns)
    N = len(symbols)

    # 1. Original Strategy
    orig_res = simulate_strategy_path(
        returns_df, current_weights, initial_capital, rebalance_freq, tx_cost_pct, risk_free_rate
    )

    # 2. Equal Weight Strategy (1/N)
    eq_w = {s: round(1.0 / N, 4) for s in symbols}
    eq_res = simulate_strategy_path(
        returns_df, eq_w, initial_capital, rebalance_freq, tx_cost_pct, risk_free_rate
    )

    # 3. Recommended Strategy (CVaR Optimized)
    rec_w = optimize_portfolio(returns_df, risk_preference="Moderate", max_asset_weight=0.40, risk_free_rate=risk_free_rate)
    rec_res = simulate_strategy_path(
        returns_df, rec_w, initial_capital, rebalance_freq, tx_cost_pct, risk_free_rate
    )

    # 4. Benchmark Strategy
    bm_values = initial_capital * (1.0 + benchmark_returns).cumprod()
    bm_peaks = bm_values.cummax()
    bm_dd = (bm_values - bm_peaks) / bm_peaks

    bm_final = float(bm_values.iloc[-1])
    bm_tot_ret = float((bm_final / initial_capital - 1.0) * 100.0)
    bm_cagr = annualized_return(benchmark_returns)
    bm_vol = annualized_volatility(benchmark_returns)
    bm_sr = sharpe_ratio(benchmark_returns, risk_free_rate=risk_free_rate)
    bm_sortino = sortino_ratio(benchmark_returns, risk_free_rate=risk_free_rate)
    bm_mdd = max_drawdown(benchmark_returns)
    bm_cv = cvar(benchmark_returns, confidence_level=0.95)
    bm_calmar = float(abs(bm_cagr / bm_mdd)) if bm_mdd != 0 else 0.0
    bm_win_rate = float(((benchmark_returns > 0).sum() / len(benchmark_returns)) * 100.0)

    bm_metrics = {
        "total_return_pct":      round(bm_tot_ret, 2),
        "cagr":                  round(bm_cagr, 4),
        "annualized_volatility": round(bm_vol, 4),
        "sharpe_ratio":          round(bm_sr, 4),
        "sortino_ratio":         round(bm_sortino, 4),
        "calmar_ratio":          round(bm_calmar, 4),
        "max_drawdown":          round(bm_mdd, 4),
        "cvar_95":               round(bm_cv, 4),
        "win_rate_pct":          round(bm_win_rate, 2),
        "total_tx_costs":        0.0,
        "final_value":           round(bm_final, 2),
    }

    # Downsampled trajectory points for charts (max 90 points)
    dates = returns_df.index
    step = max(1, len(dates) // 85)
    sample_indices = list(range(0, len(dates), step))
    if sample_indices[-1] != len(dates) - 1:
        sample_indices.append(len(dates) - 1)

    series_points = []
    for idx in sample_indices:
        d = dates[idx]
        d_str = d.date().isoformat()
        series_points.append({
            "date":                 d_str,
            "portfolio_value":      round(float(orig_res["values_series"].iloc[idx]), 2),
            "recommended_value":    round(float(rec_res["values_series"].iloc[idx]), 2),
            "equal_value":          round(float(eq_res["values_series"].iloc[idx]), 2),
            "benchmark_value":      round(float(bm_values.iloc[idx]), 2),
            "drawdown":             round(float(orig_res["drawdown_series"].iloc[idx]), 4),
            "recommended_drawdown": round(float(rec_res["drawdown_series"].iloc[idx]), 4),
            "equal_drawdown":       round(float(eq_res["drawdown_series"].iloc[idx]), 4),
            "benchmark_drawdown":   round(float(bm_dd.iloc[idx]), 4),
        })

    strategies = {
        "original": {
            "name": "Your Current Portfolio",
            "description": "Active holdings with specified rebalancing rules and transaction fees.",
            "weights": current_weights,
            "metrics": orig_res["metrics"],
        },
        "recommended": {
            "name": "Recommended Allocation",
            "description": "Risk-aware CVaR optimized allocation.",
            "weights": rec_w,
            "metrics": rec_res["metrics"],
        },
        "equal": {
            "name": "Equal-Weight Portfolio",
            "description": f"Naive baseline allocating {100/N:.1f}% per asset.",
            "weights": eq_w,
            "metrics": eq_res["metrics"],
        },
        "benchmark": {
            "name": "NIFTY 50 Benchmark",
            "description": "Broad market index (^NSEI).",
            "weights": {"^NSEI": 1.0},
            "metrics": bm_metrics,
        },
    }

    return {
        "start_date":      dates[0].date().isoformat(),
        "end_date":        dates[-1].date().isoformat(),
        "trading_days":    len(dates),
        "initial_capital": initial_capital,
        "rebalance_freq":  rebalance_freq,
        "tx_cost_pct":     tx_cost_pct,
        "strategies":      strategies,
        "series":          series_points,
    }


# ── Stress Lab / Scenario Simulator Engine ─────────────────────────────────────

PRESET_SCENARIOS = {
    "mild_correction": {
        "name": "Mild Market Correction (-10%)",
        "description": "A standard cyclical market pullback affecting broad equities with moderate flight to safety.",
        "market_shock": -0.10,
        "sector_shocks": {"Information Technology": -0.12, "Banking & Finance": -0.09, "Consumer Goods": -0.05},
        "vol_multiplier": 1.25,
    },
    "bear_market": {
        "name": "Bear Market Sell-off (-20%)",
        "description": "Sustained economic downturn driven by tight monetary conditions and margin contraction.",
        "market_shock": -0.20,
        "sector_shocks": {"Information Technology": -0.25, "Banking & Finance": -0.18, "Energy & Petrochemicals": -0.22},
        "vol_multiplier": 1.60,
    },
    "market_recovery": {
        "name": "Market Recovery & Risk Rally (+15%)",
        "description": "Post-crisis rebound as liquidity conditions ease and corporate earnings surprise upward.",
        "market_shock": 0.15,
        "sector_shocks": {"Information Technology": 0.18, "Banking & Finance": 0.14, "Consumer Goods": 0.08},
        "vol_multiplier": 0.85,
    },
    "tech_crash": {
        "name": "Technology Sector De-rating (-35%)",
        "description": "Severe valuation compression in tech and IT exporters due to global spending cuts.",
        "market_shock": -0.08,
        "sector_shocks": {"Information Technology": -0.35, "Banking & Finance": -0.04},
        "vol_multiplier": 2.10,
    },
    "banking_crisis": {
        "name": "Banking Sector Stress & Credit Crunch (-25%)",
        "description": "Financial sector liquidity strain impacting commercial banks and credit spreads.",
        "market_shock": -0.12,
        "sector_shocks": {"Banking & Finance": -0.25, "Information Technology": -0.06},
        "vol_multiplier": 1.90,
    },
    "high_volatility": {
        "name": "High Volatility Regime",
        "description": "Elevated geopolitical and macro uncertainty inducing sharp intraday swings without clear direction.",
        "market_shock": -0.04,
        "sector_shocks": {},
        "vol_multiplier": 2.50,
    },
    "covid_crash_2020": {
        "name": "Historical Crisis Replay: COVID Crash (2020)",
        "description": "Rapid market liquidation following sudden economic lockdown and panic selling.",
        "market_shock": -0.38,
        "sector_shocks": {"Banking & Finance": -0.42, "Energy & Petrochemicals": -0.45, "Information Technology": -0.25, "Pharmaceuticals": +0.05},
        "vol_multiplier": 3.20,
    },
}


def run_scenario_stress_test(
    returns_df: pd.DataFrame,
    weights: dict[str, float],
    capital: float = 1000000.0,
    scenario_id: str = "mild_correction",
    params: Optional[dict[str, Any]] = None,
    benchmark_returns: Optional[pd.Series] = None,
) -> dict[str, Any]:
    """
    Simulate portfolio and individual asset behavior under stress test conditions.
    USP Ref: #5 — Stress Lab with custom shocks and historical crisis replay.
    """
    symbols = [s for s in returns_df.columns if s in weights]
    norm_w = {s: weights[s] for s in symbols}
    tot_w = sum(norm_w.values())
    if tot_w > 0:
        norm_w = {s: w / tot_w for s, w in norm_w.items()}

    # Resolve scenario config
    if scenario_id in PRESET_SCENARIOS and not params:
        scen_info = PRESET_SCENARIOS[scenario_id]
        mkt_shock = scen_info["market_shock"]
        sector_shocks = scen_info["sector_shocks"]
        asset_shocks = {}
        vol_mult = scen_info["vol_multiplier"]
        scen_name = scen_info["name"]
        scen_desc = scen_info["description"]
    else:
        # Custom scenario
        p = params or {}
        mkt_shock = float(p.get("market_shock", 0.0))
        sector_shocks = p.get("sector_shocks", {})
        asset_shocks = p.get("asset_shocks", {})
        vol_mult = float(p.get("vol_multiplier", 1.0))
        scen_name = f"Custom Scenario ({mkt_shock:+.1%} Market Shock)"
        scen_desc = "User-defined market, sector, and asset shock assumptions."

    # Compute individual asset betas against benchmark if available
    asset_betas = {}
    for s in symbols:
        if benchmark_returns is not None and not benchmark_returns.empty:
            asset_betas[s] = beta(returns_df[s], benchmark_returns)
        else:
            asset_betas[s] = 1.0

    # Calculate holding shocks
    asset_impacts: list[dict[str, Any]] = []
    portfolio_shock_sum = 0.0

    for s in symbols:
        w_i = norm_w[s]
        pre_val = round(w_i * capital, 2)
        sec = get_asset_sector(s)
        sec_shock = sector_shocks.get(sec, 0.0)
        direct_asset_shock = asset_shocks.get(s, 0.0)

        # Asset shock = Beta * Market_Shock + Sector_Shock + Direct_Shock
        asset_shock = (asset_betas[s] * mkt_shock) + sec_shock + direct_asset_shock
        post_val = round(pre_val * (1.0 + asset_shock), 2)

        portfolio_shock_sum += w_i * asset_shock

        asset_impacts.append({
            "symbol":            s,
            "name":              SUPPORTED_TICKERS.get(s, s),
            "sector":            sec,
            "weight":            round(w_i, 4),
            "pre_value":         pre_val,
            "post_value":        post_val,
            "return_impact_pct": round(asset_shock * 100.0, 2),
            "dollar_change":     round(post_val - pre_val, 2),
        })

    # Portfolio totals
    post_shock_capital = round(capital * (1.0 + portfolio_shock_sum), 2)
    portfolio_impact_pct = round(portfolio_shock_sum * 100.0, 2)
    total_dollar_loss = abs(post_shock_capital - capital) if post_shock_capital < capital else 0.0

    # Compute contribution to loss %
    for item in asset_impacts:
        dollar_chg = item.pop("dollar_change")
        if total_dollar_loss > 0 and dollar_chg < 0:
            item["contribution_to_loss_pct"] = round((abs(dollar_chg) / total_dollar_loss) * 100.0, 2)
        else:
            item["contribution_to_loss_pct"] = 0.0

    # Compute stressed volatility and VaR/CVaR
    port_ret = pd.Series(
        np.sum([norm_w[s] * returns_df[s] for s in symbols], axis=0),
        index=returns_df.index
    )
    current_vol = annualized_volatility(port_ret)
    stressed_vol = round(current_vol * vol_mult, 4)

    # Stressed VaR / CVaR
    v95 = historical_var(port_ret, confidence_level=0.95)
    cv95 = cvar(port_ret, confidence_level=0.95)
    stressed_v95 = round(v95 * vol_mult, 4)
    stressed_cv95 = round(cv95 * vol_mult, 4)

    return {
        "scenario_id":          scenario_id,
        "scenario_name":        scen_name,
        "description":          scen_desc,
        "is_hypothetical":      True,
        "pre_shock_value":      round(capital, 2),
        "post_shock_value":     post_shock_capital,
        "portfolio_impact_pct": portfolio_impact_pct,
        "benchmark_impact_pct": round(mkt_shock * 100.0, 2),
        "stressed_volatility":  stressed_vol,
        "stressed_var_95":      stressed_v95,
        "stressed_cvar_95":     stressed_cv95,
        "asset_impacts":        asset_impacts,
        "disclaimer":           "Hypothetical Estimate — Past scenarios and stress projections are mathematical models, not guaranteed outcomes.",
    }
