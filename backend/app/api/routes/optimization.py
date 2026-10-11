# ============================================================
# RiskLens — Allocation Optimization & Comparison API Routes
# Phase 4 & Phase 9
# POST /api/portfolio/optimize
# POST /api/analysis/compare
# ============================================================

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.schemas.optimization import (
    OptimizationRequest,
    OptimizationResponse,
    CompareRequest,
    CompareResponse,
    AssetPerformanceItem,
    StrategyDetail,
    StrategyMetrics,
    WeightExplanation,
    EfficientFrontierPoint,
    TradeOffsSummary,
)
from app.services.market_data.yfinance_client import get_prices, validate_tickers, SUPPORTED_TICKERS
from app.services.market_data.benchmark import align_benchmark_to_portfolio
from app.services.finance.portfolio_optimizer import (
    optimize_portfolio,
    build_four_strategies_comparison,
    generate_why_this_weight_explanations,
    generate_trade_offs_summary,
    generate_efficient_frontier_samples,
)
from app.services.finance.risk_metrics import (
    annualized_return,
    annualized_volatility,
    sharpe_ratio,
    max_drawdown,
    beta,
    correlation_matrix,
)
from app.utils.validators import validate_date_range, validate_weights, validate_min_history
from app.utils.helpers import align_price_series

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/optimize",
    response_model=OptimizationResponse,
    summary="Compute risk-aware optimized allocation with 4-strategy comparison & explanations",
    tags=["Optimization"],
)
async def optimize_portfolio_endpoint(payload: OptimizationRequest):

    """
    Allocation Lab (Phase 9 & Blueprint §9):
    1. Validates inputs & weights.
    2. Fetches adjusted prices & aligns trading dates with benchmark (^NSEI).
    3. Solves CVaR-driven optimization subject to long-only and maximum single-asset caps.
    4. Generates side-by-side comparison across 4 strategies (Current, Equal-Weight, Recommended, Benchmark).
    5. Produces 'Why This Weight?' explainable reasoning for every holding.
    6. Generates risk-return trade-offs summary and Efficient Frontier simulation scatter points.
    """
    # ── 1. Validate inputs ───────────────────────────────────────────────────
    valid_symbols, invalid = validate_tickers(payload.symbols)
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid ticker format: {invalid}")

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

    returns_df = market["returns"]
    warnings = list(market["warnings"])
    as_of = market["as_of"]

    # History length validation
    validate_min_history(len(returns_df), min_days=252, symbol="Portfolio")

    # ── 3. Align benchmark ───────────────────────────────────────────────────
    try:
        bm_returns = align_benchmark_to_portfolio(
            portfolio_returns=returns_df,
            start=payload.start_date,
            end=payload.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"Benchmark fetch failed: {exc}")

    aligned_returns, aligned_bm = align_price_series(returns_df, bm_returns)

    # ── 4. Optimize allocation ───────────────────────────────────────────────
    opt_weights = optimize_portfolio(
        returns_df=aligned_returns,
        risk_preference=payload.risk_preference,
        max_asset_weight=payload.max_asset_weight,
        risk_free_rate=payload.risk_free_rate,
    )

    # ── 5. Generate 4-strategy comparison ────────────────────────────────────
    strategies_dict = build_four_strategies_comparison(
        returns_df=aligned_returns,
        current_weights=payload.weights,
        recommended_weights=opt_weights,
        benchmark_returns=aligned_bm,
        capital=payload.capital,
        risk_free_rate=payload.risk_free_rate,
    )

    # ── 6. Why This Weight explanations ──────────────────────────────────────
    explanations_list = generate_why_this_weight_explanations(
        current_weights=payload.weights,
        recommended_weights=opt_weights,
        returns_df=aligned_returns,
        capital=payload.capital,
        max_asset_weight=payload.max_asset_weight,
        risk_free_rate=payload.risk_free_rate,
    )

    # ── 7. Trade-offs summary & Efficient Frontier ───────────────────────────
    trade_offs = generate_trade_offs_summary(
        current_metrics=strategies_dict["current"]["metrics"],
        opt_metrics=strategies_dict["optimized"]["metrics"],
    )

    frontier_pts = generate_efficient_frontier_samples(
        returns_df=aligned_returns,
        count=80,
        risk_free_rate=payload.risk_free_rate,
    )

    strategies_models = {
        key: StrategyDetail(**val) for key, val in strategies_dict.items()
    }

    return OptimizationResponse(
        objective=f"CVaR Risk-Aware Optimization ({payload.risk_preference})",
        risk_preference=payload.risk_preference,
        capital=payload.capital,
        strategies=strategies_models,
        weight_explanations=[WeightExplanation(**e) for e in explanations_list],
        trade_offs_summary=TradeOffsSummary(**trade_offs),
        efficient_frontier=[EfficientFrontierPoint(**p) for p in frontier_pts],
        data_source="yfinance",
        data_as_of=as_of,
        warnings=warnings,
    )


