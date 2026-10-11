# ============================================================
# RiskLens — yfinance Market Data Client (Phase 1)
# Adapter: get_prices(), search_assets(), validate tickers
# ============================================================

import logging
from datetime import date, timedelta
from typing import Optional

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# ── Supported 12-Stock Universe (Indian Equities — NSE) ────────────────────────
SUPPORTED_TICKERS: dict[str, str] = {
    "BHARTIARTL.NS": "Bharti Airtel",
    "HDFCBANK.NS":   "HDFC Bank",
    "HINDUNILVR.NS": "Hindustan Unilever",
    "ICICIBANK.NS":  "ICICI Bank",
    "INFY.NS":       "Infosys",
    "ITC.NS":        "ITC",
    "LT.NS":         "Larsen & Toubro",
    "ONGC.NS":       "Oil & Natural Gas Corporation",
    "RELIANCE.NS":   "Reliance Industries",
    "SBIN.NS":       "State Bank of India",
    "SUNPHARMA.NS":  "Sun Pharmaceutical",
    "TCS.NS":        "Tata Consultancy Services",
}

BENCHMARK_TICKER = "^NSEI"
MIN_HISTORY_DAYS = 252  # ~1 year of trading days required


def get_supported_tickers() -> dict[str, str]:
    """Return the full supported ticker → name mapping."""
    return SUPPORTED_TICKERS


def search_assets(query: str) -> list[dict]:
    """
    Filter supported tickers by query string (symbol or name, case-insensitive).
    Returns a list of {symbol, name} dicts.
    """
    q = query.strip().lower()
    results = [
        {"symbol": sym, "name": name}
        for sym, name in SUPPORTED_TICKERS.items()
        if q in sym.lower() or q in name.lower()
    ]
    return results


def validate_tickers(symbols: list[str]) -> tuple[list[str], list[str]]:
    """
    Split symbols into (valid, invalid) against the supported universe.
    Returns (valid_list, invalid_list).
    """
    valid   = [s for s in symbols if s in SUPPORTED_TICKERS]
    invalid = [s for s in symbols if s not in SUPPORTED_TICKERS]
    return valid, invalid


def get_prices(
    symbols: list[str],
    start: Optional[date] = None,
    end:   Optional[date] = None,
    period: str = "5y",
) -> dict:
    """
    Fetch adjusted closing prices for the given ticker symbols via yfinance.

    Args:
        symbols:  List of ticker strings (must be in SUPPORTED_TICKERS).
        start:    Start date (overrides `period` if given).
        end:      End date (defaults to today).
        period:   yfinance period string, used if start is None.

    Returns:
        {
            "prices":    pd.DataFrame  (date index, ticker columns — adjusted close),
            "returns":   pd.DataFrame  (daily simple returns, NaN first row dropped),
            "warnings":  list[str],
            "as_of":     str (ISO date of the last available price row),
            "status":    "fresh" | "stale" | "error",
        }

    Raises:
        ValueError if any symbol is outside the supported universe.
        RuntimeError if yfinance returns no data.
    """
    # ── Validate tickers ────────────────────────────────────────────────────
    valid, invalid = validate_tickers(symbols)
    if invalid:
        raise ValueError(
            f"Ticker(s) outside the supported 12-stock MVP universe: {invalid}. "
            f"Supported: {list(SUPPORTED_TICKERS.keys())}"
        )

    warnings: list[str] = []
    end_date   = end   or date.today()
    start_date = start or (end_date - timedelta(days=365 * 5))

    try:
        logger.info("Fetching prices for %s (%s → %s)", symbols, start_date, end_date)

        raw: pd.DataFrame = yf.download(
            tickers=symbols,
            start=str(start_date),
            end=str(end_date),
            auto_adjust=True,
            progress=False,
            threads=True,
        )

        if raw.empty:
            raise RuntimeError(
                f"yfinance returned no data for {symbols} "
                f"({start_date} → {end_date})."
            )

        # ── Extract adjusted close ──────────────────────────────────────────
        if isinstance(raw.columns, pd.MultiIndex):
            prices: pd.DataFrame = raw["Close"].copy()
        else:
            prices = raw[["Close"]].copy()
            prices.columns = symbols

        # ── Drop rows where ALL tickers are NaN ────────────────────────────
        prices.dropna(how="all", inplace=True)

        # ── Per-ticker warnings for short history ───────────────────────────
        for sym in symbols:
            if sym not in prices.columns:
                warnings.append(f"No price data returned for {sym}.")
                continue
            n_rows = prices[sym].dropna().shape[0]
            if n_rows < MIN_HISTORY_DAYS:
                warnings.append(
                    f"{sym}: only {n_rows} trading days of history found "
                    f"(minimum required: {MIN_HISTORY_DAYS}). "
                    "Results may be unreliable."
                )

        # ── Daily simple returns ────────────────────────────────────────────
        returns: pd.DataFrame = prices.pct_change().dropna()

        as_of = prices.index[-1].date().isoformat() if not prices.empty else None

        # ── Staleness check (no data in last 5 calendar days) ──────────────
        status = "fresh"
        if as_of and (date.today() - date.fromisoformat(as_of)).days > 5:
            status = "stale"
            warnings.append(
                f"Latest available price is from {as_of}. "
                "Data may be stale (weekend/holiday/provider delay)."
            )

        logger.info(
            "Fetched %d rows × %d tickers. as_of=%s status=%s",
            len(prices), len(symbols), as_of, status,
        )

        return {
            "prices":   prices,
            "returns":  returns,
            "warnings": warnings,
            "as_of":    as_of,
            "status":   status,
        }

    except RuntimeError:
        raise
    except Exception as exc:
        logger.exception("yfinance fetch failed for %s", symbols)
        raise RuntimeError(
            f"Market data provider (yfinance) failed: {exc}"
        ) from exc
