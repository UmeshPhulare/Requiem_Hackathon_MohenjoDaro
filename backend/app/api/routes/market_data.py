# ============================================================
# RiskLens — Market Data API Routes (Phase 1 & 2)
# GET /api/market/assets
# GET /api/market/assets/search?q=
# GET /api/market/prices?symbols=&period=
# GET /api/market/quotes?symbols=
# ============================================================

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from app.services.market_data.yfinance_client import (
    search_assets,
    get_prices,
    get_live_quotes,
    get_supported_tickers,
    validate_tickers,
    SUPPORTED_TICKERS,
)
from app.services.market_data.benchmark import get_benchmark_prices
from app.schemas.market_data import (
    AssetSearchResult,
    DataFreshnessInfo,
    PricePoint,
    PriceResponse,
    TickerPriceSeries,
    QuotesResponse,
    LiveQuote,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/assets",
    response_model=list[AssetSearchResult],
    summary="List all supported assets",
    tags=["Market Data"],
)
async def list_assets():
    """Return all tickers in the supported 12-stock universe."""
    return [
        {"symbol": sym, "name": name}
        for sym, name in SUPPORTED_TICKERS.items()
    ]


@router.get(
    "/assets/search",
    response_model=list[AssetSearchResult],
    summary="Search supported assets by symbol or name",
    tags=["Market Data"],
)
async def search_assets_endpoint(
    q: str = Query(..., min_length=1, description="Search query (symbol or company name)"),
):
    """
    Filter assets by partial symbol or company name.
    Example: /api/market/assets/search?q=rel → returns RELIANCE.NS
    """
    results = search_assets(q)
    return results


@router.get(
    "/quotes",
    response_model=QuotesResponse,
    summary="Fetch real-time / latest live market quotes for shares",
    tags=["Market Data"],
)
async def get_quotes_endpoint(
    symbols: str = Query(..., description="Comma-separated tickers, e.g. RELIANCE.NS,TCS.NS,INFY.NS"),
):
    """
    Fetch live share values directly from Yahoo Finance:
    - Current share price
    - Previous close
    - Daily change & change percentage
    - Day high / low
    - 52-week high / low
    - Market cap & currency
    """
    ticker_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    if not ticker_list:
        raise HTTPException(status_code=422, detail="At least one symbol is required.")

    valid, invalid = validate_tickers(ticker_list)
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid ticker format: {invalid}")

    data = get_live_quotes(ticker_list)
    freshness = DataFreshnessInfo(
        as_of=data["as_of"],
        status=data["status"],
        source="yfinance",
        warnings=data["warnings"],
    )

    quotes = [LiveQuote(**q) for q in data["quotes"]]
    return QuotesResponse(quotes=quotes, freshness=freshness)


@router.get(
    "/prices",
    response_model=PriceResponse,
    summary="Fetch historical adjusted closing prices",
    tags=["Market Data"],
)
async def get_prices_endpoint(
    symbols:    str            = Query(..., description="Comma-separated tickers, e.g. RELIANCE.NS,TCS.NS"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date:   Optional[date] = Query(None, description="End date   (YYYY-MM-DD)"),
    period:     str            = Query("5y",  description="yfinance period (1y, 2y, 5y) — used if start_date not given"),
    benchmark:  bool           = Query(False, description="Whether to include NIFTY 50 benchmark prices"),
):
    """
    Fetch adjusted closing prices for one or more tickers.

    - Returns per-ticker price series + data freshness metadata.
    - Optionally includes NIFTY 50 (^NSEI) benchmark.
    - Non-fatal warnings returned in `freshness.warnings` field.
    """
    ticker_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]

    if not ticker_list:
        raise HTTPException(status_code=422, detail="At least one symbol is required.")

    valid, invalid = validate_tickers(ticker_list)
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid ticker format: {invalid}")

    try:
        result = get_prices(
            symbols=ticker_list,
            start=start_date,
            end=end_date,
            period=period,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    prices_df = result["prices"]

    # ── Build TickerPriceSeries list ────────────────────────────────────────
    ticker_series: list[TickerPriceSeries] = []
    for sym in ticker_list:
        if sym not in prices_df.columns:
            continue
        col = prices_df[sym].dropna()
        price_points = [
            PricePoint(date=idx.date().isoformat(), close=round(float(val), 4))
            for idx, val in col.items()
        ]
        ticker_series.append(
            TickerPriceSeries(
                symbol=sym,
                name=SUPPORTED_TICKERS.get(sym, sym),
                prices=price_points,
            )
        )

    # ── Optional benchmark ──────────────────────────────────────────────────
    benchmark_series: Optional[TickerPriceSeries] = None
    if benchmark:
        try:
            bm_prices = get_benchmark_prices(start=start_date, end=end_date)
            bm_points = [
                PricePoint(date=idx.date().isoformat(), close=round(float(val), 4))
                for idx, val in bm_prices.items()
            ]
            benchmark_series = TickerPriceSeries(
                symbol="^NSEI",
                name="NIFTY 50",
                prices=bm_points,
            )
        except RuntimeError as exc:
            result["warnings"].append(f"Benchmark fetch failed: {exc}")

    freshness = DataFreshnessInfo(
        as_of=result["as_of"],
        status=result["status"],
        source="yfinance",
        warnings=result["warnings"],
    )

    return PriceResponse(
        tickers=ticker_series,
        freshness=freshness,
        benchmark=benchmark_series,
    )
