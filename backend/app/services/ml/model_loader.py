# ============================================================
# RiskLens — ML Model Loader (Phase 1 + ML connection)
# Loads the trained joblib artifact once at startup.
# ============================================================

import json
import logging
from pathlib import Path
from typing import Any, Optional

import joblib

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
# __file__ = backend/app/services/ml/model_loader.py
# parents[0] = backend/app/services/ml/
# parents[1] = backend/app/services/
# parents[2] = backend/app/
# parents[3] = backend/
# parents[3] / "ml" / "models" = backend/ml/models/
_ML_DIR      = Path(__file__).resolve().parents[3] / "ml" / "models"
_MODEL_PATH  = _ML_DIR / "risklens_model.joblib"
_META_PATH   = _ML_DIR / "risklens_metadata.json"

# ── Module-level singletons ────────────────────────────────────────────────────
_artifact:  Optional[dict]  = None
_metadata:  Optional[dict]  = None


def load_model() -> None:
    """
    Load the trained scikit-learn pipeline and metadata JSON from disk.
    Intended to be called once inside FastAPI's lifespan startup handler.

    The loaded artifact is a dict:
        {
            "pipeline":     fitted sklearn Pipeline (StandardScaler + RandomForest),
            "features":     list[str] — exactly 20 feature names in fixed order,
            "class_mapping": {0: "Low", 1: "Medium", 2: "High"},
            "model_version": str,
            ...
        }
    """
    global _artifact, _metadata

    if not _MODEL_PATH.exists():
        logger.warning("Model artifact not found at %s — continuing in lightweight mode.", _MODEL_PATH)
        _artifact = {"features": [], "class_mapping": {0: "Low", 1: "Medium", 2: "High"}, "pipeline": None}
        return

    logger.info("Loading ML model from %s …", _MODEL_PATH)
    _artifact = joblib.load(_MODEL_PATH)

    if not _META_PATH.exists():
        logger.warning("Metadata file not found at %s — using defaults.", _META_PATH)
        _metadata = {
            "model_version": "risklens-rf-1.0",
            "classes": {"0": "Low", "1": "Medium", "2": "High"},
            "lookback_days": 252,
        }
    else:
        with open(_META_PATH, "r") as f:
            _metadata = json.load(f)

    logger.info(
        "ML model loaded successfully. version=%s features=%d",
        _metadata.get("model_version", "unknown"),
        len(get_feature_names()),
    )


def get_artifact() -> dict:
    """Return the loaded model artifact dict. Raises if not yet loaded."""
    if _artifact is None:
        raise RuntimeError(
            "ML model artifact is not loaded. "
            "Call load_model() during application startup."
        )
    return _artifact


def get_metadata() -> dict:
    """Return the loaded metadata dict. Raises if not yet loaded."""
    if _metadata is None:
        raise RuntimeError("ML metadata not loaded. Call load_model() first.")
    return _metadata


def get_pipeline() -> Any:
    """Return the fitted sklearn pipeline (StandardScaler + RandomForest)."""
    return get_artifact()["pipeline"]


def get_feature_names() -> list[str]:
    """Return the ordered list of 20 feature names expected by the pipeline."""
    artifact = get_artifact()
    # Support both artifact dict key and metadata JSON
    if "features" in artifact:
        return artifact["features"]
    meta = get_metadata()
    return meta.get("features", [])


def get_class_mapping() -> dict[int, str]:
    """Return {0: 'Low', 1: 'Medium', 2: 'High'}."""
    artifact = get_artifact()
    if "class_mapping" in artifact:
        return artifact["class_mapping"]
    meta = get_metadata()
    raw = meta.get("classes", {"0": "Low", "1": "Medium", "2": "High"})
    return {int(k): v for k, v in raw.items()}


def get_model_version() -> str:
    """Return the model version string."""
    artifact = get_artifact()
    if "model_version" in artifact:
        return artifact["model_version"]
    return get_metadata().get("model_version", "unknown")
