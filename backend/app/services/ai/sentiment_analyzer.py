# ============================================================
# RiskLens — Financial Sentiment NLP Analyzer
# Phase 14: Market Intelligence (Bonus)
# Blueprint Ref: §1 AI-Based Market Intelligence, §2 Context-Only, §3 News NLP
# ============================================================

import re
import math
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Loughran-McDonald & Financial Market Lexicon ──────────────────────────────
FINANCIAL_POSITIVE_LEXICON = {
    # Strong positive (+2.0 to +3.0)
    "surge": 2.5, "surges": 2.5, "surged": 2.5, "surging": 2.5,
    "soar": 2.5, "soars": 2.5, "soared": 2.5, "soaring": 2.5,
    "rally": 2.2, "rallies": 2.2, "rallied": 2.2, "rallying": 2.2,
    "jump": 2.0, "jumps": 2.0, "jumped": 2.0, "jumping": 2.0,
    "outperform": 2.5, "outperformed": 2.5, "outperforming": 2.5,
    "upgrade": 2.2, "upgrades": 2.2, "upgraded": 2.2, "upgrading": 2.2,
    "record high": 3.0, "all-time high": 3.0, "multi-year high": 2.5,
    "bullish": 2.2, "bull": 1.5, "bulls": 1.5,
    "beat": 2.0, "beats": 2.0, "beating": 2.0,
    "breakthrough": 2.5,

    # Moderate positive (+1.0 to +1.8)
    "profit": 1.6, "profits": 1.6, "profitable": 1.5,
    "gain": 1.5, "gains": 1.5, "gained": 1.5, "gaining": 1.5,
    "growth": 1.6, "grows": 1.4, "grew": 1.4, "growing": 1.4,
    "robust": 1.8, "strong": 1.6, "strength": 1.5,
    "rebound": 1.8, "rebounds": 1.8, "rebounded": 1.8,
    "boost": 1.7, "boosts": 1.7, "boosted": 1.7, "boosting": 1.7,
    "dividend": 1.5, "dividends": 1.5, "buyback": 1.8,
    "expansion": 1.5, "expanding": 1.5, "expands": 1.5,
    "upside": 1.6, "upbeat": 1.7, "lucrative": 1.8,
    "accretive": 1.8, "opportunity": 1.2, "success": 1.5,
    "partnership": 1.4, "deal": 1.3, "inflow": 1.5, "inflows": 1.5,
}

FINANCIAL_NEGATIVE_LEXICON = {
    # Strong negative (-2.0 to -3.0)
    "plunge": -2.5, "plunges": -2.5, "plunged": -2.5, "plunging": -2.5,
    "crash": -3.0, "crashes": -3.0, "crashed": -3.0, "crashing": -3.0,
    "slump": -2.4, "slumps": -2.4, "slumped": -2.4, "slumping": -2.4,
    "tumble": -2.2, "tumbles": -2.2, "tumbled": -2.2, "tumbling": -2.2,
    "collapse": -3.0, "collapses": -3.0, "collapsed": -3.0,
    "downgrade": -2.5, "downgrades": -2.5, "downgraded": -2.5,
    "default": -3.0, "defaults": -3.0, "defaulted": -3.0,
    "fraud": -3.5, "scam": -3.5, "probe": -2.2, "probes": -2.2,
    "lawsuit": -2.0, "penalty": -2.2, "fined": -2.0,
    "bearish": -2.2, "bear": -1.5, "bears": -1.5,
    "selloff": -2.3, "sell-off": -2.3, "bloodbath": -3.0,

    # Moderate negative (-1.0 to -1.9)
    "loss": -1.8, "losses": -1.8, "losing": -1.5,
    "drop": -1.5, "drops": -1.5, "dropped": -1.5, "dropping": -1.5,
    "fall": -1.4, "falls": -1.4, "fell": -1.4, "falling": -1.4,
    "decline": -1.5, "declines": -1.5, "declined": -1.5, "declining": -1.5,
    "miss": -1.7, "misses": -1.7, "missed": -1.7,
    "headwind": -1.6, "headwinds": -1.6,
    "debt": -1.3, "deficit": -1.6, "inflation": -1.4,
    "recession": -2.0, "weak": -1.5, "weakness": -1.5,
    "bleak": -1.8, "subdued": -1.3, "lagging": -1.4,
    "outflow": -1.5, "outflows": -1.5, "underperform": -2.0,
    "pressure": -1.3, "risk": -1.2, "risks": -1.2,
}

NEGATION_TOKENS = {
    "not", "never", "no", "neither", "hardly", "scarcely",
    "failed", "fails", "failing", "prevented", "unable", "without"
}

INTENSIFIERS = {
    "sharply": 1.5, "massively": 1.6, "steeply": 1.5,
    "strongly": 1.4, "substantially": 1.3, "record": 1.5,
    "huge": 1.4, "significant": 1.3, "dramatic": 1.4,
}

