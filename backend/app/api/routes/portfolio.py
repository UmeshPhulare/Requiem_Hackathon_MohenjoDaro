# ============================================================
# RiskLens — Portfolio API Routes (Connected to MongoDB)
# ============================================================

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from app.api.deps import get_current_user
from app.schemas.portfolio import PortfolioCreateOrUpdate, HoldingSchema
from app.db.repositories.portfolio_repo import (
    get_portfolio_by_user_id,
    save_or_update_portfolio,
    add_holding,
    remove_holding,
    create_initial_portfolio,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("")
async def get_my_portfolio(current_user: dict = Depends(get_current_user)):
    """Fetch the authenticated user's portfolio from MongoDB Atlas."""
    portfolio = await get_portfolio_by_user_id(current_user["id"])
    if not portfolio:
        portfolio = await create_initial_portfolio(
            user_id=current_user["id"],
            name=f"{current_user['name']}'s Portfolio",
            holdings=[]
        )
    return portfolio


@router.put("")
async def update_my_portfolio(
    payload: PortfolioCreateOrUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Save or update the authenticated user's full portfolio in MongoDB."""
    updated = await save_or_update_portfolio(
        user_id=current_user["id"],
        portfolio_data=payload.model_dump()
    )
    return updated


@router.post("/holdings")
async def add_portfolio_holding(
    holding: HoldingSchema,
    current_user: dict = Depends(get_current_user)
):
    """Add a new position to the authenticated user's portfolio."""
    updated = await add_holding(
        user_id=current_user["id"],
        holding=holding.model_dump()
    )
    return updated


@router.delete("/holdings/{holding_id}")
async def delete_portfolio_holding(
    holding_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a position from the authenticated user's portfolio."""
    updated = await remove_holding(
        user_id=current_user["id"],
        holding_id=holding_id
    )
    return updated


@router.post("/seed-sample")
async def seed_starter_sample(current_user: dict = Depends(get_current_user)):
    """Seed sample institutional portfolio holdings for the user if requested."""
    sample_holdings = [
        {
            "id": "h-rel",
            "symbol": "RELIANCE",
            "name": "Reliance Industries Ltd.",
            "sector": "Energy & Petrochemicals",
            "type": "Equity",
            "quantity": 80,
            "avgBuyPrice": 2640.0,
            "currentPrice": 2945.8,
            "exchange": "NSE"
        },
        {
            "id": "h-hdfc",
            "symbol": "HDFCBANK",
            "name": "HDFC Bank Ltd.",
            "sector": "Banking & Finance",
            "type": "Equity",
            "quantity": 120,
            "avgBuyPrice": 1580.0,
            "currentPrice": 1748.55,
            "exchange": "NSE"
        },
        {
            "id": "h-infy",
            "symbol": "INFY",
            "name": "Infosys Ltd.",
            "sector": "Information Technology",
            "type": "Equity",
            "quantity": 90,
            "avgBuyPrice": 1710.0,
            "currentPrice": 1924.4,
            "exchange": "NSE"
        },
        {
            "id": "h-tcs",
            "symbol": "TCS",
            "name": "Tata Consultancy Services Ltd.",
            "sector": "Information Technology",
            "type": "Equity",
            "quantity": 40,
            "avgBuyPrice": 3860.0,
            "currentPrice": 4218.6,
            "exchange": "NSE"
        },
    ]

    updated = await save_or_update_portfolio(
        user_id=current_user["id"],
        portfolio_data={
            "name": f"{current_user['name']}'s Growth Portfolio",
            "holdings": sample_holdings
        }
    )
    return updated
