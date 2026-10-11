# ============================================================
# RiskLens — Historical Backtesting & Stress Lab API Routes
# Phase 10 & Phase 11
# POST /api/backtests
# POST /api/scenarios
# ============================================================

import logging
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.schemas.backtesting import (
    BacktestRequest,
    BacktestResponse,
    BacktestMetrics,
    BacktestSeriesPoint,
    StrategyBacktestSummary,
    ScenarioRequest,
    ScenarioResponse,
    AssetShockImpact,
)
from app.services.market_data.yfinance_client import get_prices, validate_tickers
from app.services.market_data.benchmark import align_benchmark_to_portfolio
from app.services.finance.backtester import (
    run_multi_strategy_backtest,
    run_scenario_stress_test,
)
from app.utils.validators import validate_date_range, validate_weights, validate_min_history
from app.utils.helpers import align_price_series

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/backtests",
    response_model=BacktestResponse,
    summary="Simulate multi-strategy performance over historical windows with rebalancing & transaction costs",
    tags=["Backtesting"],
)
async def run_backtest_endpoint(payload: BacktestRequest):
    """
    Historical Backtesting Engine (Phase 10 & Blueprint §5.5):
    - Evaluates portfolio trajectories across custom date periods.
    - Models natural drift and periodic rebalancing (Buy & Hold, Monthly, Quarterly, Annual).
    - Deducts proportional transaction cost fees on portfolio turnover.
    - Produces comparative metrics for 4 strategies (Original, Recommended, Equal-Weight, Benchmark).
    - Generates date-by-date cumulative wealth and drawdown series for visual charts.
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

    # Run multi-strategy simulation
    backtest_result = run_multi_strategy_backtest(
        returns_df=aligned_returns,
        current_weights=payload.weights,
        benchmark_returns=aligned_bm,
        initial_capital=payload.initial_capital,
        rebalance_freq=payload.rebalance_freq,
        tx_cost_pct=payload.tx_cost_pct,
        risk_free_rate=payload.risk_free_rate,
    )

    strategies_models = {
        key: StrategyBacktestSummary(
            name=val["name"],
            description=val["description"],
            weights=val["weights"],
            metrics=BacktestMetrics(**val["metrics"]),
        )
        for key, val in backtest_result["strategies"].items()
    }

    series_models = [
        BacktestSeriesPoint(**p) for p in backtest_result["series"]
    ]

    return BacktestResponse(
        start_date=backtest_result["start_date"],
        end_date=backtest_result["end_date"],
        trading_days=backtest_result["trading_days"],
        initial_capital=backtest_result["initial_capital"],
        rebalance_freq=backtest_result["rebalance_freq"],
        tx_cost_pct=backtest_result["tx_cost_pct"],
        strategies=strategies_models,
        series=series_models,
        data_source="yfinance",
        warnings=warnings,
    )


@router.post(
    "/scenarios",
    response_model=ScenarioResponse,
    summary="Simulate portfolio and holding stress impacts under custom market shocks or crisis replays",
    tags=["Stress Lab"],
)
async def run_scenario_endpoint(payload: ScenarioRequest):
    """
    Stress Lab (Phase 11 & Blueprint §5.6):
    - Tests custom market-wide, sector-specific, and asset-specific price shocks.
    - Replays historical crisis periods (2020 COVID shock, bear markets, tech crashes, banking crisis).
    - Calculates asset-by-asset dollar and percentage value changes.
    - Estimates stressed volatility and stressed tail risk (VaR & CVaR).
    - Discloses all outcomes as 'Hypothetical Estimates'.
    """
    valid_symbols, invalid = validate_tickers(payload.symbols)
    if invalid:
        raise HTTPException(status_code=422, detail=f"Invalid ticker format: {invalid}")

    validate_weights(payload.weights)

    try:
        market = get_prices(symbols=payload.symbols)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    returns_df = market["returns"]
    warnings = list(market["warnings"])
    as_of = market["as_of"]

    validate_min_history(len(returns_df), min_days=252, symbol="Portfolio")

    # Fetch benchmark for beta calculations
    try:
        bm_returns = align_benchmark_to_portfolio(portfolio_returns=returns_df)
        aligned_returns, aligned_bm = align_price_series(returns_df, bm_returns)
    except Exception as exc:
        aligned_returns = returns_df
        aligned_bm = None
        warnings.append(f"Benchmark alignment unavailable: {exc}")

    # Convert params to dict if present
    params_dict = None
    if payload.params:
        params_dict = {
            "market_shock": payload.params.market_shock,
            "sector_shocks": payload.params.sector_shocks,
            "asset_shocks": payload.params.asset_shocks,
            "vol_multiplier": payload.params.vol_multiplier,
        }

    scenario_res = run_scenario_stress_test(
        returns_df=aligned_returns,
        weights=payload.weights,
        capital=payload.capital,
        scenario_id=payload.scenario_id,
        params=params_dict,
        benchmark_returns=aligned_bm,
    )

    asset_impact_models = [
        AssetShockImpact(**item) for item in scenario_res["asset_impacts"]
    ]

    return ScenarioResponse(
        scenario_id=scenario_res["scenario_id"],
        scenario_name=scenario_res["scenario_name"],
        description=scenario_res["description"],
        is_hypothetical=scenario_res["is_hypothetical"],
        pre_shock_value=scenario_res["pre_shock_value"],
        post_shock_value=scenario_res["post_shock_value"],
        portfolio_impact_pct=scenario_res["portfolio_impact_pct"],
        benchmark_impact_pct=scenario_res["benchmark_impact_pct"],
        stressed_volatility=scenario_res["stressed_volatility"],
        stressed_var_95=scenario_res["stressed_var_95"],
        stressed_cvar_95=scenario_res["stressed_cvar_95"],
        asset_impacts=asset_impact_models,
        disclaimer=scenario_res["disclaimer"],
        data_as_of=as_of,
        warnings=warnings,
    )