# ── Financial Catalysts / Topic Detectors ──────────────────────────────────────
FINANCIAL_TOPIC_RULES = {
    "Earnings & Results": [
        r"\b(q[1-4]|quarter|quarterly|earnings|net profit|revenue|ebitda|topline|bottomline|pat|financial results)\b"
    ],
    "M&A & Expansion": [
        r"\b(acquisition|acquires|acquired|merger|takeover|deal|capex|expansion|joint venture|jv|partnership)\b"
    ],
    "Dividends & Buybacks": [
        r"\b(dividend|bonus issue|buyback|capital return|payout|interim dividend)\b"
    ],
    "Regulatory & Legal": [
        r"\b(sebi|rbi|sec|probe|investigation|penalty|fine|audit|court|order|ruling|tribunal|compliance)\b"
    ],
    "IPO & Fundraise": [
        r"\b(ipo|listing|listed|fundraise|qip|rights issue|anchor investors|valuation)\b"
    ],
    "Analyst Ratings": [
        r"\b(target price|brokerage|upgrade|downgrade|reiterate|buy rating|overweight|underweight|neutral rating)\b"
    ],
    "Macro & Policy": [
        r"\b(inflation|interest rate|repo rate|monetary policy|crude oil|rupee|gdp|fiscal)\b"
    ],
}


class FinancialSentimentAnalyzer:
    """
    Domain-specific financial text sentiment classifier.
    Combines Loughran-McDonald financial dictionary scoring,
    negation handling, intensifier parsing, and catalyst detection.
    """

    def __init__(self):
        self._compiled_topics = {
            topic: [re.compile(p, re.IGNORECASE) for p in patterns]
            for topic, patterns in FINANCIAL_TOPIC_RULES.items()
        }

    def detect_signals(self, text: str) -> list[str]:
        """Identify key financial themes/catalysts present in the headline."""
        detected = []
        for topic, compiled_patterns in self._compiled_topics.items():
            if any(p.search(text) for p in compiled_patterns):
                detected.append(topic)
        return detected

    def analyze_headline(self, text: str) -> dict[str, Any]:
        """
        Analyze a single headline or summary.
        Returns:
            - sentiment_label: "Positive" | "Neutral" | "Negative"
            - sentiment_score: float in [-1.0, +1.0]
            - probabilities: {"Positive": p, "Neutral": p, "Negative": p}
            - signals: list of detected financial topics
        """
        if not text or not text.strip():
            return {
                "sentiment_label": "Neutral",
                "sentiment_score": 0.0,
                "probabilities": {"Positive": 0.15, "Neutral": 0.70, "Negative": 0.15},
                "signals": [],
            }

        cleaned = text.lower()
        words = re.findall(r"[a-z0-9\-]+", cleaned)

        # Multi-word phrase check first
        phrase_pos_score = 0.0
        phrase_neg_score = 0.0
        for phrase, score in FINANCIAL_POSITIVE_LEXICON.items():
            if " " in phrase and phrase in cleaned:
                phrase_pos_score += score
        for phrase, score in FINANCIAL_NEGATIVE_LEXICON.items():
            if " " in phrase and phrase in cleaned:
                phrase_neg_score += score

        pos_score = phrase_pos_score
        neg_score = phrase_neg_score
        is_negated = False
        intensity = 1.0

        for i, word in enumerate(words):
            # Check negation window (previous 3 words)
            prev_window = words[max(0, i - 3):i]
            is_negated = any(w in NEGATION_TOKENS for w in prev_window)

            # Check intensifiers (previous 1-2 words)
            intensity = 1.0
            for w in words[max(0, i - 2):i]:
                if w in INTENSIFIERS:
                    intensity *= INTENSIFIERS[w]

            # Score matching
            if word in FINANCIAL_POSITIVE_LEXICON:
                val = FINANCIAL_POSITIVE_LEXICON[word] * intensity
                if is_negated:
                    neg_score += abs(val) * 0.8
                else:
                    pos_score += val
            elif word in FINANCIAL_NEGATIVE_LEXICON:
                val = FINANCIAL_NEGATIVE_LEXICON[word] * intensity
                if is_negated:
                    pos_score += abs(val) * 0.8
                else:
                    neg_score += abs(val)

        raw_diff = pos_score - neg_score
        # Compute normalized compound score in [-1.0, 1.0] using hyperbolic tangent
        compound = math.tanh(raw_diff / 3.0)
        compound = round(float(np_clip(compound, -1.0, 1.0)), 4)

        # Softmax probability distribution
        # Components: pos_score, neutral baseline (1.2), neg_score
        tau = 2.0
        z_pos = pos_score / tau
        z_neg = neg_score / tau
        z_neu = 1.2  # baseline neutral mass
        exp_sum = math.exp(z_pos) + math.exp(z_neu) + math.exp(z_neg)

        p_pos = round(math.exp(z_pos) / exp_sum, 4)
        p_neu = round(math.exp(z_neu) / exp_sum, 4)
        p_neg = round(math.exp(z_neg) / exp_sum, 4)

        # Classification label based on compound score
        if compound >= 0.15:
            label = "Positive"
        elif compound <= -0.15:
            label = "Negative"
        else:
            label = "Neutral"

        signals = self.detect_signals(text)

        return {
            "sentiment_label": label,
            "sentiment_score": compound,
            "probabilities": {
                "Positive": p_pos,
                "Neutral": p_neu,
                "Negative": p_neg,
            },
            "signals": signals,
        }


def np_clip(val: float, min_val: float, max_val: float) -> float:
    """Helper clip function."""
    return max(min_val, min(max_val, val))


# Global singleton analyzer instance
_analyzer = FinancialSentimentAnalyzer()


def analyze_text(text: str) -> dict[str, Any]:
    """Public helper function for text sentiment analysis."""
    return _analyzer.analyze_headline(text)
