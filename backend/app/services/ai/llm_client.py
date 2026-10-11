# ============================================================
# RiskLens — Multi-Provider LLM Orchestrator
# Primary: Google Gemini (gemini-3.8-flash)
# Fallback: Groq (qwen/qwen3.8-27b)
# Safety Net: Deterministic Institutional Rule Engine
# ============================================================

import logging
from typing import Any, Optional
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.8-flash"
GEMINI_URL_TEMPLATE = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
GROQ_MODEL = "qwen/qwen3.8-27b"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def _call_gemini(prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 600) -> Optional[str]:
    """Call Google Gemini API."""
    key = settings.GEMINI_API_KEY or ""
    if not key:
        return None

    url = f"{GEMINI_URL_TEMPLATE}?key={key}"
    full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": max_tokens,
        },
    }

    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        return parts[0]["text"].strip()
            else:
                logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text[:150]}")
    except Exception as exc:
        logger.warning(f"Gemini API invocation error ({exc})")

    return None


def _call_groq(prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 600) -> Optional[str]:
    """Call Groq API as high-speed fallback."""
    key = settings.GROQ_API_KEY or ""
    if not key:
        return None

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max_tokens,
    }

    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.post(GROQ_URL, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
            else:
                logger.warning(f"Groq API returned status {resp.status_code}: {resp.text[:150]}")
    except Exception as exc:
        logger.warning(f"Groq API fallback error ({exc})")

    return None


def ask_llm(prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 600) -> str:
    """
    Query LLM with automatic failover:
    Gemini (Primary) -> Groq (Fallback) -> None.
    """
    # 1. Try Gemini
    ans = _call_gemini(prompt, system_prompt, max_tokens=max_tokens)
    if ans:
        return ans

    # 2. Try Groq fallback
    logger.info("Failing over from Gemini to Groq...")
    ans = _call_groq(prompt, system_prompt, max_tokens=max_tokens)
    if ans:
        return ans

    return ""


# ── Domain-Specific AI Synthesis Functions ─────────────────────────────────────

def generate_risk_executive_briefing(risk_class: str, metrics: dict[str, Any], symbols: list[str]) -> str:
    """Generate an institutional risk commentary for the dashboard."""
    system_prompt = (
        "You are an institutional Chief Risk Officer (CRO) at a Tier-1 quantitative hedge fund. "
        "Provide a crisp 2-3 sentence executive summary explaining what is driving the portfolio's risk profile."
    )
    prompt = (
        f"Portfolio Holdings: {', '.join(symbols)}\n"
        f"Assigned Risk Tier: {risk_class}\n"
        f"Annualized Volatility: {metrics.get('annualized_volatility', 0):.2%}\n"
        f"Max Drawdown: {metrics.get('max_drawdown', 0):.2%}\n"
        f"CVaR 95%: {metrics.get('cvar_95', 0):.2%}\n"
        f"Sharpe Ratio: {metrics.get('sharpe_ratio', 0):.2f}\n"
        f"Explain key vulnerabilities and risk mitigating factors succinctly."
    )
    res = ask_llm(prompt, system_prompt, max_tokens=250)
    if res:
        return res

    # Deterministic safety fallback
    return (
        f"The portfolio is currently categorized under {risk_class} risk with annualized volatility of "
        f"{metrics.get('annualized_volatility', 0):.1%} and max historical drawdown of {metrics.get('max_drawdown', 0):.1%}. "
        f"Tail risk concentration is monitored under 95% CVaR threshold of {metrics.get('cvar_95', 0):.1%}."
    )


def generate_stress_scenario_briefing(scenario_name: str, impact_pct: float, stressed_vol: float, holdings: list[str]) -> str:
    """Generate a crisis stress briefing for the Stress Lab."""
    system_prompt = (
        "You are a quantitative macro strategist. In 2 concise sentences, provide an executive commentary "
        "on the portfolio's simulated stress resilience and tail loss vulnerability under this crisis."
    )
    prompt = (
        f"Scenario: {scenario_name}\n"
        f"Estimated Portfolio Impact: {impact_pct:.2f}%\n"
        f"Stressed Annualized Volatility: {stressed_vol:.2%}\n"
        f"Assets Affected: {', '.join(holdings)}\n"
        f"Provide a crisp tactical briefing."
    )
    res = ask_llm(prompt, system_prompt, max_tokens=200)
    if res:
        return res

    return (
        f"Under the {scenario_name} regime, the portfolio experiences an estimated {impact_pct:.1f}% drawdown, "
        f"with annualized volatility expanding to {stressed_vol:.1%}. Holdings with high beta and sector cyclicality drive majority of tail exposure."
    )


def generate_market_intelligence_pulse(sentiment_label: str, sentiment_score: float, signals: list[str], symbols: list[str]) -> str:
    """Generate market intelligence pulse commentary from sentiment and news catalysts."""
    system_prompt = (
        "You are a financial market analyst. In 2 sentences, provide a qualitative market sentiment pulse "
        "highlighting key catalyst trends."
    )
    prompt = (
        f"Holdings: {', '.join(symbols)}\n"
        f"Overall Sentiment Tone: {sentiment_label} (Score: {sentiment_score:+.2f})\n"
        f"Active Catalysts: {', '.join(signals) if signals else 'General Corporate News'}\n"
        f"State the qualitative sentiment tone."
    )
    res = ask_llm(prompt, system_prompt, max_tokens=200)
    if res:
        return res

    return (
        f"Portfolio news sentiment registers as {sentiment_label} ({sentiment_score:+.2f}), "
        f"driven by active corporate headlines across {', '.join(signals[:3]) if signals else 'earnings and operational updates'}."
    )
