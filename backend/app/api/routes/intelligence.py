# ============================================================
# RiskLens — Market Intelligence & Financial Sentiment Routes
# Phase 14: Market Intelligence (Bonus)
# Blueprint Ref: §1 AI-Based Market Intelligence, §2 Context-Only
# ============================================================

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.schemas.intelligence import (
    PortfolioIntelligenceRequest,
    PortfolioIntelligenceResponse,
    SingleNewsRequest,
    SingleNewsResponse,
)
from app.services.ai.market_intelligence import (
    build_portfolio_market_intelligence,
    query_market_intelligence,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intelligence", tags=["Market Intelligence"])


@router.post(
    "/portfolio",
    response_model=PortfolioIntelligenceResponse,
    summary="Compute sentiment & news intelligence for a portfolio",
    description=(
        "Fetches recent financial news for portfolio holdings, scores sentiment using "
        "the financial NLP engine, tags catalysts, and computes holdings-weighted sentiment. "
        "Strictly marked as supplemental context only (does not alter quant risk metrics)."
    ),
)
async def analyze_portfolio_intelligence(payload: PortfolioIntelligenceRequest):
    """Analyze news and sentiment across portfolio assets."""
    try:
        response = build_portfolio_market_intelligence(
            symbols=payload.symbols,
            weights=payload.weights,
            max_articles_per_asset=payload.max_articles_per_asset,
        )
        return response
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to compute portfolio market intelligence")
        raise HTTPException(
            status_code=500,
            detail=f"Error computing portfolio market intelligence: {str(exc)}",
        )


@router.post(
    "/news",
    response_model=SingleNewsResponse,
    summary="Search financial news and sentiment for a topic or ticker",
    description="Fetch and sentiment-score news for a specific query or asset symbol.",
)
async def query_news_intelligence(payload: SingleNewsRequest):
    """Fetch and score news for a specific query or ticker."""
    try:
        response = query_market_intelligence(
            query=payload.query,
            symbol=payload.symbol,
            limit=payload.limit,
        )
        return response
    except Exception as exc:
        logger.exception("Failed to query news intelligence")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving news intelligence: {str(exc)}",
        )


@router.get(
    "/headlines",
    response_model=SingleNewsResponse,
    summary="Quick GET headlines with sentiment tags",
)
async def get_headlines(
    symbol: Optional[str] = Query(None, description="Optional stock symbol (e.g. RELIANCE.NS)"),
    query: Optional[str] = Query(None, description="Optional search term"),
    limit: int = Query(8, ge=1, le=30, description="Max news articles"),
):
    """Convenience GET endpoint for ticker tapes or dashboard news feeds."""
    try:
        response = query_market_intelligence(
            query=query,
            symbol=symbol,
            limit=limit,
        )
        return response
    except Exception as exc:
        logger.exception("Failed to retrieve headlines")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving headlines: {str(exc)}",
        )
