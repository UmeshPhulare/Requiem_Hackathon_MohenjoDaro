# ============================================================
# RiskLens — Input / Output Validators (Phase 1)
# ============================================================

from datetime import date
from fastapi import HTTPException


def validate_date_range(start: date, end: date, min_days: int = 252) -> None:
    """
    Raise HTTP 422 if the date range is invalid or too short.
    """
    if end <= start:
        raise HTTPException(
            status_code=422,
            detail=f"end_date ({end}) must be after start_date ({start}).",
        )
    calendar_days = (end - start).days
    # Approximate: 252 trading days ≈ 365 calendar days
    approx_trading = int(calendar_days * 252 / 365)
    if approx_trading < min_days:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Date range ({start} → {end}) provides roughly {approx_trading} "
                f"trading days. Minimum required: {min_days}. "
                "Please extend the start date."
            ),
        )


def validate_weights(weights: dict[str, float], tolerance: float = 0.005) -> None:
    """
    Raise HTTP 422 if weights don't sum to 1.0 within tolerance.
    All weights must be non-negative.
    """
    for sym, w in weights.items():
        if w < 0:
            raise HTTPException(
                status_code=422,
                detail=f"Weight for {sym} is negative ({w}). Long-only portfolios only.",
            )
    total = sum(weights.values())
    if abs(total - 1.0) > tolerance:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Portfolio weights sum to {total:.4f}. "
                f"Must sum to 1.0 (±{tolerance}). "
                "Please adjust your allocation."
            ),
        )


def validate_min_history(n_rows: int, min_days: int = 252, symbol: str = "Portfolio") -> None:
    """
    Raise HTTP 400 if the number of available return rows is below the minimum.
    """
    if n_rows < min_days:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Available price history for {symbol} is {n_rows} trading days; "
                f"minimum {min_days} days required for reliable analysis."
            ),
        )
