# ============================================================
# RiskLens — Financial Data Helpers & Calendar Alignment
# Phase 2: Quantitative Risk Engine Utility Module
# ============================================================

import logging
from typing import Literal, Optional, Tuple, Union
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def calc_returns(
    prices: Union[pd.DataFrame, pd.Series],
    method: Literal["simple", "log"] = "simple",
) -> Union[pd.DataFrame, pd.Series]:
    """
    Calculate discrete period returns from a price series or DataFrame.

    Conventions:
      - 'simple': R_t = (P_t - P_{t-1}) / P_{t-1}
        Used for portfolio weight aggregation: R_p = sum(w_i * R_i).
      - 'log': r_t = ln(P_t / P_{t-1})
        Used for multi-period time-additivity when explicitly requested.

    Returns:
        pd.DataFrame or pd.Series with first row (NaN) dropped.
    """
    if prices.empty:
        raise ValueError("Cannot calculate returns on an empty price series/dataframe.")

    if method == "simple":
        returns = prices.pct_change().dropna(how="all")
    elif method == "log":
        returns = np.log(prices / prices.shift(1)).dropna(how="all")
    else:
        raise ValueError(f"Unsupported return calculation method: '{method}'. Choose 'simple' or 'log'.")

    return returns


def align_price_series(
    portfolio_prices_or_returns: Union[pd.DataFrame, pd.Series],
    benchmark: pd.Series,
) -> Tuple[Union[pd.DataFrame, pd.Series], pd.Series]:
    """
    Align portfolio prices/returns and benchmark series to an identical date calendar.

    Rules (Blueprint §7):
      - Strictly inner-join on index dates: no silent date mismatches.
      - Never fabricate missing prices with synthetic data.
      - Ensure DatetimeIndex is timezone-naive date normalized.
    """
    if portfolio_prices_or_returns.empty or benchmark.empty:
        raise ValueError("Cannot align empty series or dataframe.")

    # Normalize DatetimeIndex (strip timezone to avoid comparison errors)
    p = portfolio_prices_or_returns.copy()
    b = benchmark.copy()

    if isinstance(p.index, pd.DatetimeIndex) and p.index.tz is not None:
        p.index = p.index.tz_localize(None).normalize()
    elif isinstance(p.index, pd.DatetimeIndex):
        p.index = p.index.normalize()

    if isinstance(b.index, pd.DatetimeIndex) and b.index.tz is not None:
        b.index = b.index.tz_localize(None).normalize()
    elif isinstance(b.index, pd.DatetimeIndex):
        b.index = b.index.normalize()

    # Find common trading calendar intersection
    common_dates = p.index.intersection(b.index)
    if len(common_dates) == 0:
        raise ValueError("No overlapping dates found between portfolio and benchmark.")

    aligned_p = p.loc[common_dates]
    aligned_b = b.loc[common_dates]

    return aligned_p, aligned_b


def handle_missing_prices(
    prices: pd.DataFrame,
    max_allowed_missing_pct: float = 0.05,
    max_ffill_limit: int = 2,
) -> Tuple[pd.DataFrame, list[str]]:
    """
    Inspect missing price values per asset and handle safely without fabricated data.

    Rules:
      - If missing fraction exceeds `max_allowed_missing_pct` (5%), issue clear warning.
      - Forward fill only short trading pauses (e.g., market holiday mismatches up to 2 days).
      - Drop remaining rows where any asset is missing.
    """
    warnings: list[str] = []
    clean_prices = prices.copy()

    for col in clean_prices.columns:
        total_len = len(clean_prices[col])
        missing_count = int(clean_prices[col].isna().sum())
        if total_len > 0:
            missing_ratio = missing_count / total_len
            if missing_ratio > max_allowed_missing_pct:
                warnings.append(
                    f"{col} has {missing_count}/{total_len} ({missing_ratio:.1%}) missing prices. "
                    f"Exceeds recommended {max_allowed_missing_pct:.0%} threshold."
                )

    # Forward fill short gaps (e.g. 1-2 days)
    clean_prices = clean_prices.ffill(limit=max_ffill_limit)
    # Drop any remaining unfillable rows (e.g. start of series)
    clean_prices = clean_prices.dropna()

    return clean_prices, warnings
