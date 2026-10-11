# ============================================================
# RiskLens Backend — MongoDB Atlas Connection Manager
# Uses PyMongo with Motor (async) driver.
# Provides: connect_db(), close_db(), get_db(), get_collection()
# ============================================================

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level client and db — set during lifespan startup
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """
    Open the MongoDB Atlas connection.
    Called once during FastAPI startup lifespan.
    """
    global _client, _db
    try:
        use_tls = "mongodb+srv://" in settings.MONGODB_URI or "ssl=true" in settings.MONGODB_URI.lower()
        client_kwargs = {
            "serverSelectionTimeoutMS": 3000,
            "connectTimeoutMS": 3000,
            "socketTimeoutMS": 5000,
        }
        if use_tls:
            client_kwargs.update({"tls": True, "retryWrites": True, "w": "majority"})
        _client = AsyncIOMotorClient(settings.MONGODB_URI, **client_kwargs)
        # Force a real connection check
        await _client.admin.command("ping")
        _db = _client[settings.MONGODB_DB_NAME]
        logger.info(
            "✅ MongoDB connected — database: '%s'", settings.MONGODB_DB_NAME
        )
    except Exception as exc:
        logger.warning("⚠️ MongoDB unavailable (%s). Continuing in stateless mode.", exc)
        _db = None


async def close_db() -> None:
    """
    Close the MongoDB Atlas connection.
    Called once during FastAPI shutdown lifespan.
    """
    global _client, _db
    if _client is not None:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """
    Return the active database handle.
    Raises RuntimeError if called before connect_db().
    """
    if _db is None:
        raise RuntimeError(
            "Database not initialised. Did connect_db() run at startup?"
        )
    return _db


def get_collection(name: str):
    """
    Convenience helper — return a named collection from the active database.

    Usage (inside a route or service):
        col = get_collection("portfolios")
        doc = await col.find_one({"_id": portfolio_id})
    """
    return get_db()[name]


# ── Collection name constants ─────────────────────────────────────────────────
class Collections:
    USERS           = "users"
    PORTFOLIOS      = "portfolios"
    ANALYSIS_RUNS   = "analysis_runs"
    RECOMMENDATIONS = "recommendations"
    SIMULATIONS     = "simulations"
