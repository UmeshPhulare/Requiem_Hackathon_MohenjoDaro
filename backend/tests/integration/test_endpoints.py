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


if __name__ == "__main__":
    test_health()
    test_market_quotes()
    test_analysis_quant()
    test_analysis_risk()
    print("All integration tests passed successfully!")
