# ============================================================
# RiskLens — Portfolio Repository (MongoDB Atlas)
# ============================================================

import logging
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
import uuid
from app.db.connection import get_collection, Collections

logger = logging.getLogger(__name__)


def _format_portfolio_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc_copy = dict(doc)
    doc_copy["id"] = str(doc_copy.pop("_id"))
    return doc_copy


async def get_portfolio_by_user_id(user_id: str) -> Optional[dict]:
    col = get_collection(Collections.PORTFOLIOS)
    doc = await col.find_one({"user_id": user_id})
    return _format_portfolio_doc(doc) if doc else None


async def create_initial_portfolio(
    user_id: str,
    name: str = "My Investment Portfolio",
    holdings: Optional[List[dict]] = None
) -> dict:
    col = get_collection(Collections.PORTFOLIOS)
    now = datetime.now(timezone.utc).isoformat()
    clean_holdings = []
    if holdings:
        for h in holdings:
            h_copy = dict(h)
            if not h_copy.get("id"):
                h_copy["id"] = f"h-{uuid.uuid4().hex[:8]}"
            clean_holdings.append(h_copy)

    # Compute investedAmount
    invested = sum(h.get("quantity", 0) * h.get("avgBuyPrice", 0) for h in clean_holdings)

    doc = {
        "user_id": user_id,
        "name": name,
        "currency": "INR",
        "investedAmount": round(invested, 2),
        "benchmark": "NIFTY50",
        "isDemo": False,
        "holdings": clean_holdings,
        "created_at": now,
        "lastUpdated": now,
    }
    result = await col.insert_one(doc)
    doc["_id"] = result.inserted_id
    logger.info("Initialized portfolio for user %s: %d holdings", user_id, len(clean_holdings))
    return _format_portfolio_doc(doc)


async def save_or_update_portfolio(user_id: str, portfolio_data: dict) -> dict:
    col = get_collection(Collections.PORTFOLIOS)
    now = datetime.now(timezone.utc).isoformat()

    existing = await col.find_one({"user_id": user_id})

    # Prepare holdings
    clean_holdings = []
    for h in portfolio_data.get("holdings", []):
        h_copy = dict(h)
        if not h_copy.get("id"):
            h_copy["id"] = f"h-{uuid.uuid4().hex[:8]}"
        clean_holdings.append(h_copy)

    invested = portfolio_data.get(
        "investedAmount",
        sum(h.get("quantity", 0) * h.get("avgBuyPrice", 0) for h in clean_holdings)
    )

    update_fields = {
        "name": portfolio_data.get("name", "My Investment Portfolio"),
        "currency": portfolio_data.get("currency", "INR"),
        "investedAmount": round(invested, 2),
        "benchmark": portfolio_data.get("benchmark", "NIFTY50"),
        "isDemo": False,
        "holdings": clean_holdings,
        "lastUpdated": now,
    }

    if existing:
        res = await col.find_one_and_update(
            {"user_id": user_id},
            {"$set": update_fields},
            return_document=True,
        )
        return _format_portfolio_doc(res)
    else:
        update_fields["user_id"] = user_id
        update_fields["created_at"] = now
        res = await col.insert_one(update_fields)
        update_fields["_id"] = res.inserted_id
        return _format_portfolio_doc(update_fields)


async def add_holding(user_id: str, holding: dict) -> dict:
    col = get_collection(Collections.PORTFOLIOS)
    portfolio = await col.find_one({"user_id": user_id})
    if not portfolio:
        portfolio = await create_initial_portfolio(user_id, holdings=[holding])
        return portfolio

    holdings = portfolio.get("holdings", [])
    symbol = holding.get("symbol", "").upper().strip()

    # If already exists, increase quantity
    found = False
    for h in holdings:
        if h.get("symbol", "").upper().strip() == symbol:
            h["quantity"] += holding.get("quantity", 0)
            h["currentPrice"] = holding.get("currentPrice", h.get("currentPrice"))
            found = True
            break

    if not found:
        h_new = dict(holding)
        h_new["symbol"] = symbol
        h_new["id"] = f"h-{uuid.uuid4().hex[:8]}"
        holdings.append(h_new)

    return await save_or_update_portfolio(user_id, {"holdings": holdings})


async def remove_holding(user_id: str, holding_id: str) -> dict:
    col = get_collection(Collections.PORTFOLIOS)
    portfolio = await col.find_one({"user_id": user_id})
    if not portfolio:
        return await create_initial_portfolio(user_id)

    holdings = [h for h in portfolio.get("holdings", []) if h.get("id") != holding_id and h.get("symbol") != holding_id]
    return await save_or_update_portfolio(user_id, {"holdings": holdings})
