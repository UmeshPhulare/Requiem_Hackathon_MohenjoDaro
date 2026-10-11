# ============================================================
# RiskLens — Risk Analysis API Route (Phase 1 + ML)
# POST /api/analysis/risk
# ============================================================

import logging
from datetime import date

from fastapi import APIRouter, HTTPException

from app.schemas.risk import (
    RiskAnalysisRequest,
    RiskAnalysisResponse,
    HistoricalMetrics,
    FeatureExplanation,
)
from app.services.market_data.yfinance_client import get_prices, validate_tickers
from app.services.market_data.benchmark import align_benchmark_to_portfolio
from app.services.ml.feature_engineering import engineer_features, _annualized_volatility, _cumulative_return
from app.services.ml.risk_predictor import predict_risk
from app.utils.validators import validate_date_range, validate_weights, validate_min_history

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/risk",
    response_model=RiskAnalysisResponse,
    summary="Analyse portfolio risk using ML + quantitative engine",
    tags=["Analysis"],
)
async def analyse_risk(payload: RiskAnalysisRequest):
    """
    Full risk analysis pipeline:
    1. Validate tickers and weights.
    2. Fetch historical prices via yfinance.
    3. Align benchmark (NIFTY 50).
    4. Compute 20 quantitative features.
    5. Run ML risk classification (Random Forest).
    6. Return risk class, probabilities, historical metrics, SHAP explanations.

    **Supported tickers:** 12 Indian NSE blue-chips (see /api/market/assets).
    """
    # ── 1. Validate inputs ───────────────────────────────────────────────────
    _, invalid = validate_tickers(payload.symbols)
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported ticker(s): {invalid}. Use GET /api/market/assets to see the supported list.",
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

    # ── 5. Feature engineering ───────────────────────────────────────────────
    try:
        features = engineer_features(
            historical_returns=returns_df,
            weights=payload.weights,
            benchmark_returns=bm_returns,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # ── 6. ML inference ──────────────────────────────────────────────────────
    try:
        prediction = predict_risk(features)
    except Exception as exc:
        logger.exception("ML inference failed")
        raise HTTPException(
            status_code=500,
            detail=f"Risk prediction failed: {exc}",
        )

    # ── 7. Build historical metrics for display ──────────────────────────────
    from app.services.ml.feature_engineering import (
        _portfolio_returns,
        _max_drawdown,
        _var_95,
        _cvar_95,
        _beta,
        _downside_deviation,
        _sharpe_ratio,
    )

    port = _portfolio_returns(returns_df, payload.weights)
    hist = HistoricalMetrics(
        annualized_return=round(_cumulative_return(port.iloc[-252:]), 6),
        annualized_volatility=round(features["volatility_252d"], 6),
        max_drawdown=round(features["max_drawdown"], 6),
        sharpe_ratio=round(features["sharpe_ratio"], 6),
        var_95=round(features["var_95"], 6),
        cvar_95=round(features["cvar_95"], 6),
        beta=round(features["beta"], 6),
        downside_deviation=round(features["downside_deviation"], 6),
    )

    # ── 8. Build response ────────────────────────────────────────────────────
    explanations = [
        FeatureExplanation(**e) for e in prediction["explanations"]
    ]

    return RiskAnalysisResponse(
        risk_class=prediction["risk_class"],
        class_id=prediction["class_id"],
        probabilities=prediction["probabilities"],
        model_version=prediction["model_version"],
        historical_metrics=hist,
        features_used=prediction["features_used"],
        explanations=explanations,
        data_source="yfinance",
        data_as_of=as_of,
        data_status=status,
        warnings=warnings,
    )
