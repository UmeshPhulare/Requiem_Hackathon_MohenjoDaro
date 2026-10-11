# ============================================================
# RiskLens — Risk Analysis API Route (Phase 1 & 2)
# POST /api/analysis/quant (Quantitative Risk Engine)
# POST /api/analysis/risk  (Unified ML + Quantitative Engine)
# ============================================================

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.schemas.risk import (
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    QuantAnalysisResponse,
    QuantitativeMetrics,
    AssetRiskContribution,
    DrawdownPoint,
    FeatureExplanation,
)
from app.services.market_data.yfinance_client import get_prices, validate_tickers
from app.services.market_data.benchmark import align_benchmark_to_portfolio
from app.services.finance.risk_metrics import (
    compute_portfolio_metrics,
    portfolio_returns_series,
    drawdown_series,
)
from app.services.ml.feature_engineering import engineer_features
from app.services.ml.risk_predictor import predict_risk
from app.utils.validators import validate_date_range, validate_weights, validate_min_history
from app.utils.helpers import align_price_series

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/quant",
    response_model=QuantAnalysisResponse,
    summary="Compute pure quantitative risk metrics, risk attribution, and drawdown series",
    tags=["Analysis"],
)
async def analyse_quant(payload: RiskAnalysisRequest):
    """
    Pure server-side Quantitative Risk Engine (Phase 2):
    - 13 mathematical risk/return metrics (CAGR, Volatility, Sharpe, Sortino, Max Drawdown, VaR 95/99, CVaR 95/99, Beta, Alpha, HHI).
    - Euler Risk Decomposition (% risk contribution per asset).
    - Pairwise correlation matrix.
    - Historical peak-to-trough drawdown time series for interactive charts.
    """
    # ── 1. Validate inputs ───────────────────────────────────────────────────
    valid_symbols, invalid = validate_tickers(payload.symbols)
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid ticker symbol format: {invalid}",
        )

    validate_weights(payload.weights)

    if payload.start_date and payload.end_date:
        validate_date_range(payload.start_date, payload.end_date)

    # ── 2. Fetch market prices ───────────────────────────────────────────────
    try:
        market = get_prices(
            symbols=payload.symbols,
            start=payload.start_date,
            end=payload.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    prices_df  = market["prices"]
    returns_df = market["returns"]
    warnings   = list(market["warnings"])
    as_of      = market["as_of"]
    status     = market["status"]

    # ── 3. History length check ──────────────────────────────────────────────
    n_rows = len(returns_df)
    validate_min_history(n_rows, min_days=252, symbol="Portfolio")

    # ── 4. Align benchmark ───────────────────────────────────────────────────
    try:
        bm_returns = align_benchmark_to_portfolio(
            portfolio_returns=returns_df,
            start=payload.start_date,
            end=payload.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"Benchmark data fetch failed: {exc}")

    # Synchronize dates strictly
    aligned_returns, aligned_bm = align_price_series(returns_df, bm_returns)

    # ── 5. Run Quantitative Engine ───────────────────────────────────────────
    quant_dict = compute_portfolio_metrics(
        asset_returns=aligned_returns,
        weights=payload.weights,
        benchmark_returns=aligned_bm,
        risk_free_rate=payload.risk_free_rate,
    )

    port_ret = portfolio_returns_series(aligned_returns, payload.weights)
    dd_curve = drawdown_series(port_ret)

    drawdown_points = [
        DrawdownPoint(date=idx.date().isoformat(), drawdown=round(float(val), 4))
        for idx, val in dd_curve.items()
    ]

    metrics = QuantitativeMetrics(
        annualized_return=quant_dict["annualized_return"],
        annualized_volatility=quant_dict["annualized_volatility"],
        sharpe_ratio=quant_dict["sharpe_ratio"],
        sortino_ratio=quant_dict["sortino_ratio"],
        max_drawdown=quant_dict["max_drawdown"],
        downside_deviation=quant_dict["downside_deviation"],
        var_95=quant_dict["var_95"],
        var_99=quant_dict["var_99"],
        cvar_95=quant_dict["cvar_95"],
        cvar_99=quant_dict["cvar_99"],
        beta=quant_dict["beta"],
        alpha=quant_dict["alpha"],
        hhi_concentration=quant_dict["hhi_concentration"],
    )

    risk_contribs = [
        AssetRiskContribution(**rc) for rc in quant_dict["risk_contributions"]
    ]

    return QuantAnalysisResponse(
        metrics=metrics,
        risk_contributions=risk_contribs,
        correlation_matrix=quant_dict["correlation_matrix"],
        drawdown_series=drawdown_points,
        data_source="yfinance",
        data_as_of=as_of,
        data_status=status,
        warnings=warnings,
    )


@router.post(
    "/risk",
    response_model=RiskAnalysisResponse,
    summary="Analyse portfolio risk using Unified ML + Quantitative Engine",
    tags=["Analysis"],
)
async def analyse_risk(payload: RiskAnalysisRequest):
    """
    Unified Risk Analysis Pipeline (Phases 1 & 2):
    1. Validates inputs & weights.
    2. Fetches live adjusted closing price series via yfinance.
    3. Aligns date calendars with benchmark (NIFTY 50).
    4. Computes all server-side quantitative risk metrics & Euler risk attribution.
    5. Computes ML feature vector & runs ML risk classification with SHAP explanations.
    6. Returns combined result for the RiskLens dashboard.
    """
    # ── 1. Validate inputs ───────────────────────────────────────────────────
    valid_symbols, invalid = validate_tickers(payload.symbols)
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid ticker symbol format: {invalid}",
        )

    validate_weights(payload.weights)

    if payload.start_date and payload.end_date:
        validate_date_range(payload.start_date, payload.end_date)

    # ── 2. Fetch market data ─────────────────────────────────────────────────
    try:
        market = get_prices(
            symbols=payload.symbols,
            start=payload.start_date,
            end=payload.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    prices_df  = market["prices"]
    returns_df = market["returns"]
    warnings   = list(market["warnings"])
    as_of      = market["as_of"]
    status     = market["status"]

    # ── 3. History check ─────────────────────────────────────────────────────
    n_rows = len(returns_df)
    validate_min_history(n_rows, min_days=252, symbol="Portfolio")

    # ── 4. Align benchmark ───────────────────────────────────────────────────
    try:
        bm_returns = align_benchmark_to_portfolio(
            portfolio_returns=returns_df,
            start=payload.start_date,
            end=payload.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Benchmark data fetch failed: {exc}",
        )

    aligned_returns, aligned_bm = align_price_series(returns_df, bm_returns)

    # ── 5. Run Quantitative Engine ───────────────────────────────────────────
    quant_dict = compute_portfolio_metrics(
        asset_returns=aligned_returns,
        weights=payload.weights,
        benchmark_returns=aligned_bm,
        risk_free_rate=payload.risk_free_rate,
    )

    # ── 6. ML Feature Engineering ────────────────────────────────────────────
    try:
        features = engineer_features(
            historical_returns=aligned_returns,
            weights=payload.weights,
            benchmark_returns=aligned_bm,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # ── 7. ML Inference ──────────────────────────────────────────────────────
    try:
        prediction = predict_risk(features)
    except Exception as exc:
        logger.exception("ML inference failed")
        raise HTTPException(
            status_code=500,
            detail=f"Risk prediction failed: {exc}",
        )

    # ── 8. Build structured response ─────────────────────────────────────────
    metrics = QuantitativeMetrics(
        annualized_return=quant_dict["annualized_return"],
        annualized_volatility=quant_dict["annualized_volatility"],
        sharpe_ratio=quant_dict["sharpe_ratio"],
        sortino_ratio=quant_dict["sortino_ratio"],
        max_drawdown=quant_dict["max_drawdown"],
        downside_deviation=quant_dict["downside_deviation"],
        var_95=quant_dict["var_95"],
        var_99=quant_dict["var_99"],
        cvar_95=quant_dict["cvar_95"],
        cvar_99=quant_dict["cvar_99"],
        beta=quant_dict["beta"],
        alpha=quant_dict["alpha"],
        hhi_concentration=quant_dict["hhi_concentration"],
    )

    risk_contribs = [
        AssetRiskContribution(**rc) for rc in quant_dict["risk_contributions"]
    ]

    explanations = [
        FeatureExplanation(**e) for e in prediction["explanations"]
    ]

    from app.services.ai.llm_client import generate_risk_executive_briefing
    ai_briefing = generate_risk_executive_briefing(
        risk_class=prediction["risk_class"],
        metrics=quant_dict,
        symbols=payload.symbols,
    )

    return RiskAnalysisResponse(
        risk_class=prediction["risk_class"],
        class_id=prediction["class_id"],
        probabilities=prediction["probabilities"],
        model_version=prediction["model_version"],
        historical_metrics=metrics,
        features_used=prediction["features_used"],
        risk_contributions=risk_contribs,
        correlation_matrix=quant_dict["correlation_matrix"],
        explanations=explanations,
        ai_executive_briefing=ai_briefing,
        data_source="yfinance",
        data_as_of=as_of,
        data_status=status,
        warnings=warnings,
    )
