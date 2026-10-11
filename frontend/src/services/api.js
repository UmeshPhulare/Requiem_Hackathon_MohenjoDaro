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

  // Ensure clean endpoint path without double slashes or redundant /api
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let fullUrl = `${BASE_URL}${cleanEndpoint}`;
  if (BASE_URL === '/api' && cleanEndpoint.startsWith('/api/')) {
    fullUrl = cleanEndpoint;
  }

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  try {
    const res = await fetch(fullUrl, config);
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

const api = {
  get: (endpoint, options) => apiRequest(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...options,
    }),
  put: (endpoint, body, options) =>
    apiRequest(endpoint, {
      method: 'PUT',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      ...options,
    }),
  delete: (endpoint, options) => apiRequest(endpoint, { method: 'DELETE', ...options }),
  request: apiRequest,
  auth: authApi,
  portfolio: portfolioApi,
};

export default api;
