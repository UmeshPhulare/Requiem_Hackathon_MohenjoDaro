# ============================================================
# RiskLens — Portfolio Pydantic Schemas
# ============================================================

from pydantic import BaseModel, Field
from typing import Optional, List


class HoldingSchema(BaseModel):
    id: Optional[str] = None
    symbol: str
    name: str
    sector: Optional[str] = "Diversified"
    type: Optional[str] = "Equity"
    quantity: float = Field(..., gt=0)
    avgBuyPrice: float = Field(..., gt=0)
    currentPrice: float = Field(..., gt=0)
    exchange: Optional[str] = "NSE"


class PortfolioCreateOrUpdate(BaseModel):
    name: Optional[str] = "My Investment Portfolio"
    currency: Optional[str] = "INR"
    investedAmount: Optional[float] = 0.0
    holdings: List[HoldingSchema] = []
    benchmark: Optional[str] = "NIFTY50"


class PortfolioResponse(BaseModel):
    id: str
    user_id: str
    name: str
    currency: str = "INR"
    investedAmount: float = 0.0
    lastUpdated: str
    isDemo: bool = False
    holdings: List[HoldingSchema] = []
    benchmark: str = "NIFTY50"
