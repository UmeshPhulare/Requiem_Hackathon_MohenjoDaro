import sys
from pathlib import Path

# Add backend root to sys.path
backend_root = Path(__file__).resolve().parents[2]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    print("Health response:", r.json())

def test_market_quotes():
    r = client.get("/api/market/quotes?symbols=RELIANCE.NS,TCS.NS")
    assert r.status_code == 200
    data = r.json()
    assert len(data["quotes"]) == 2
    for q in data["quotes"]:
        assert q["last_price"] > 0
        print(f"Quote {q['symbol']}: Price={q['last_price']} {q['currency']} (Change={q['change_pct']}%)")

def test_analysis_quant():
    payload = {
        "symbols": ["RELIANCE.NS", "TCS.NS"],
        "weights": {"RELIANCE.NS": 0.6, "TCS.NS": 0.4},
        "benchmark": "^NSEI",
        "risk_preference": "Moderate",
        "risk_free_rate": 0.065
    }
    r = client.post("/api/analysis/quant", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "metrics" in data
    assert "risk_contributions" in data
    assert "correlation_matrix" in data
    assert len(data["drawdown_series"]) > 0
    print("Quant Metrics:", data["metrics"])
    print("Risk Contributions:", data["risk_contributions"])

def test_analysis_risk():
    payload = {
        "symbols": ["RELIANCE.NS", "TCS.NS"],
        "weights": {"RELIANCE.NS": 0.6, "TCS.NS": 0.4},
        "benchmark": "^NSEI",
        "risk_preference": "Moderate",
        "risk_free_rate": 0.065
    }
    r = client.post("/api/analysis/risk", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "risk_class" in data
    assert "historical_metrics" in data
    assert "explanations" in data
    print("Risk Class:", data["risk_class"], "Probabilities:", data["probabilities"])


def test_portfolio_optimize():
    payload = {
        "symbols": ["RELIANCE.NS", "TCS.NS"],
        "weights": {"RELIANCE.NS": 0.7, "TCS.NS": 0.3},
        "capital": 100000.0,
        "risk_preference": "Moderate",
        "benchmark": "^NSEI",
        "max_asset_weight": 0.60,
        "risk_free_rate": 0.065
    }
    r = client.post("/api/portfolio/optimize", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "strategies" in data
    assert "current" in data["strategies"]
    assert "optimized" in data["strategies"]
    assert "equal_weight" in data["strategies"]
    assert "benchmark" in data["strategies"]
    assert "weight_explanations" in data
    assert len(data["weight_explanations"]) == 2
    assert "trade_offs_summary" in data
    assert len(data["efficient_frontier"]) > 0
    print("Optimization success:", data["trade_offs_summary"]["narrative"])
    for exp in data["weight_explanations"]:
        print(f"  {exp['symbol']}: {exp['current_weight']*100:.1f}% -> {exp['recommended_weight']*100:.1f}% ({exp['reason']})")


def test_analysis_compare():
    payload = {
        "symbols": ["RELIANCE.NS", "TCS.NS"],
        "weights": {"RELIANCE.NS": 0.5, "TCS.NS": 0.5},
        "benchmark": "^NSEI",
        "risk_free_rate": 0.065
    }
    r = client.post("/api/analysis/compare", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "assets" in data
    assert len(data["assets"]) == 2
    assert "correlation_matrix" in data
    assert "strategies" in data
    print("Comparison success. Assets compared:", [a["symbol"] for a in data["assets"]])


if __name__ == "__main__":
    test_health()
    test_market_quotes()
    test_analysis_quant()
    test_analysis_risk()
    test_portfolio_optimize()
    test_analysis_compare()
    print("All integration tests passed successfully!")

