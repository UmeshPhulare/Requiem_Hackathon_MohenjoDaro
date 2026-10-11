# ============================================================
# RiskLens — Quantitative Risk Engine
# Phase 2: High-Precision Server-Side Financial Metrics
# Blueprint Reference: §7 — Quantitative Risk Engine
# ============================================================

import logging
from typing import Any, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

TRADING_DAYS_PER_YEAR = 252


def portfolio_returns_series(
    asset_returns: pd.DataFrame,
    weights: dict[str, float],
) -> pd.Series:
    """
    Compute daily portfolio returns as the linear weighted sum of asset returns:
    R_p,t = sum_{i=1}^N (w_i * R_i,t)
    """
    w_series = pd.Series(weights)
    common_assets = [col for col in asset_returns.columns if col in w_series.index]
    if not common_assets:
        raise ValueError("No matching symbols between returns dataframe and weights.")

    port_ret = (asset_returns[common_assets] * w_series[common_assets]).sum(axis=1)
    port_ret.name = "portfolio"
    return port_ret


def annualized_return(
    returns: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Annualized compound return (CAGR) over the observed window:
    CAGR = (1 + R_cum) ** (periods_per_year / N) - 1
    """
    if returns.empty:
        return 0.0

    n_days = len(returns)
    if n_days == 0:
        return 0.0

    cum_return = float((1.0 + returns).prod() - 1.0)
    if cum_return <= -1.0:
        return -1.0

    annualized = float((1.0 + cum_return) ** (periods_per_year / n_days) - 1.0)
    return annualized


def annualized_volatility(
    returns: pd.Series,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Annualized volatility = daily standard deviation * sqrt(252).
    """
    if len(returns) < 2:
        return 0.0
    return float(returns.std(ddof=1) * np.sqrt(periods_per_year))


def max_drawdown(returns: pd.Series) -> float:
    """
    Maximum peak-to-trough drawdown (signed negative float, e.g. -0.15 for -15%).
    """
    if returns.empty:
        return 0.0
    cum_wealth = (1.0 + returns).cumprod()
    peak = cum_wealth.cummax()
    drawdown = (cum_wealth - peak) / peak
    return float(drawdown.min())


def drawdown_series(returns: pd.Series) -> pd.Series:
    """
    Generate daily drawdown percentage time series for charting.
    D_t = (Wealth_t - Peak_t) / Peak_t
    """
    if returns.empty:
        return pd.Series(dtype=float)
    cum_wealth = (1.0 + returns).cumprod()
    peak = cum_wealth.cummax()
    dd = (cum_wealth - peak) / peak
    dd.name = "drawdown"
    return dd


def sharpe_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Sharpe Ratio = (Annualized Return - Risk Free Rate) / Annualized Volatility.
    """
    vol = annualized_volatility(returns, periods_per_year=periods_per_year)
    if vol == 0.0:
        return 0.0
    ann_ret = annualized_return(returns, periods_per_year=periods_per_year)
    return float((ann_ret - risk_free_rate) / vol)


def downside_deviation(
    returns: pd.Series,
    target_return: float = 0.0,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Downside deviation = sqrt(mean(min(0, r - target)^2)) * sqrt(252).
    Measures dispersion of negative returns below threshold.
    """
    if returns.empty:
        return 0.0
    daily_target = target_return / periods_per_year
    downside_diff = returns - daily_target
    downside_squared = np.minimum(0.0, downside_diff) ** 2
    mean_downside = downside_squared.mean()
    return float(np.sqrt(mean_downside) * np.sqrt(periods_per_year))


def sortino_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    target_return: float = 0.0,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Sortino Ratio = (Annualized Return - Target Return) / Downside Deviation.
    Penalizes only harmful downside volatility.
    """
    dd = downside_deviation(returns, target_return=target_return, periods_per_year=periods_per_year)
    if dd == 0.0:
        return 0.0
    ann_ret = annualized_return(returns, periods_per_year=periods_per_year)
    return float((ann_ret - risk_free_rate) / dd)


def historical_var(
    returns: pd.Series,
    confidence_level: float = 0.95,
) -> float:
    """
    Historical Value at Risk (VaR):
    Returns signed 1-day percentage cutoff at (1 - confidence_level) quantile.
    E.g. at 95% confidence, returns the 5th percentile return (typically negative, e.g. -0.021).
    """
    if returns.empty:
        return 0.0
    alpha = 1.0 - confidence_level
    var_value = float(np.percentile(returns, alpha * 100.0))
    return var_value


def cvar(
    returns: pd.Series,
    confidence_level: float = 0.95,
) -> float:
    """
    Conditional Value at Risk (CVaR) / Expected Shortfall:
    The expected return given that the loss exceeds the historical VaR threshold:
    CVaR_alpha = E[R | R <= VaR_alpha]
    """
    if returns.empty:
        return 0.0
    var_cutoff = historical_var(returns, confidence_level=confidence_level)
    tail_losses = returns[returns <= var_cutoff]
    if tail_losses.empty:
        return var_cutoff
    return float(tail_losses.mean())


def beta(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series,
) -> float:
    """
    Portfolio Beta against benchmark:
    Beta = Cov(R_p, R_m) / Var(R_m)
    """
    aligned = pd.concat([portfolio_returns, benchmark_returns], axis=1).dropna()
    if len(aligned) < 2:
        return 1.0
    p = aligned.iloc[:, 0]
    b = aligned.iloc[:, 1]
    bm_var = b.var()
    if bm_var == 0.0:
        return 1.0
    cov = p.cov(b)
    return float(cov / bm_var)


def alpha(
    portfolio_returns: pd.Series,
    benchmark_returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> float:
    """
    Jensen's Alpha = R_p,ann - (R_f + Beta * (R_m,ann - R_f)).
    Measures excess return relative to CAPM expected return.
    """
    b = beta(portfolio_returns, benchmark_returns)
    port_ann = annualized_return(portfolio_returns, periods_per_year=periods_per_year)
    bm_ann = annualized_return(benchmark_returns, periods_per_year=periods_per_year)
    expected_return = risk_free_rate + b * (bm_ann - risk_free_rate)
    return float(port_ann - expected_return)


def correlation_matrix(asset_returns: pd.DataFrame) -> dict[str, dict[str, float]]:
    """
    Pairwise Pearson correlation matrix between all assets.
    Returns nested dictionary: {ticker_A: {ticker_B: corr_value}}.
    """
    if asset_returns.empty:
        return {}
    corr_df = asset_returns.corr()
    result: dict[str, dict[str, float]] = {}
    for row in corr_df.index:
        result[row] = {}
        for col in corr_df.columns:
            val = corr_df.loc[row, col]
            result[row][col] = round(float(val), 4) if pd.notna(val) else 0.0
    return result


def covariance_matrix(
    asset_returns: pd.DataFrame,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> pd.DataFrame:
    """
    Annualized asset covariance matrix:
    Sigma_ann = Cov(returns) * 252.
    """
    return asset_returns.cov() * periods_per_year


def hhi_concentration(weights: dict[str, float]) -> float:
    """
    Herfindahl-Hirschman Index (HHI) for portfolio weight concentration:
    HHI = sum_{i=1}^N (w_i ** 2)
    Ranges from 1/N (equal weighting) to 1.0 (single asset concentration).
    """
    return float(sum(float(w) ** 2 for w in weights.values()))


def asset_risk_contribution(
    asset_returns: pd.DataFrame,
    weights: dict[str, float],
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> list[dict[str, Any]]:
    """
    Euler Risk Decomposition / Risk Attribution (Blueprint §7 & §5):
    Decomposes total portfolio volatility into marginal and percentage risk contributions.

    Mathematical definition:
      - Portfolio variance: sigma_p^2 = w^T * Sigma * w
      - Portfolio vol:      sigma_p   = sqrt(sigma_p^2)
      - Marginal Contribution to Risk (MCR_i) = (Sigma * w)_i / sigma_p
      - Absolute Risk Contribution (ARC_i)    = w_i * MCR_i
      - Percentage Risk Contribution (%RC_i)  = ARC_i / sigma_p = (w_i * (Sigma * w)_i) / sigma_p^2
      - Guarantee: sum(%RC_i) = 1.0 (100%)

    Returns list of dicts:
      [
        {
          "symbol": "RELIANCE.NS",
          "weight": 0.40,
          "marginal_contribution": 0.185,
          "risk_contribution": 0.074,
          "risk_contribution_pct": 46.25
        }, ...
      ]
    """
    symbols = [s for s in asset_returns.columns if s in weights]
    if not symbols:
        return []

    w = np.array([weights[s] for s in symbols], dtype=float)
    # Ensure weight vector is normalized for attribution
    total_w = np.sum(w)
    if total_w > 0:
        w = w / total_w

    # Annualized covariance matrix
    cov = covariance_matrix(asset_returns[symbols], periods_per_year=periods_per_year).values

    # Portfolio variance and vol
    port_var = float(np.dot(w.T, np.dot(cov, w)))
    port_vol = np.sqrt(port_var) if port_var > 0 else 0.0

    contributions = []
    if port_vol == 0.0:
        # Trivial / zero vol case
        for i, s in enumerate(symbols):
            contributions.append({
                "symbol": s,
                "weight": round(float(w[i]), 4),
                "marginal_contribution": 0.0,
                "risk_contribution": 0.0,
                "risk_contribution_pct": round(float(w[i] * 100.0), 2),
            })
        return contributions

    # Marginal Contribution to Risk vector: MCR = (Sigma * w) / port_vol
    sigma_w = np.dot(cov, w)
    mcr = sigma_w / port_vol

    # Absolute Risk Contribution: ARC = w * MCR
    arc = w * mcr

    # Percentage Contribution: %RC = ARC / port_vol = (w * sigma_w) / port_var
    rc_pct = (arc / port_vol) * 100.0

    for i, s in enumerate(symbols):
        contributions.append({
            "symbol": s,
            "weight": round(float(w[i]), 4),
            "marginal_contribution": round(float(mcr[i]), 6),
            "risk_contribution": round(float(arc[i]), 6),
            "risk_contribution_pct": round(float(rc_pct[i]), 2),
        })

    return contributions


def compute_portfolio_metrics(
    asset_returns: pd.DataFrame,
    weights: dict[str, float],
    benchmark_returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
) -> dict[str, Any]:
    """
    Master Quantitative Risk Engine computation:
    Computes all 12+ statistical risk and return metrics strictly server-side.
    """
    port_returns = portfolio_returns_series(asset_returns, weights)

    ann_ret = annualized_return(port_returns, periods_per_year=periods_per_year)
    ann_vol = annualized_volatility(port_returns, periods_per_year=periods_per_year)
    sr = sharpe_ratio(port_returns, risk_free_rate=risk_free_rate, periods_per_year=periods_per_year)
    sortino = sortino_ratio(port_returns, risk_free_rate=risk_free_rate, periods_per_year=periods_per_year)
    mdd = max_drawdown(port_returns)
    dd_dev = downside_deviation(port_returns, periods_per_year=periods_per_year)
    v95 = historical_var(port_returns, confidence_level=0.95)
    v99 = historical_var(port_returns, confidence_level=0.99)
    cv95 = cvar(port_returns, confidence_level=0.95)
    cv99 = cvar(port_returns, confidence_level=0.99)
    b = beta(port_returns, benchmark_returns)
    a = alpha(port_returns, benchmark_returns, risk_free_rate=risk_free_rate, periods_per_year=periods_per_year)
    hhi = hhi_concentration(weights)
    risk_attr = asset_risk_contribution(asset_returns, weights, periods_per_year=periods_per_year)
    corr_mat = correlation_matrix(asset_returns[[s for s in asset_returns.columns if s in weights]])

    return {
        "annualized_return":     round(ann_ret, 6),
        "annualized_volatility": round(ann_vol, 6),
        "sharpe_ratio":          round(sr, 4),
        "sortino_ratio":         round(sortino, 4),
        "max_drawdown":          round(mdd, 6),
        "downside_deviation":    round(dd_dev, 6),
        "var_95":                round(v95, 6),
        "var_99":                round(v99, 6),
        "cvar_95":               round(cv95, 6),
        "cvar_99":               round(cv99, 6),
        "beta":                  round(b, 4),
        "alpha":                 round(a, 6),
        "hhi_concentration":     round(hhi, 4),
        "risk_contributions":    risk_attr,
        "correlation_matrix":    corr_mat,
    }
