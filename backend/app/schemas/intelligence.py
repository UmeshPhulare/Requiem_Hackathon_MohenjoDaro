# ============================================================
# RiskLens — Market Intelligence & Financial Sentiment Schemas
# Phase 14: Market Intelligence (Bonus)
# Blueprint Ref: §1 Bonus, §2 Context-only, §3 Optional news NLP
# ============================================================

from typing import Any, Optional
from pydantic import BaseModel, Field


class NewsSentimentItem(BaseModel):
    """Individual financial news headline with NLP sentiment classification."""
    id: str = Field(..., description="Unique article ID or hash")
    title: str = Field(..., description="Headline title")
    publisher: str = Field(..., description="News publisher (e.g. Livemint, Economic Times)")
    published_at: str = Field(..., description="Publication timestamp or relative time")
    url: str = Field(..., description="URL to the news story")
    symbol: Optional[str] = Field(None, description="Related stock ticker (e.g. RELIANCE.NS)")
    sector: Optional[str] = Field(None, description="Industry sector (e.g. Energy, Banking)")
    sentiment_label: str = Field(..., description="Sentiment: 'Positive', 'Neutral', or 'Negative'")
    sentiment_score: float = Field(..., description="Compound sentiment score [-1.0 to +1.0]")
    probabilities: dict[str, float] = Field(
        ...,
        description="Sentiment probability distribution {'Positive': p, 'Neutral': p, 'Negative': p}"
    )
    key_signals: list[str] = Field(
        default_factory=list,
        description="Detected financial catalysts (e.g. ['Earnings Growth', 'Capex Expansion'])"
    )


class AssetSentimentSummary(BaseModel):
    """Aggregated sentiment metrics for an individual asset."""
    symbol: str = Field(..., description="Asset ticker symbol")
    name: str = Field(..., description="Asset company name")
    sentiment_label: str = Field(..., description="'Bullish', 'Neutral', or 'Bearish'")
    sentiment_score: float = Field(..., description="Mean compound sentiment score [-1.0 to +1.0]")
    article_count: int = Field(..., description="Number of news articles analyzed")
    positive_count: int = Field(0, description="Count of positive articles")
    neutral_count: int = Field(0, description="Count of neutral articles")
    negative_count: int = Field(0, description="Count of negative articles")
    dominant_signals: list[str] = Field(
        default_factory=list,
        description="Top detected financial themes across articles"
    )
    headlines: list[NewsSentimentItem] = Field(
        default_factory=list,
        description="Recent news headlines for this asset"
    )


class PortfolioIntelligenceRequest(BaseModel):
    """Request payload to analyze market intelligence across portfolio holdings."""
    symbols: list[str] = Field(..., min_length=1, description="List of ticker symbols")
    weights: Optional[dict[str, float]] = Field(
        None,
        description="Optional portfolio weights mapping {symbol: weight}. If None, equal-weighted."
    )
    max_articles_per_asset: int = Field(
        5,
        ge=1,
        le=20,
        description="Max news articles to fetch and score per asset"
    )


class PortfolioIntelligenceResponse(BaseModel):
    """
    Consolidated market intelligence response.
    Enforces Blueprint §2: Sentiment is supplemental context only;
    it never calculates or alters portfolio quantitative metrics.
    """
    portfolio_sentiment_score: float = Field(
        ...,
        description="Holdings-weighted portfolio sentiment score [-1.0 to +1.0]"
    )
    portfolio_sentiment_label: str = Field(
        ...,
        description="'Bullish', 'Mildly Bullish', 'Neutral', 'Mildly Bearish', or 'Bearish'"
    )
    sentiment_distribution: dict[str, int] = Field(
        ...,
        description="Total counts {'positive': x, 'neutral': y, 'negative': z}"
    )
    asset_sentiments: list[AssetSentimentSummary] = Field(
        default_factory=list,
        description="Per-asset sentiment summaries"
    )
    top_headlines: list[NewsSentimentItem] = Field(
        default_factory=list,
        description="Consolidated and ranked top market news headlines"
    )
    market_signals: list[str] = Field(
        default_factory=list,
        description="High-level themes across the portfolio (e.g. 'Strong Quarterly Earnings')"
    )
    ai_market_pulse: Optional[str] = Field(
        None,
        description="Executive AI synthesis powered by Gemini / Groq"
    )
    as_of: str = Field(..., description="Analysis execution timestamp (ISO)")
    context_only: bool = Field(
        True,
        description="Confirmation that sentiment serves as qualitative context only"
    )
    disclaimer: str = Field(
        "Sentiment is provided as qualitative market intelligence only and does not compute or alter quantitative risk metrics or return forecasts.",
        description="Compliance notice"
    )


class SingleNewsRequest(BaseModel):
    """Request payload for targeted news queries or sector search."""
    query: Optional[str] = Field(None, description="Free-text search query or sector name")
    symbol: Optional[str] = Field(None, description="Target ticker symbol")
    limit: int = Field(10, ge=1, le=50, description="Max news articles to return")


class SingleNewsResponse(BaseModel):
    """Response containing sentiment-scored news articles for a single query."""
    query: str
    symbol: Optional[str] = None
    count: int
    sentiment_score: float
    sentiment_label: str
    articles: list[NewsSentimentItem]
    as_of: str
    context_only: bool = True
    disclaimer: str = "Sentiment is provided as qualitative market intelligence only and does not compute or alter quantitative risk metrics or return forecasts."
