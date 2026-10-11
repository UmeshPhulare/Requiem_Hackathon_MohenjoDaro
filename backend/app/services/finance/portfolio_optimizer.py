# ============================================================
# RiskLens — Portfolio Optimizer & Allocation Lab Service
# Phase 4 & Phase 9
# Blueprint Ref: §9 — Portfolio Optimization, §5.4 — Allocation Lab
# ============================================================

import logging
from typing import Any, Optional
import cvxpy as cp
import numpy as np
import pandas as pd

from app.services.finance.risk_metrics import (
    annualized_return,
    annualized_volatility,
    cvar,
    historical_var,
    max_drawdown,
    portfolio_returns_series,
    sharpe_ratio,
    sortino_ratio,
    hhi_concentration,
    correlation_matrix,
    covariance_matrix,
)
from app.services.market_data.yfinance_client import SUPPORTED_TICKERS

logger = logging.getLogger(__name__)


def optimize_portfolio(
    returns_df: pd.DataFrame,
    risk_preference: str = "Moderate",
    max_asset_weight: float = 0.40,
    risk_free_rate: float = 0.065,
) -> dict[str, float]:
    """
    CVaR-driven convex portfolio optimization via CVXPY.

    Constraints (Blueprint §9):
      1. Long-only: w_i >= 0.0 (no leverage, no short selling).
      2. Fully invested: sum(w_i) == 1.0.
      3. Concentration cap: w_i <= max_asset_weight.
      4. Risk preference changes objective:
         - Conservative: Rockafellar-Uryasev CVaR minimization with tight concentration cap.
         - Moderate: Balanced Mean-CVaR trade-off (efficient risk-adjusted return).
         - Aggressive: Maximize expected return subject to CVaR guardrails.

    Returns:
        dict[str, float]: {ticker: normalized_optimal_weight}
    """
    symbols = list(returns_df.columns)
    N = len(symbols)
    T = len(returns_df)

    if N < 2:
        return {s: 1.0 for s in symbols}

    R = returns_df.values  # shape: (T, N)
    mean_ret = np.mean(R, axis=0) * 252  # annualized mean return

    # Bound maximum single weight
    eff_max_weight = max_asset_weight
    pref = risk_preference.strip().lower()
    if pref == "conservative":
        eff_max_weight = min(max_asset_weight, max(0.25, 1.5 / N))

    # Ensure max weight is feasible: N * eff_max_weight >= 1.0
    if eff_max_weight * N < 1.0:
        eff_max_weight = 1.0 / N

    try:
        # Decision variables
        w = cp.Variable(N)
        gamma = cp.Variable()  # VaR threshold variable
        u = cp.Variable(T)      # Tail loss variables
        alpha = 0.95

        # Rockafellar-Uryasev linear CVaR formulation:
        cvar_loss = gamma + (1.0 / ((1.0 - alpha) * T)) * cp.sum(u)

        base_constraints = [
            u >= -R @ w - gamma,
            u >= 0,
            cp.sum(w) == 1.0,
            w >= 0.0,
            w <= eff_max_weight,
        ]

        if pref == "conservative":
            # Pure CVaR minimization
            objective = cp.Minimize(cvar_loss)
        elif pref == "aggressive":
            # Maximize return with modest CVaR penalty
            expected_ret_term = mean_ret @ w
            objective = cp.Maximize(expected_ret_term - 0.25 * cvar_loss)
        else:  # Moderate (default)
            # Balanced Sharpe/Mean-CVaR objective
            expected_ret_term = mean_ret @ w
            objective = cp.Maximize(expected_ret_term - 1.20 * cvar_loss)

        prob = cp.Problem(objective, base_constraints)
        # Solve with installed solver
        prob.solve(solver=cp.CLARABEL if "CLARABEL" in cp.installed_solvers() else None)

        if prob.status in ["optimal", "optimal_inaccurate"] and w.value is not None:
            raw_w = np.clip(w.value, 0.0, eff_max_weight)
            sum_w = np.sum(raw_w)
            norm_w = raw_w / sum_w if sum_w > 0 else np.ones(N) / N
            return {symbols[i]: round(float(norm_w[i]), 4) for i in range(N)}

    except Exception as exc:
        logger.warning("CVXPY optimization fallback triggered: %s", exc)

    # Robust fallback: Inverse volatility weighting with caps
    vols = np.std(R, axis=0) * np.sqrt(252)
    inv_vols = np.array([1.0 / max(v, 1e-4) for v in vols])
    if pref == "aggressive":
        pos_rets = np.maximum(mean_ret, 0.01)
        inv_vols = 0.3 * (inv_vols / np.sum(inv_vols)) + 0.7 * (pos_rets / np.sum(pos_rets))

    raw_w = np.minimum(inv_vols / np.sum(inv_vols), eff_max_weight)
    sum_w = np.sum(raw_w)
    norm_w = raw_w / sum_w if sum_w > 0 else np.ones(N) / N
    return {symbols[i]: round(float(norm_w[i]), 4) for i in range(N)}