@router.post(
    "/compare",
    response_model=CompareResponse,
    summary="Side-by-side multi-asset and multi-strategy comparative evaluation",
    tags=["Analysis"],
)
async def compare_assets_endpoint(payload: CompareRequest):
    """
    Asset & Strategy Comparison (Phase 4 & Blueprint §5.3):
    - Individual asset metrics: CAGR, Volatility, Sharpe, Drawdown, Beta against benchmark.
    - Pairwise correlation matrix.
    - 4-strategy side-by-side comparison (Current, Equal-Weight, Optimized, Benchmark).
    """
    valid_symbols, invalid = validate_tickers(payload.symbols)
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid ticker format: {invalid}")

    validate_weights(payload.weights)

    if payload.start_date and payload.end_date:
        validate_date_range(payload.start_date, payload.end_date)

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

    returns_df = market["returns"]
    warnings = list(market["warnings"])
    as_of = market["as_of"]

    validate_min_history(len(returns_df), min_days=252, symbol="Portfolio")

    try:
        bm_returns = align_benchmark_to_portfolio(
            portfolio_returns=returns_df,
            start=payload.start_date,
            end=payload.end_date,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"Benchmark fetch failed: {exc}")

    aligned_returns, aligned_bm = align_price_series(returns_df, bm_returns)

    # Per-asset performance items
    assets_list: list[AssetPerformanceItem] = []
    for sym in payload.symbols:
        s_ret = aligned_returns[sym]
        name = SUPPORTED_TICKERS.get(sym, sym)
        w = payload.weights.get(sym, 0.0)

        assets_list.append(AssetPerformanceItem(
            symbol=sym,
            name=name,
            weight=round(w, 4),
            annualized_return=round(annualized_return(s_ret), 4),
            annualized_volatility=round(annualized_volatility(s_ret), 4),
            sharpe_ratio=round(sharpe_ratio(s_ret, risk_free_rate=payload.risk_free_rate), 4),
            max_drawdown=round(max_drawdown(s_ret), 4),
            beta=round(beta(s_ret, aligned_bm), 4),
        ))

    # Pairwise correlation
    corr_mat = correlation_matrix(aligned_returns)

    # Optimize and build 4 strategies
    opt_weights = optimize_portfolio(
        returns_df=aligned_returns,
        risk_preference="Moderate",
        max_asset_weight=0.40,
        risk_free_rate=payload.risk_free_rate,
    )

    strategies_dict = build_four_strategies_comparison(
        returns_df=aligned_returns,
        current_weights=payload.weights,
        recommended_weights=opt_weights,
        benchmark_returns=aligned_bm,
        capital=100000.0,
        risk_free_rate=payload.risk_free_rate,
    )

    strategies_models = {
        key: StrategyDetail(**val) for key, val in strategies_dict.items()
    }

    return CompareResponse(
        assets=assets_list,
        correlation_matrix=corr_mat,
        strategies=strategies_models,
        data_as_of=as_of,
        warnings=warnings,
    )
