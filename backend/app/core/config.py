# ============================================================
# RiskLens Backend — Application Settings
# Loaded via Pydantic BaseSettings; reads from .env automatically.
# ============================================================

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # ── MongoDB ──────────────────────────────────────────────
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "risklens"

    # ── FastAPI / Server ─────────────────────────────────────
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    SECRET_KEY: str = "change-this-secret"
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Quant defaults ───────────────────────────────────────
    RISK_FREE_RATE: float = 0.065          # annualised, used in Sharpe / Sortino

    # ── External AI & News API Keys ──────────────────────────
    GEMINI_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""

    # ── Pydantic v2 config ───────────────────────────────────
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return ALLOWED_ORIGINS as a Python list."""
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings singleton (one .env read per process)."""
    return Settings()


settings = get_settings()