def evaluate_strategy(
    returns_df: pd.DataFrame,
    weights: dict[str, float],
    capital: float = 100000.0,
    risk_free_rate: float = 0.065,
) -> tuple[dict[str, float], list[dict[str, Any]]]:
    """
    Evaluate financial metrics and cumulative wealth trajectory for a weight allocation.
    """
    port_ret = portfolio_returns_series(returns_df, weights)

    ann_ret = annualized_return(port_ret)
    ann_vol = annualized_volatility(port_ret)
    sr = sharpe_ratio(port_ret, risk_free_rate=risk_free_rate)
    sortino = sortino_ratio(port_ret, risk_free_rate=risk_free_rate)
    mdd = max_drawdown(port_ret)
    cv = cvar(port_ret, confidence_level=0.95)
    hhi = hhi_concentration(weights)

    metrics = {
        "annualized_return":     round(ann_ret, 4),
        "annualized_volatility": round(ann_vol, 4),
        "sharpe_ratio":          round(sr, 4),
        "sortino_ratio":         round(sortino, 4),
        "max_drawdown":          round(mdd, 4),
        "cvar_95":               round(cv, 4),
        "hhi_concentration":     round(hhi, 4),
    }

    # Cumulative growth curve starting from initial capital
    cum_wealth = capital * (1.0 + port_ret).cumprod()
    # Sample points to keep payload manageable (e.g. weekly / max 100 points)
    step = max(1, len(cum_wealth) // 80)
    growth_points = [
        {"date": idx.date().isoformat(), "value": round(float(val), 2)}
        for idx, val in cum_wealth.iloc[::step].items()
    ]
    # Ensure final point is included
    if growth_points[-1]["date"] != cum_wealth.index[-1].date().isoformat():
        growth_points.append({
            "date": cum_wealth.index[-1].date().isoformat(),
            "value": round(float(cum_wealth.iloc[-1]), 2)
        })

    return metrics, growth_points


def generate_why_this_weight_explanations(
    current_weights: dict[str, float],
    recommended_weights: dict[str, float],
    returns_df: pd.DataFrame,
    capital: float,
    max_asset_weight: float = 0.40,
    risk_free_rate: float = 0.065,
) -> list[dict[str, Any]]:
    """
    Generate professional, explainable 'Why This Weight?' reasoning for each asset.
    USP Ref: #6 — Explainable recommendations stating how volatility, correlation,
    and concentration influenced the suggested weight change.
    """
    explanations: list[dict[str, Any]] = []
    corr_df = returns_df.corr()

    for sym, rec_w in recommended_weights.items():
        curr_w = current_weights.get(sym, 0.0)
        delta = round(rec_w - curr_w, 4)
        target_amt = round(rec_w * capital, 2)
        asset_ret = returns_df[sym] if sym in returns_df else pd.Series(dtype=float)

        vol = round(annualized_volatility(asset_ret), 4) if not asset_ret.empty else 0.0
        sr = round(sharpe_ratio(asset_ret, risk_free_rate=risk_free_rate), 4) if not asset_ret.empty else 0.0

        # Average correlation with all other assets
        other_syms = [s for s in returns_df.columns if s != sym]
        avg_corr = round(float(corr_df.loc[sym, other_syms].mean()), 2) if other_syms else 1.0

        # Build financial reason
        name = SUPPORTED_TICKERS.get(sym, sym)
        reasons = []

        if abs(rec_w - max_asset_weight) < 0.01:
            reasons.append(f"Capped at max single-asset concentration guardrail ({max_asset_weight:.0%})")
        elif delta > 0.03:
            if avg_corr < 0.40:
                reasons.append(f"Low correlation ({avg_corr:.2f}) provides strong portfolio diversification")
            if sr > 0.5:
                reasons.append(f"Attractive risk-adjusted return (Sharpe {sr:.2f})")
            if vol < 0.20:
                reasons.append(f"Low annual volatility ({vol:.1%}) stabilizes tail risk")
            if not reasons:
                reasons.append("Optimized risk-parity contribution improves portfolio efficiency")
        elif delta < -0.03:
            if vol > 0.25:
                reasons.append(f"High annual volatility ({vol:.1%}) contributes excessively to variance")
            if avg_corr > 0.60:
                reasons.append(f"High co-movement ({avg_corr:.2f}) reduces diversification benefit")
            if sr < 0.0:
                reasons.append("Negative excess return over risk-free benchmark")
            if not reasons:
                reasons.append("Reduced to prevent position concentration and balance overall risk")
        else:
            reasons.append(f"Weight maintained close to current ({rec_w:.1%}) as holding is already well-balanced")

        explanation_text = "; ".join(reasons) + "."

        explanations.append({
            "symbol": sym,
            "name": name,
            "current_weight": round(curr_w, 4),
            "recommended_weight": round(rec_w, 4),
            "weight_delta": delta,
            "target_amount": target_amt,
            "reason": explanation_text,
            "volatility": vol,
            "sharpe_ratio": sr,
            "avg_correlation": avg_corr,
        })

    return explanations


def generate_efficient_frontier_samples(
    returns_df: pd.DataFrame,
    count: int = 80,
    risk_free_rate: float = 0.065,
) -> list[dict[str, float]]:
    """
    Monte Carlo Dirichlet simulation to plot risk-return efficient frontier scatter points.
    """
    N = len(returns_df.columns)
    if N < 2:
        return []

    np.random.seed(42)
    # Generate random weights on simplex
    weights_matrix = np.random.dirichlet(np.ones(N), size=count)
    R_matrix = returns_df.values
    mean_daily = np.mean(R_matrix, axis=0)
    cov_daily = np.cov(R_matrix, rowvar=False)

    points: list[dict[str, float]] = []
    for w in weights_matrix:
        ann_ret = float(np.dot(w, mean_daily) * 252)
        ann_vol = float(np.sqrt(np.dot(w.T, np.dot(cov_daily, w))) * np.sqrt(252))
        sr = float((ann_ret - risk_free_rate) / ann_vol) if ann_vol > 0 else 0.0

        points.append({
            "risk":         round(ann_vol, 4),
            "return_rate":  round(ann_ret, 4),
            "sharpe_ratio": round(sr, 4),
        })

    # Sort by risk for cleaner curve plotting
    points.sort(key=lambda x: x["risk"])
    return points


def generate_trade_offs_summary(
    current_metrics: dict[str, float],
    opt_metrics: dict[str, float],
) -> dict[str, Any]:
    """
    Summarize quantitative trade-offs between current vs recommended allocation.
    """
    curr_vol = current_metrics["annualized_volatility"]
    opt_vol  = opt_metrics["annualized_volatility"]
    vol_change = round(((opt_vol - curr_vol) / curr_vol) * 100.0, 2) if curr_vol > 0 else 0.0

    curr_ret = current_metrics["annualized_return"]
    opt_ret  = opt_metrics["annualized_return"]
    ret_change = round((opt_ret - curr_ret) * 100.0, 2)

    sharpe_change = round(opt_metrics["sharpe_ratio"] - current_metrics["sharpe_ratio"], 4)

    curr_cvar = abs(current_metrics["cvar_95"])
    opt_cvar  = abs(opt_metrics["cvar_95"])
    cvar_reduc = round(((curr_cvar - opt_cvar) / curr_cvar) * 100.0, 2) if curr_cvar > 0 else 0.0

    hhi_change = round(opt_metrics["hhi_concentration"] - current_metrics["hhi_concentration"], 4)

    narrative_parts = []
    if cvar_reduc > 0:
        narrative_parts.append(f"Tail loss risk (CVaR) reduced by {cvar_reduc:.1f}%")
    if vol_change < 0:
        narrative_parts.append(f"annualized volatility reduced by {abs(vol_change):.1f}%")
    if sharpe_change > 0:
        narrative_parts.append(f"Sharpe ratio improved by +{sharpe_change:.2f}")

    if not narrative_parts:
        narrative = "The recommended allocation maintains balanced exposure within concentration caps."
    else:
        narrative = f"Recommended allocation achieves: {', '.join(narrative_parts)}."

    from app.services.ai.llm_client import ask_llm
    prompt = (
        f"Compare current vs recommended portfolio allocation:\n"
        f"Volatility Change: {vol_change:+.1f}%\n"
        f"Expected Return Change: {ret_change:+.1f}%\n"
        f"CVaR Tail Loss Reduction: {cvar_reduc:.1f}%\n"
        f"Sharpe Delta: {sharpe_change:+.2f}\n"
        f"Provide a 2-sentence institutional trade-off explanation."
    )
    ai_narrative = ask_llm(prompt, max_tokens=150) or narrative

    return {
        "volatility_change_pct": vol_change,
        "return_change_pct":     ret_change,
        "sharpe_change":         sharpe_change,
        "cvar_reduction_pct":    cvar_reduc,
        "hhi_change":            hhi_change,
        "narrative":             narrative,
        "ai_narrative":          ai_narrative,
    }


def build_four_strategies_comparison(
    returns_df: pd.DataFrame,
    current_weights: dict[str, float],
    recommended_weights: dict[str, float],
    benchmark_returns: pd.Series,
    capital: float = 100000.0,
    risk_free_rate: float = 0.065,
) -> dict[str, Any]:
    """
    Build side-by-side comparison across all 4 strategies (Blueprint §9 & §5.4):
    1. Current Portfolio
    2. Equal-Weight Portfolio (1/N)
    3. Optimized Recommended Strategy
    4. Benchmark (NIFTY 50)
    """
    symbols = list(returns_df.columns)
    N = len(symbols)

    # 1. Current Portfolio
    curr_metrics, curr_growth = evaluate_strategy(
        returns_df, current_weights, capital=capital, risk_free_rate=risk_free_rate
    )
    curr_amounts = {s: round(w * capital, 2) for s, w in current_weights.items()}

    # 2. Equal Weight Strategy (1/N)
    eq_w = {s: round(1.0 / N, 4) for s in symbols}
    eq_metrics, eq_growth = evaluate_strategy(
        returns_df, eq_w, capital=capital, risk_free_rate=risk_free_rate
    )
    eq_amounts = {s: round(w * capital, 2) for s, w in eq_w.items()}

    # 3. Optimized Strategy
    opt_metrics, opt_growth = evaluate_strategy(
        returns_df, recommended_weights, capital=capital, risk_free_rate=risk_free_rate
    )
    opt_amounts = {s: round(w * capital, 2) for s, w in recommended_weights.items()}

    # 4. Benchmark Strategy
    bm_ann_ret = annualized_return(benchmark_returns)
    bm_vol = annualized_volatility(benchmark_returns)
    bm_sr = sharpe_ratio(benchmark_returns, risk_free_rate=risk_free_rate)
    bm_sortino = sortino_ratio(benchmark_returns, risk_free_rate=risk_free_rate)
    bm_mdd = max_drawdown(benchmark_returns)
    bm_cv = cvar(benchmark_returns, confidence_level=0.95)

    bm_cum = capital * (1.0 + benchmark_returns).cumprod()
    step = max(1, len(bm_cum) // 80)
    bm_growth = [
        {"date": idx.date().isoformat(), "value": round(float(val), 2)}
        for idx, val in bm_cum.iloc[::step].items()
    ]
    if bm_growth[-1]["date"] != bm_cum.index[-1].date().isoformat():
        bm_growth.append({
            "date": bm_cum.index[-1].date().isoformat(),
            "value": round(float(bm_cum.iloc[-1]), 2)
        })

    bm_metrics = {
        "annualized_return":     round(bm_ann_ret, 4),
        "annualized_volatility": round(bm_vol, 4),
        "sharpe_ratio":          round(bm_sr, 4),
        "sortino_ratio":         round(bm_sortino, 4),
        "max_drawdown":          round(bm_mdd, 4),
        "cvar_95":               round(bm_cv, 4),
        "hhi_concentration":     1.0,
    }

    strategies = {
        "current": {
            "name": "Your Current Portfolio",
            "description": "Active holdings blend based on your actual positions.",
            "weights": current_weights,
            "target_amounts": curr_amounts,
            "metrics": curr_metrics,
            "growth_series": curr_growth,
        },
        "equal_weight": {
            "name": "Equal-Weight Portfolio",
            "description": f"Benchmark strategy allocating equal {100/N:.1f}% to each holding.",
            "weights": eq_w,
            "target_amounts": eq_amounts,
            "metrics": eq_metrics,
            "growth_series": eq_growth,
        },
        "optimized": {
            "name": "Recommended Allocation",
            "description": "Risk-aware CVaR optimized weights with concentration constraints.",
            "weights": recommended_weights,
            "target_amounts": opt_amounts,
            "metrics": opt_metrics,
            "growth_series": opt_growth,
        },
        "benchmark": {
            "name": "NIFTY 50 Benchmark",
            "description": "Indian market broad equity index (^NSEI).",
            "weights": {"^NSEI": 1.0},
            "target_amounts": {"^NSEI": capital},
            "metrics": bm_metrics,
            "growth_series": bm_growth,
        },
    }

    return strategies
