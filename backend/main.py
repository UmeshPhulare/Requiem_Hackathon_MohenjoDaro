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
        "quantitative metrics, ML risk classification, allocation optimisation "
        "and historical backtesting."
    ),
    version="0.1.0",
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
from app.api.routes import market_data, risk, market_intelligence

# ✅ Phase 1 — Market Data Adapter
app.include_router(market_data.router, prefix="/api/market",   tags=["Market Data"])
# ✅ Phase 1 & 2 — Risk Analysis (ML inference + Quantitative Risk Engine)
app.include_router(risk.router,        prefix="/api/analysis", tags=["Analysis"])
# ✅ AI Market Intelligence & Sentiment Analysis (Finnhub + Gemini)
app.include_router(market_intelligence.router, prefix="/api/market", tags=["Market Intelligence"])

# ⬜ Phases 3+ — Uncomment as implemented
# from app.api.routes import portfolio, optimization, backtesting, users
# app.include_router(portfolio.router,    prefix="/api/portfolios",        tags=["Portfolios"])
# app.include_router(optimization.router, prefix="/api/portfolio/optimize", tags=["Optimization"])
# app.include_router(backtesting.router,  prefix="/api/backtests",         tags=["Backtesting"])
# app.include_router(users.router,        prefix="/api/users",             tags=["Users"])
