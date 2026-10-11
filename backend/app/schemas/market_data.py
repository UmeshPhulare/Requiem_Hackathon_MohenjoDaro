# ============================================================
# RiskLens — Pydantic Schemas: Market Data (Phase 1)
# ============================================================

from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class AssetSearchResult(BaseModel):
    """A single asset returned from ticker search."""
    symbol: str = Field(..., description="Ticker symbol, e.g. RELIANCE.NS")
    name:   str = Field(..., description="Human-readable company name")


class DataFreshnessInfo(BaseModel):
    """Provenance metadata for a market data response."""
    as_of:       Optional[str] = Field(None, description="ISO date of the latest available price")
    status:      str           = Field("fresh", description="fresh | stale | error")
    source:      str           = Field("yfinance", description="Data provider name")
    warnings:    list[str]     = Field(default_factory=list, description="Non-fatal data warnings")


class PricePoint(BaseModel):
    """Single OHLCV row returned to the frontend (adjusted close only for MVP)."""
    date:  str   = Field(..., description="ISO date string")
    close: float = Field(..., description="Adjusted closing price")


class TickerPriceSeries(BaseModel):
    """Price series for one ticker."""
    symbol: str            = Field(..., description="Ticker symbol")
    name:   str            = Field(..., description="Company name")
    prices: list[PricePoint] = Field(default_factory=list)


class PriceResponse(BaseModel):
    """Response for GET /api/market/prices."""
    tickers:    list[TickerPriceSeries]
    freshness:  DataFreshnessInfo
    benchmark:  Optional[TickerPriceSeries] = None
