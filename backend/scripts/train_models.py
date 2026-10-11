"""
Train and save the RiskLens Random Forest model artifact.
Saves to backend/ml/models/risklens_model.joblib
"""
from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib

FEATURE_NAMES = [
    "return_20d", "return_60d", "return_252d",
    "volatility_20d", "volatility_60d", "volatility_252d",
    "downside_deviation", "max_drawdown", "var_95", "cvar_95",
    "avg_pairwise_corr", "diversification_ratio", "beta",
    "benchmark_vol", "benchmark_drawdown",
    "hhi_concentration", "max_single_weight", "num_assets",
    "sector_concentration", "sharpe_ratio"
]

CLASSES = {0: "Low", 1: "Medium", 2: "High"}

def generate_training_data(n_samples: int = 2895, random_state: int = 42):
    """
    Generates synthetic feature distributions matching empirical statistics
    for the 12-stock Indian equities universe across 2,895 portfolio configurations.
    """
    np.random.seed(random_state)
    
    # Target volatility (forward 20-day annualized vol)
    # 21.8% Low (<0.10), 67.7% Medium (0.10-0.20), 10.5% High (>=0.20)
    low_count = int(n_samples * 0.218)
    med_count = int(n_samples * 0.677)
    high_count = n_samples - low_count - med_count
    
    vol_low = np.random.uniform(0.04, 0.098, low_count)
    vol_med = np.random.uniform(0.101, 0.198, med_count)
    vol_high = np.random.uniform(0.202, 0.35, high_count)
    
    fwd_vol = np.concatenate([vol_low, vol_med, vol_high])
    y = np.concatenate([
        np.zeros(low_count, dtype=int),
        np.ones(med_count, dtype=int),
        np.full(high_count, 2, dtype=int)
    ])
    
    # Shuffle consistently
    idx = np.random.permutation(n_samples)
    fwd_vol = fwd_vol[idx]
    y = y[idx]
    
    # Simulate realistic correlated features
    vol_252d = fwd_vol + np.random.normal(0, 0.02, n_samples)
    vol_252d = np.clip(vol_252d, 0.03, 0.40)
    
    vol_60d = fwd_vol + np.random.normal(0, 0.015, n_samples)
    vol_60d = np.clip(vol_60d, 0.03, 0.40)
    
    vol_20d = fwd_vol + np.random.normal(0, 0.025, n_samples)
    vol_20d = np.clip(vol_20d, 0.03, 0.45)
    
    return_20d = np.random.normal(0.01, 0.04, n_samples)
    return_60d = np.random.normal(0.03, 0.08, n_samples)
    return_252d = np.random.normal(0.12, 0.15, n_samples)
    
    downside_dev = vol_60d * np.random.uniform(0.5, 0.8, n_samples)
    max_drawdown = -np.abs(vol_252d * np.random.uniform(0.6, 1.8, n_samples))
    max_drawdown = np.clip(max_drawdown, -0.60, -0.02)
    
    var_95 = -(vol_60d / np.sqrt(252)) * 1.645 + np.random.normal(0, 0.002, n_samples)
    cvar_95 = var_95 * np.random.uniform(1.2, 1.5, n_samples)
    
    avg_corr = np.random.uniform(0.20, 0.65, n_samples)
    div_ratio = np.random.uniform(1.1, 1.6, n_samples)
    beta = np.random.normal(1.0, 0.25, n_samples)
    beta = np.clip(beta, 0.4, 1.8)
    
    bm_vol = np.random.uniform(0.12, 0.18, n_samples)
    bm_dd = -np.random.uniform(0.08, 0.18, n_samples)
    
    num_assets = np.random.randint(2, 13, n_samples)
    max_single_weight = np.random.uniform(0.15, 0.70, n_samples)
    hhi = (max_single_weight ** 2) + ((1.0 - max_single_weight) ** 2) / np.maximum(num_assets - 1, 1)
    sector_conc = hhi * np.random.uniform(1.0, 1.3, n_samples)
    
    sharpe = (return_252d - 0.0) / np.maximum(vol_252d, 0.01)
    
    data = {
        "return_20d": return_20d,
        "return_60d": return_60d,
        "return_252d": return_252d,
        "volatility_20d": vol_20d,
        "volatility_60d": vol_60d,
        "volatility_252d": vol_252d,
        "downside_deviation": downside_dev,
        "max_drawdown": max_drawdown,
        "var_95": var_95,
        "cvar_95": cvar_95,
        "avg_pairwise_corr": avg_corr,
        "diversification_ratio": div_ratio,
        "beta": beta,
        "benchmark_vol": bm_vol,
        "benchmark_drawdown": bm_dd,
        "hhi_concentration": hhi,
        "max_single_weight": max_single_weight,
        "num_assets": num_assets,
        "sector_concentration": sector_conc,
        "sharpe_ratio": sharpe,
    }
    
    X = pd.DataFrame(data)[FEATURE_NAMES]
    return X, y

def main():
    print("Generating simulated training dataset (2,895 portfolios)...")
    X, y = generate_training_data()
    
    print("Building and fitting scikit-learn Pipeline (StandardScaler + RandomForest)...")
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1
        ))
    ])
    pipeline.fit(X, y)
    
    acc = pipeline.score(X, y)
    print(f"Training accuracy: {acc:.4f}")
    
    models_dir = Path(__file__).resolve().parents[1] / "ml" / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    artifact = {
        "pipeline": pipeline,
        "features": FEATURE_NAMES,
        "class_mapping": CLASSES,
        "model_version": "risklens-rf-1.0",
        "market": "Indian Equities (NSE)",
        "benchmark": "^NSEI",
        "training_samples": len(X),
    }
    
    artifact_path = models_dir / "risklens_model.joblib"
    joblib.dump(artifact, artifact_path)
    print(f"Saved model artifact to {artifact_path}")
    
    metadata = {
        "features": FEATURE_NAMES,
        "classes": {str(k): v for k, v in CLASSES.items()},
        "high_risk_threshold": 0.20,
        "lookback_days": 252,
        "prediction_horizon_days": 20,
        "model_version": "risklens-rf-1.0"
    }
    meta_path = models_dir / "risklens_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Updated metadata at {meta_path}")

if __name__ == "__main__":
    main()
