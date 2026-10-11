// ============================================================
// RiskLens — Centralized API Client
// Connects to FastAPI backend at http://127.0.0.1:8000
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Universal fetch wrapper with error handling and JSON parsing.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(url, config);
    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        errorDetail = errorJson.detail || errorDetail;
      } catch {
        // ignore non-json error responses
      }
      throw new Error(errorDetail);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[RiskLens API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

export default {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
};
