// ============================================================
// RiskLens — Centralized API Client
// Connects to FastAPI backend at http://127.0.0.1:8000
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Universal fetch wrapper with error handling, JWT tokens, and JSON parsing.
 */
export async function apiRequest(endpoint, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('risklens_token') : null;
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ── Auth Endpoints (MongoDB Atlas) ──────────────────────────
export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password, risk_preference = 'moderate') =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, risk_preference }),
    }),

  getMe: () => apiRequest('/auth/me'),
};

// ── Portfolio Endpoints (MongoDB Atlas) ─────────────────────
export const portfolioApi = {
  get: () => apiRequest('/portfolios'),

  update: (portfolioData) =>
    apiRequest('/portfolios', {
      method: 'PUT',
      body: JSON.stringify(portfolioData),
    }),

  addHolding: (holding) =>
    apiRequest('/portfolios/holdings', {
      method: 'POST',
      body: JSON.stringify(holding),
    }),

  deleteHolding: (holdingId) =>
    apiRequest(`/portfolios/holdings/${holdingId}`, {
      method: 'DELETE',
    }),

  seedSample: () =>
    apiRequest('/portfolios/seed-sample', {
      method: 'POST',
    }),
};

export default {
  apiRequest,
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  auth: authApi,
  portfolio: portfolioApi,
};
