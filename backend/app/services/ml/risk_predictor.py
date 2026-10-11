# ============================================================
# RiskLens — Risk Predictor Service (Phase 1 + ML connection)
# Runs inference: features → risk class + probabilities + SHAP
# ============================================================

import logging
from typing import Optional

import numpy as np
import pandas as pd

from app.services.ml.model_loader import (
    get_pipeline,
    get_feature_names,
    get_class_mapping,
    get_model_version,
)

logger = logging.getLogger(__name__)


def predict_risk(
    features: dict[str, float],
) -> dict:
    """
    Run ML inference on a feature vector and return a structured result.

    Args:
        features: dict {feature_name: float} — 20 features in any dict order.
                  The function will arrange them in the exact pipeline order.

    Returns:
        {
            "risk_class":   str,            # "Low" | "Medium" | "High"
            "probabilities": {str: float},  # e.g. {"Low": 0.22, "Medium": 0.66, "High": 0.12}
            "class_id":     int,            # 0 | 1 | 2
            "model_version": str,
            "explanations": list[dict],     # top-5 SHAP feature importances
            "features_used": dict,          # echo back the feature vector
        }
    """
    feature_names  = get_feature_names()
    class_mapping  = get_class_mapping()
    pipeline       = get_pipeline()
    model_version  = get_model_version()

    # ── Arrange features in pipeline's expected order ────────────────────────
    missing = [f for f in feature_names if f not in features]
    if missing:
        raise ValueError(
            f"Feature vector is missing required features: {missing}"
        )

    X = pd.DataFrame(
        [[features[name] for name in feature_names]],
        columns=feature_names,
    )

    # ── Inference ────────────────────────────────────────────────────────────
    class_id     = int(pipeline.predict(X)[0])
    proba_array  = pipeline.predict_proba(X)[0]
    risk_class   = class_mapping[class_id]

    probabilities = {
        class_mapping[i]: round(float(p), 4)
        for i, p in enumerate(proba_array)
    }

    # ── SHAP explanations (best-effort — graceful fallback) ──────────────────
    explanations = _compute_shap_explanations(pipeline, X, feature_names, class_id)

    logger.info(
        "Risk prediction: class=%s probabilities=%s", risk_class, probabilities
    )

    return {
        "risk_class":    risk_class,
        "class_id":      class_id,
        "probabilities": probabilities,
        "model_version": model_version,
        "explanations":  explanations,
        "features_used": {k: round(v, 6) for k, v in features.items()},
    }


def _compute_shap_explanations(
    pipeline,
    X: pd.DataFrame,
    feature_names: list[str],
    class_id: int,
    top_n: int = 5,
) -> list[dict]:
    """
    Compute SHAP values using TreeExplainer.
    Returns top-N features sorted by absolute SHAP impact.
    Falls back to feature importances if SHAP is unavailable.
    """
    try:
        import shap  # optional dependency

        # Extract the classifier from the pipeline
        classifier = pipeline.named_steps.get("classifier") or pipeline[-1]

        # Transform X through all steps except the last (classifier)
        if hasattr(pipeline, "named_steps") and len(pipeline.steps) > 1:
            # Apply preprocessing steps
            X_transformed = X.copy()
            for name, step in pipeline.steps[:-1]:
                X_transformed = pd.DataFrame(
                    step.transform(X_transformed),
                    columns=X_transformed.columns,
                )
        else:
            X_transformed = X

        explainer   = shap.TreeExplainer(classifier)
        shap_values = explainer.shap_values(X_transformed)

        # For multi-class, shap_values is a list of arrays (one per class)
        if isinstance(shap_values, list):
            sv = shap_values[class_id][0]
        else:
            sv = shap_values[0]

        # Build explanation dicts
        impacts = sorted(
            zip(feature_names, sv),
            key=lambda x: abs(x[1]),
            reverse=True,
        )[:top_n]

        return [
            {
                "feature":           feat,
                "shap_value":        round(float(val), 6),
                "impact":            "positive" if val > 0 else "negative",
                "importance_score":  round(abs(float(val)), 6),
                "description":       _feature_description(feat, features_dict=dict(zip(feature_names, X.values[0]))),
            }
            for feat, val in impacts
        ]

    except ImportError:
        logger.warning("SHAP library not available — falling back to feature importances.")
        return _fallback_feature_importances(pipeline, feature_names, top_n)
    except Exception as exc:
        logger.warning("SHAP computation failed (%s) — using fallback.", exc)
        return _fallback_feature_importances(pipeline, feature_names, top_n)


def _fallback_feature_importances(
    pipeline,
    feature_names: list[str],
    top_n: int = 5,
) -> list[dict]:
    """Use RandomForest feature importances as fallback when SHAP is unavailable."""
    try:
        classifier = pipeline.named_steps.get("classifier") or pipeline[-1]
        importances = classifier.feature_importances_
        ranked = sorted(
            zip(feature_names, importances),
            key=lambda x: x[1],
            reverse=True,
        )[:top_n]
        return [
            {
                "feature":           feat,
                "shap_value":        None,
                "impact":            "positive",
                "importance_score":  round(float(imp), 6),
                "description":       _feature_description(feat),
            }
            for feat, imp in ranked
        ]
    except Exception as exc:
        logger.warning("Feature importance fallback also failed: %s", exc)
        return []


def _feature_description(feat: str, features_dict: Optional[dict] = None) -> str:
    """Generate a human-readable description for a given feature name."""
    descriptions = {
        "return_20d":            "20-day cumulative portfolio return",
        "return_60d":            "60-day cumulative portfolio return",
        "return_252d":           "1-year cumulative portfolio return",
        "volatility_20d":        "20-day annualized volatility",
        "volatility_60d":        "60-day annualized volatility",
        "volatility_252d":       "1-year annualized volatility",
        "downside_deviation":    "Downside deviation (negative returns only)",
        "max_drawdown":          "Maximum peak-to-trough decline over 1 year",
        "var_95":                "Value at Risk (95% confidence, 60-day)",
        "cvar_95":               "Conditional VaR — average tail loss (60-day)",
        "avg_pairwise_corr":     "Average correlation between holdings (60-day)",
        "diversification_ratio": "Diversification ratio — benefit of combining assets",
        "beta":                  "Portfolio beta relative to NIFTY 50",
        "benchmark_vol":         "NIFTY 50 annualized volatility (60-day)",
        "benchmark_drawdown":    "NIFTY 50 maximum drawdown (1-year)",
        "hhi_concentration":     "Herfindahl-Hirschman concentration index",
        "max_single_weight":     "Largest single asset weight in portfolio",
        "num_assets":            "Number of holdings with positive allocation",
        "sector_concentration":  "Concentration of portfolio across sectors",
        "sharpe_ratio":          "Sharpe ratio — risk-adjusted return (60-day)",
    }
    base = descriptions.get(feat, feat.replace("_", " ").title())
    if features_dict and feat in features_dict:
        val = features_dict[feat]
        return f"{base}: {val:.4f}"
    return base
