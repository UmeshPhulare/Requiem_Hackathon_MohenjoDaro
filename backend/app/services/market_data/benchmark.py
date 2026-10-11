# ============================================================
# RiskLens — Benchmark Data Service (Phase 1)
# Fetches NIFTY 50 (^NSEI) and aligns it with a portfolio window.
# ============================================================

import logging
from datetime import date, timedelta
from typing import Optional

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

BENCHMARK_TICKER = "^NSEI"


def get_benchmark_prices(
    start: Optional[date] = None,
    end:   Optional[date] = None,
) -> pd.Series:
    """
    Fetch NIFTY 50 (^NSEI) adjusted closing prices.

    Args:
        start: Start date. Defaults to 5 years ago.
        end:   End date. Defaults to today.

    Returns:
        pd.Series with DatetimeIndex and float values (adjusted close).

    Raises:
        RuntimeError if yfinance returns no data.
    """
    end_date   = end   or date.today()
    start_date = start or (end_date - timedelta(days=365 * 5))

    logger.info(
        "Fetching benchmark %s (%s → %s)", BENCHMARK_TICKER, start_date, end_date
    )

    try:
        raw: pd.DataFrame = yf.download(
            tickers=BENCHMARK_TICKER,
            start=str(start_date),
            end=str(end_date),
            auto_adjust=True,
            progress=False,
        )

        if raw.empty:
            raise RuntimeError(
                f"yfinance returned no data for benchmark {BENCHMARK_TICKER} "
                f"({start_date} → {end_date})."
            )

        # Flatten MultiIndex if present
        if isinstance(raw.columns, pd.MultiIndex):
            close = raw["Close"].iloc[:, 0]
        else:
            close = raw["Close"]

        close.name = BENCHMARK_TICKER
        close.dropna(inplace=True)

        logger.info(
            "Benchmark fetched: %d rows, last=%s",
            len(close),
            close.index[-1].date().isoformat() if not close.empty else "N/A",
        )
        return close

    except RuntimeError:
        raise
    except Exception as exc:
        logger.exception("Benchmark fetch failed for %s", BENCHMARK_TICKER)
        raise RuntimeError(
            f"Market data provider (yfinance) failed fetching benchmark {BENCHMARK_TICKER}: {exc}"
        ) from exc


def get_benchmark_returns(
    start: Optional[date] = None,
    end:   Optional[date] = None,
) -> pd.Series:
    """
    Fetch and compute daily simple returns for NIFTY 50.

    Returns:
        pd.Series of daily returns with DatetimeIndex.
    """
    prices = get_benchmark_prices(start=start, end=end)
    returns = prices.pct_change().dropna()
    returns.name = BENCHMARK_TICKER
    return returns


def align_benchmark_to_portfolio(
    portfolio_returns: pd.DataFrame,
    start: Optional[date] = None,
    end:   Optional[date] = None,
) -> pd.Series:
    """
    Fetch benchmark and align its date index to match the portfolio returns index.
    Missing benchmark dates are forward-filled (at most 5 days).

    Args:
        portfolio_returns: pd.DataFrame with DatetimeIndex (portfolio daily returns).
        start: Optional override for start date.
        end:   Optional override for end date.

    Returns:
        pd.Series of benchmark returns aligned to portfolio dates.
    """
    p_start = start or portfolio_returns.index[0].date()
    p_end   = end   or portfolio_returns.index[-1].date()

    # Fetch a slightly wider window to ensure coverage after alignment
    fetch_start = p_start - timedelta(days=10)
    bm_returns  = get_benchmark_returns(start=fetch_start, end=p_end)

    # Reindex to portfolio dates; ffill missing (weekends/holidays) up to 5 days
    aligned = bm_returns.reindex(portfolio_returns.index, method="ffill", limit=5)

    missing = aligned.isna().sum()
    if missing > 0:
        logger.warning(
            "Benchmark alignment: %d dates still missing after ffill. "
            "These rows will be NaN in downstream calculations.",
            missing,
        )

    return aligned
