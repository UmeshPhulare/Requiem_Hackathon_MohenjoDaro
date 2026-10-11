# ============================================================
# RiskLens — Unit Tests for Market Intelligence & Financial NLP
# Phase 14: Market Intelligence (Bonus)
# ============================================================

import pytest
from app.services.ai.sentiment_analyzer import analyze_text, FinancialSentimentAnalyzer
from app.services.ai.news_fetcher import get_news_for_asset, resolve_search_term
from app.services.ai.market_intelligence import (
    build_portfolio_market_intelligence,
    query_market_intelligence,
)


def test_positive_headline_sentiment():
    analyzer = FinancialSentimentAnalyzer()
    res = analyzer.analyze_headline("TCS posts record high quarterly profit surge and announces robust dividend")
    assert res["sentiment_label"] == "Positive"
    assert res["sentiment_score"] > 0.2
    assert res["probabilities"]["Positive"] > res["probabilities"]["Negative"]
    assert "Earnings & Results" in res["signals"] or "Dividends & Buybacks" in res["signals"]


def test_negative_headline_sentiment():
    analyzer = FinancialSentimentAnalyzer()
    res = analyzer.analyze_headline("Shares plunge after SEBI initiates fraud probe and brokerage slashes target price with downgrade")
    assert res["sentiment_label"] == "Negative"
    assert res["sentiment_score"] < -0.2
    assert res["probabilities"]["Negative"] > res["probabilities"]["Positive"]
    assert any(s in res["signals"] for s in ["Regulatory & Legal", "Analyst Ratings"])


def test_neutral_headline_sentiment():
    analyzer = FinancialSentimentAnalyzer()
    res = analyzer.analyze_headline("Company schedules annual general meeting for next month")
    assert res["sentiment_label"] == "Neutral"
    assert abs(res["sentiment_score"]) < 0.20


def test_negation_flips_sentiment():
    analyzer = FinancialSentimentAnalyzer()
    # "failed to grow" should not be positive
    res = analyzer.analyze_headline("Company failed to achieve profit growth amidst headwinds")
    assert res["sentiment_score"] < 0.0


def test_catalyst_detection_topics():
    analyzer = FinancialSentimentAnalyzer()
    signals = analyzer.detect_signals("HDFC Bank Q3 net profit climbs; announces interim dividend and expansion capex")
    assert "Earnings & Results" in signals
    assert "Dividends & Buybacks" in signals
    assert "M&A & Expansion" in signals


def test_news_fetcher_retrieval_and_fallbacks():
    articles = get_news_for_asset("RELIANCE.NS", limit=3)
    assert len(articles) > 0
    first = articles[0]
    assert "id" in first
    assert "title" in first
    assert "publisher" in first
    assert first["symbol"] == "RELIANCE.NS"


def test_portfolio_market_intelligence_end_to_end():
    symbols = ["RELIANCE.NS", "TCS.NS"]
    weights = {"RELIANCE.NS": 0.6, "TCS.NS": 0.4}
    res = build_portfolio_market_intelligence(symbols, weights, max_articles_per_asset=3)

    assert res.context_only is True
    assert "Sentiment is provided as qualitative market intelligence only" in res.disclaimer
    assert -1.0 <= res.portfolio_sentiment_score <= 1.0
    assert len(res.asset_sentiments) == 2
    assert "positive" in res.sentiment_distribution
    assert len(res.top_headlines) > 0


def test_single_news_query():
    res = query_market_intelligence(symbol="TCS.NS", limit=4)
    assert res.context_only is True
    assert res.symbol == "TCS.NS"
    assert len(res.articles) > 0
