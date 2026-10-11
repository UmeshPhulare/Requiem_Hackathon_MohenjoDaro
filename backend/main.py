# ============================================================
# RiskLens Backend — FastAPI Application Entry Point
# ============================================================

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.connection import connect_db, close_db
from app.services.ml.model_loader import load_model

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager.
    Everything before `yield`  → runs on startup.
    Everything after  `yield`  → runs on shutdown.
    """
    # ── Startup ──
    logger.info("🚀 RiskLens API starting up…")
    await connect_db()
    load_model()          # ← load trained ML artifact into memory
    yield
    # ── Shutdown ──
    logger.info("🛑 RiskLens API shutting down…")
    await close_db()


# ── Application factory ───────────────────────────────────────────────────────
app = FastAPI(
    title="RiskLens API",
    description=(
        "Explainable investment-portfolio risk analysis — "
        "quantitative metrics, ML risk classification, allocation optimisation, "
        "historical backtesting, and AI market intelligence."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """
    Liveness probe.
    Returns 200 when the server is running and the DB connection is alive.
    """
    from app.db.connection import get_db
    try:
        db = get_db()
        await db.command("ping")
        db_status = "connected"
    except Exception as exc:
        db_status = f"error: {exc}"

    return {
        "status": "ok",
        "environment": settings.APP_ENV,
        "database": db_status,
        "db_name": settings.MONGODB_DB_NAME,
    }


# ── API routers ───────────────────────────────────────────────────────────────
from app.api.routes import (
    users,
    portfolio,
    market_data,
    risk,
    optimization,
    backtesting,
    intelligence,
    market_intelligence,
)

# ✅ Authentication & User Management (MongoDB Atlas)
app.include_router(users.router,               prefix="/api/auth",       tags=["Authentication"])
app.include_router(users.router,               prefix="/api/users",      tags=["Users"])

# ✅ User Portfolios CRUD (MongoDB Atlas)
app.include_router(portfolio.router,           prefix="/api/portfolios", tags=["Portfolios"])

# ✅ Phase 1 — Market Data Adapter
app.include_router(market_data.router,         prefix="/api/market",     tags=["Market Data"])

# ✅ Phase 1 & 2 — Quantitative Risk Engine + ML Analysis
app.include_router(risk.router,                prefix="/api/analysis",   tags=["Analysis"])

# ✅ Phase 4 & 9 — Portfolio Optimization & Strategy Comparison (CVXPY)
app.include_router(optimization.router,        prefix="/api/portfolio",  tags=["Optimization"])
app.include_router(optimization.router,        prefix="/api/analysis",   tags=["Analysis & Comparison"])

# ✅ Phase 10 & 11 — Historical Backtesting & Stress Lab
app.include_router(backtesting.router,         prefix="/api",            tags=["Backtesting & Stress Lab"])

# ✅ Phase 14 — Market Intelligence & Financial Sentiment NLP (Loughran-McDonald)
app.include_router(intelligence.router,        prefix="/api",            tags=["Market Intelligence NLP"])

# ✅ Live AI Market Intelligence & Live Quotes Feed (Finnhub + Gemini AI)
app.include_router(market_intelligence.router, prefix="/api/market",     tags=["Market Intelligence Live"])
