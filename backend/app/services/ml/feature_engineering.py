# ============================================================
# RiskLens — Feature Engineering Service (Phase 1 + ML)
# Computes exactly 20 features in fixed order from price data.
# Must be IDENTICAL to training-time feature computation.
# ============================================================

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

TRADING_DAYS_PER_YEAR = 252
RISK_FREE_RATE        = 0.0   # 0% for feature computation (doc §3)

# Indian sector mapping for the 12-stock universe
SECTOR_MAP: dict[str, str] = {
    "BHARTIARTL.NS": "Telecom",
    "HDFCBANK.NS":   "Banking",
    "HINDUNILVR.NS": "FMCG",
    "ICICIBANK.NS":  "Banking",
    "INFY.NS":       "IT",
    "ITC.NS":        "FMCG",
    "LT.NS":         "Infrastructure",
    "ONGC.NS":       "Energy",
    "RELIANCE.NS":   "Energy",
    "SBIN.NS":       "Banking",
    "SUNPHARMA.NS":  "Pharma",
    "TCS.NS":        "IT",
}


def _portfolio_returns(
    asset_returns: pd.DataFrame,
    weights: dict[str, float],
) -> pd.Series:
    """Compute daily portfolio returns as weighted sum of asset returns."""
    w = pd.Series(weights)
    # Align weights to asset_returns columns
    common = [c for c in asset_returns.columns if c in w.index]
    port = (asset_returns[common] * w[common]).sum(axis=1)
    port.name = "portfolio"
    return port


def _annualized_volatility(returns: pd.Series) -> float:
    """Annualized volatility = daily std × √252."""
    return float(returns.std() * np.sqrt(TRADING_DAYS_PER_YEAR))


def _cumulative_return(returns: pd.Series) -> float:
    """Cumulative return over the return series window."""
    return float((1 + returns).prod() - 1)


def _max_drawdown(returns: pd.Series) -> float:
    """Maximum peak-to-trough drawdown (signed negative)."""
    cum = (1 + returns).cumprod()
    rolling_max = cum.cummax()
    drawdown = (cum - rolling_max) / rolling_max
    return float(drawdown.min())


def _var_95(returns: pd.Series) -> float:
    """5th-percentile of daily returns (signed, negative for losses)."""
    return float(np.percentile(returns.dropna(), 5))


def _cvar_95(returns: pd.Series) -> float:
    """Mean of returns at or below the 5th percentile."""
    var = _var_95(returns)
    tail = returns[returns <= var]
    return float(tail.mean()) if not tail.empty else var


def _downside_deviation(returns: pd.Series) -> float:
    """Annualized std of negative returns only."""
    neg = returns[returns < 0]
    return float(neg.std() * np.sqrt(TRADING_DAYS_PER_YEAR)) if not neg.empty else 0.0


def _sharpe_ratio(returns: pd.Series, risk_free: float = RISK_FREE_RATE) -> float:
    """Annualized Sharpe ratio."""
    daily_rf = risk_free / TRADING_DAYS_PER_YEAR
    excess   = returns - daily_rf
    if excess.std() == 0:
        return 0.0
    return float((excess.mean() / excess.std()) * np.sqrt(TRADING_DAYS_PER_YEAR))


def _beta(port_returns: pd.Series, bm_returns: pd.Series) -> float:
    """Portfolio beta relative to benchmark."""
    aligned = pd.concat([port_returns, bm_returns], axis=1).dropna()
    if aligned.shape[0] < 10:
        return 1.0
    cov = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])
    bm_var = cov[1, 1]
    return float(cov[0, 1] / bm_var) if bm_var != 0 else 1.0


def _avg_pairwise_correlation(asset_returns: pd.DataFrame) -> float:
    """Average pairwise Pearson correlation across assets."""
    if asset_returns.shape[1] < 2:
        return 1.0
    corr = asset_returns.corr()
    # Upper triangle only (exclude diagonal)
    mask = np.triu(np.ones(corr.shape, dtype=bool), k=1)
    vals = corr.values[mask]
    return float(vals.mean()) if len(vals) > 0 else 1.0


