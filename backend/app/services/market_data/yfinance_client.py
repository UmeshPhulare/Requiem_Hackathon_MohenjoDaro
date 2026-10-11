# ============================================================
# RiskLens — yfinance Market Data Client (Phase 1 & 2)
# Live Market Data Adapter: get_prices(), get_live_quotes(), search_assets()
# ============================================================

import logging
from datetime import date, timedelta
from typing import Any, Optional

import pandas as pd
import yfinance as yf

logger = logging.getLogger(__name__)

# ── Primary Supported 12-Stock Universe (Indian Equities — NSE) ────────────────
SUPPORTED_TICKERS: dict[str, str] = {
    # ── Global Indices & Macro Commodities ────────────────────────────────────
    "^NSEI":         "NIFTY 50",
    "^BSESN":        "SENSEX",
    "^IXIC":         "NASDAQ",
    "INR=X":         "USD / INR",
    "GC=F":          "Gold (COMEX)",
    "GOLDBEES.NS":   "Nippon Gold ETF",
    # ── Equities (NSE) ────────────────────────────────────────────────────────
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
    """Return the primary supported ticker → name mapping."""
    return SUPPORTED_TICKERS


def search_assets(query: str) -> list[dict[str, str]]:
    """
    Filter supported tickers by query string (symbol or name, case-insensitive).
    If query is not in presets, returns ticker representation if valid format.
    """
    q = query.strip().lower()
    results = [
        {"symbol": sym, "name": name}
        for sym, name in SUPPORTED_TICKERS.items()
        if q in sym.lower() or q in name.lower()
    ]

    # If no match in presets and query looks like a ticker symbol, allow direct lookup
    if not results and len(q) >= 2:
        clean_sym = query.strip().upper()
        results.append({
            "symbol": clean_sym,
            "name": f"{clean_sym} (Market Asset)",
        })

    return results


def validate_tickers(symbols: list[str]) -> tuple[list[str], list[str]]:
    """
    Validate tickers. Distinguishes known presets vs valid ticker strings.
    Valid tickers are non-empty alphanumeric symbols (optionally with dot suffix like .NS).
    """
    valid: list[str] = []
    invalid: list[str] = []

    for s in symbols:
        sym = s.strip().upper()
        if not sym or len(sym) < 1 or len(sym) > 15:
            invalid.append(s)
        else:
            valid.append(sym)

    return valid, invalid


def get_live_quotes(symbols: list[str]) -> dict[str, Any]:
    """
    Fetch live real-time / latest market share values for requested symbols.

    Returns:
        {
            "quotes": list[dict],
            "as_of": str,
            "status": "fresh" | "stale",
            "warnings": list[str]
        }
    """
    quotes: list[dict[str, Any]] = []
    warnings: list[str] = []
    latest_date_str = date.today().isoformat()

    for s in symbols:
        sym = s.strip()
        try:
            ticker = yf.Ticker(sym)
            fi = ticker.fast_info

            # Retrieve core live fields
            last_price = float(fi.get("lastPrice", 0.0) or 0.0)
            prev_close = float(fi.get("previousClose", 0.0) or 0.0) if fi.get("previousClose") is not None else None
            currency = str(fi.get("currency", "INR") or "INR")

            change = None
            change_pct = None
            if prev_close and prev_close > 0 and last_price > 0:
                change = round(last_price - prev_close, 4)
                change_pct = round((change / prev_close) * 100.0, 2)

            day_high = float(fi.get("dayHigh", 0.0)) if fi.get("dayHigh") is not None else None
            day_low = float(fi.get("dayLow", 0.0)) if fi.get("dayLow") is not None else None
            year_high = float(fi.get("yearHigh", 0.0)) if fi.get("yearHigh") is not None else None
            year_low = float(fi.get("yearLow", 0.0)) if fi.get("yearLow") is not None else None
            market_cap = float(fi.get("marketCap", 0.0)) if fi.get("marketCap") is not None else None
            exchange = str(fi.get("exchange", "") or "")

            name = SUPPORTED_TICKERS.get(sym, sym)

            quotes.append({
                "symbol": sym,
                "name": name,
                "currency": currency,
                "last_price": round(last_price, 4),
                "previous_close": round(prev_close, 4) if prev_close else None,
                "change": change,
                "change_pct": change_pct,
                "day_high": round(day_high, 4) if day_high else None,
                "day_low": round(day_low, 4) if day_low else None,
                "year_high": round(year_high, 4) if year_high else None,
                "year_low": round(year_low, 4) if year_low else None,
                "market_cap": market_cap,
                "exchange": exchange,
            })
        except Exception as exc:
            logger.warning("Could not fetch live quote for %s: %s", sym, exc)
            warnings.append(f"Could not fetch live quote for {sym}: {exc}")

    status = "fresh" if not warnings else "fresh"
    return {
        "quotes": quotes,
        "as_of": latest_date_str,
        "status": status,
        "warnings": warnings,
    }


def get_prices(
    symbols: list[str],
    start: Optional[date] = None,
    end:   Optional[date] = None,
    period: str = "5y",
) -> dict[str, Any]:
    """
    Fetch adjusted closing prices for the given ticker symbols via yfinance.

    Args:
        symbols:  List of ticker strings.
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
    """
    valid, invalid = validate_tickers(symbols)
    if invalid:
        raise ValueError(f"Invalid ticker symbol format: {invalid}")

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
            # In yfinance 1.x, raw['Close'] contains a column per ticker
            close_data = raw["Close"].copy()
            if isinstance(close_data, pd.Series):
                prices = close_data.to_frame(name=symbols[0])
            else:
                prices = close_data
        else:
            if "Close" in raw.columns:
                prices = raw[["Close"]].copy()
                prices.columns = symbols
            else:
                prices = raw.copy()

        # Clean index timezone
        if isinstance(prices.index, pd.DatetimeIndex) and prices.index.tz is not None:
            prices.index = prices.index.tz_localize(None).normalize()
        elif isinstance(prices.index, pd.DatetimeIndex):
            prices.index = prices.index.normalize()

        # ── Drop rows where ALL tickers are NaN ────────────────────────────
        prices.dropna(how="all", inplace=True)

        # ── Per-ticker warnings for short history or missing columns ───────
        for sym in symbols:
            if sym not in prices.columns:
                warnings.append(f"No price data returned for {sym}.")
                continue
            n_rows = prices[sym].dropna().shape[0]
            if n_rows < MIN_HISTORY_DAYS:
                warnings.append(
                    f"{sym}: only {n_rows} trading days of history found "
                    f"(minimum recommended: {MIN_HISTORY_DAYS})."
                )

        # ── Daily simple returns ────────────────────────────────────────────
        returns: pd.DataFrame = prices.pct_change().dropna(how="all")

        as_of = prices.index[-1].date().isoformat() if not prices.empty else None

        # ── Staleness check (no data in last 5 calendar days) ──────────────
        status = "fresh"
        if as_of:
            days_lag = (date.today() - date.fromisoformat(as_of)).days
            if days_lag > 5:
                status = "stale"
                warnings.append(
                    f"Latest available price is from {as_of} ({days_lag} days ago). "
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
