# ============================================================
# RiskLens — Market Intelligence & Financial Sentiment Coordinator
# Phase 14: Market Intelligence (Bonus)
# Blueprint Ref: §1 Bonus AI Market Intelligence, §2 Context-Only
# ============================================================

from datetime import datetime, timezone
import logging
from typing import Any, Optional

from app.schemas.intelligence import (
    NewsSentimentItem,
    AssetSentimentSummary,
    PortfolioIntelligenceResponse,
    SingleNewsResponse,
)
from app.services.ai.news_fetcher import get_news_for_asset, fetch_news_rss
from app.services.ai.sentiment_analyzer import analyze_text
from app.services.market_data.yfinance_client import SUPPORTED_TICKERS

logger = logging.getLogger(__name__)


def process_and_score_articles(
    raw_articles: list[dict[str, Any]],
    symbol: Optional[str] = None,
) -> list[NewsSentimentItem]:
    """
    Score a list of raw news articles with NLP financial sentiment and catalyst tags.
    """
    scored_items: list[NewsSentimentItem] = []

    for art in raw_articles:
        title = art.get("title", "")
        nlp_res = analyze_text(title)

        item = NewsSentimentItem(
            id=art.get("id", ""),
            title=title,
            publisher=art.get("publisher", "Market News"),
            published_at=art.get("published_at", "Recent"),
            url=art.get("url", "#"),
            symbol=art.get("symbol") or symbol,
            sector=art.get("sector"),
            sentiment_label=nlp_res["sentiment_label"],
            sentiment_score=nlp_res["sentiment_score"],
            probabilities=nlp_res["probabilities"],
            key_signals=nlp_res["signals"],
        )
        scored_items.append(item)

    return scored_items


def build_portfolio_market_intelligence(
    symbols: list[str],
    weights: Optional[dict[str, float]] = None,
    max_articles_per_asset: int = 5,
) -> PortfolioIntelligenceResponse:
    """
    Generate comprehensive market intelligence for a portfolio.
    Strictly marked as qualitative context-only.
    """
    if not symbols:
        raise ValueError("At least one symbol must be provided.")

    # Normalize weights
    norm_w: dict[str, float] = {}
    if weights:
        w_filtered = {s: max(0.0, float(weights.get(s, 0.0))) for s in symbols}
        tot = sum(w_filtered.values())
        if tot > 0:
            norm_w = {s: w / tot for s, w in w_filtered.items()}
        else:
            norm_w = {s: 1.0 / len(symbols) for s in symbols}
    else:
        norm_w = {s: 1.0 / len(symbols) for s in symbols}

    asset_summaries: list[AssetSentimentSummary] = []
    all_scored_articles: list[NewsSentimentItem] = []
    portfolio_sentiment_score = 0.0

    total_pos = 0
    total_neu = 0
    total_neg = 0
    collected_market_signals: set[str] = set()

    for sym in symbols:
        raw_news = get_news_for_asset(sym, limit=max_articles_per_asset)
        scored = process_and_score_articles(raw_news, symbol=sym)
        all_scored_articles.extend(scored)

        pos_count = sum(1 for a in scored if a.sentiment_label == "Positive")
        neu_count = sum(1 for a in scored if a.sentiment_label == "Neutral")
        neg_count = sum(1 for a in scored if a.sentiment_label == "Negative")

        total_pos += pos_count
        total_neu += neu_count
        total_neg += neg_count

        avg_score = (
            sum(a.sentiment_score for a in scored) / len(scored)
            if scored
            else 0.0
        )
        avg_score = round(avg_score, 4)

        if avg_score >= 0.15:
            label = "Bullish"
        elif avg_score <= -0.15:
            label = "Bearish"
        else:
            label = "Neutral"

        # Unique signals for this asset
        asset_signals = list({sig for a in scored for sig in a.key_signals})
        collected_market_signals.update(asset_signals)

        weight = norm_w.get(sym, 1.0 / len(symbols))
        portfolio_sentiment_score += avg_score * weight

        name = SUPPORTED_TICKERS.get(sym, sym.split(".")[0])
        asset_summaries.append(
            AssetSentimentSummary(
                symbol=sym,
                name=name,
                sentiment_label=label,
                sentiment_score=avg_score,
                article_count=len(scored),
                positive_count=pos_count,
                neutral_count=neu_count,
                negative_count=neg_count,
                dominant_signals=asset_signals,
                headlines=scored,
            )
        )

    portfolio_sentiment_score = round(portfolio_sentiment_score, 4)

    # Classify overall portfolio sentiment
    if portfolio_sentiment_score >= 0.35:
        p_label = "Bullish"
    elif portfolio_sentiment_score >= 0.10:
        p_label = "Mildly Bullish"
    elif portfolio_sentiment_score > -0.10:
        p_label = "Neutral"
    elif portfolio_sentiment_score > -0.35:
        p_label = "Mildly Bearish"
    else:
        p_label = "Bearish"

    # Sort top headlines by absolute sentiment polarity (most impactful first)
    sorted_headlines = sorted(
        all_scored_articles,
        key=lambda x: abs(x.sentiment_score),
        reverse=True,
    )

    now_iso = datetime.now(timezone.utc).isoformat()

    return PortfolioIntelligenceResponse(
        portfolio_sentiment_score=portfolio_sentiment_score,
        portfolio_sentiment_label=p_label,
        sentiment_distribution={
            "positive": total_pos,
            "neutral": total_neu,
            "negative": total_neg,
        },
        asset_sentiments=asset_summaries,
        top_headlines=sorted_headlines[:15],
        market_signals=sorted(list(collected_market_signals)),
        as_of=now_iso,
        context_only=True,
        disclaimer=(
            "Sentiment is provided as qualitative market intelligence only "
            "and does not compute or alter quantitative risk metrics or return forecasts."
        ),
    )


def query_market_intelligence(
    query: Optional[str] = None,
    symbol: Optional[str] = None,
    limit: int = 10,
) -> SingleNewsResponse:
    """Query news and compute sentiment for a specific search topic or ticker."""
    search_str = query or ""
    if symbol:
        name = SUPPORTED_TICKERS.get(symbol, symbol.split(".")[0])
        search_str = f"{name} {query or 'stock market news'}"

    raw_articles = fetch_news_rss(search_str or "Indian stock market financial news", limit=limit)
    scored = process_and_score_articles(raw_articles, symbol=symbol)

    avg_score = (
        sum(a.sentiment_score for a in scored) / len(scored)
        if scored
        else 0.0
    )
    avg_score = round(avg_score, 4)

    if avg_score >= 0.15:
        label = "Bullish"
    elif avg_score <= -0.15:
        label = "Bearish"
    else:
        label = "Neutral"

    return SingleNewsResponse(
        query=search_str,
        symbol=symbol,
        count=len(scored),
        sentiment_score=avg_score,
        sentiment_label=label,
        articles=scored,
        as_of=datetime.now(timezone.utc).isoformat(),
        context_only=True,
        disclaimer=(
            "Sentiment is provided as qualitative market intelligence only "
            "and does not compute or alter quantitative risk metrics or return forecasts."
        ),
    )