def _diversification_ratio(
    asset_returns: pd.DataFrame,
    weights: dict[str, float],
) -> float:
    """
    Diversification ratio = weighted avg asset vol / portfolio vol.
    DR > 1 means assets are not perfectly correlated → diversification benefit.
    """
    w = pd.Series(weights)
    common = [c for c in asset_returns.columns if c in w.index]
    asset_vols = asset_returns[common].std() * np.sqrt(TRADING_DAYS_PER_YEAR)
    weighted_avg_vol = float((w[common] * asset_vols).sum())

    port = _portfolio_returns(asset_returns, weights)
    port_vol = _annualized_volatility(port)

    if port_vol == 0:
        return 1.0
    return weighted_avg_vol / port_vol


def _hhi_concentration(weights: dict[str, float]) -> float:
    """Herfindahl-Hirschman Index = sum(w_i²)."""
    return float(sum(v ** 2 for v in weights.values()))


def _sector_concentration(weights: dict[str, float]) -> float:
    """HHI of sector weights (sum of squared aggregated sector shares)."""
    sector_weights: dict[str, float] = {}
    for sym, w in weights.items():
        sector = SECTOR_MAP.get(sym, "Other")
        sector_weights[sector] = sector_weights.get(sector, 0.0) + w
    return float(sum(v ** 2 for v in sector_weights.values()))


def engineer_features(
    historical_returns: pd.DataFrame,
    weights: dict[str, float],
    benchmark_returns: pd.Series,
    risk_free_rate: float = RISK_FREE_RATE,
) -> dict[str, float]:
    """
    Compute exactly 20 features in the fixed order expected by the ML pipeline.

    Args:
        historical_returns: pd.DataFrame of daily simple returns, columns = tickers.
                            Must have at least 252 rows.
        weights:            dict {ticker: float} summing to 1.0.
        benchmark_returns:  pd.Series of benchmark (^NSEI) daily returns,
                            aligned to the same date index.
        risk_free_rate:     Annualized risk-free rate (default 0.0 per spec).

    Returns:
        dict {feature_name: float} with exactly 20 keys in canonical order.

    Raises:
        ValueError if there is insufficient history.
    """
    n = len(historical_returns)
    if n < 252:
        raise ValueError(
            f"Insufficient history: {n} rows available, minimum 252 required."
        )

    # ── Compute portfolio return series ─────────────────────────────────────
    port = _portfolio_returns(historical_returns, weights)

    # ── Windows ─────────────────────────────────────────────────────────────
    w20  = port.iloc[-20:]
    w60  = port.iloc[-60:]
    w252 = port.iloc[-252:]

    bm60  = benchmark_returns.reindex(w60.index).dropna()
    bm252 = benchmark_returns.reindex(w252.index).dropna()

    asset60  = historical_returns.reindex(w60.index).dropna()
    asset252 = historical_returns.reindex(w252.index).dropna()

    # ── 20 features in fixed order ───────────────────────────────────────────
    features: dict[str, float] = {
        # Returns
        "return_20d":           _cumulative_return(w20),
        "return_60d":           _cumulative_return(w60),
        "return_252d":          _cumulative_return(w252),
        # Volatility
        "volatility_20d":       _annualized_volatility(w20),
        "volatility_60d":       _annualized_volatility(w60),
        "volatility_252d":      _annualized_volatility(w252),
        # Risk metrics
        "downside_deviation":   _downside_deviation(w60),
        "max_drawdown":         _max_drawdown(w252),
        "var_95":               _var_95(w60),
        "cvar_95":              _cvar_95(w60),
        # Correlation / diversification
        "avg_pairwise_corr":    _avg_pairwise_correlation(asset60),
        "diversification_ratio":_diversification_ratio(asset60, weights),
        # Benchmark-relative
        "beta":                 _beta(w252, bm252),
        "benchmark_vol":        _annualized_volatility(bm60),
        "benchmark_drawdown":   _max_drawdown(bm252),
        # Concentration
        "hhi_concentration":    _hhi_concentration(weights),
        "max_single_weight":    float(max(weights.values())),
        "num_assets":           float(sum(1 for v in weights.values() if v > 0)),
        "sector_concentration": _sector_concentration(weights),
        # Performance
        "sharpe_ratio":         _sharpe_ratio(w60, risk_free_rate),
    }

    logger.debug("Feature vector computed: %s", features)
    return features
