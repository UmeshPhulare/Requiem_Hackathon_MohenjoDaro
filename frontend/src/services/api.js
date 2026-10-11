// api.js — Centralized HTTP client connected to FastAPI / MongoDB Atlas backend
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Perform an authenticated HTTP request
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('risklens_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || response.statusText || 'Request failed';
    throw new Error(errorMsg);
  }

  return data;
}

// ── Auth Endpoints ──────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password, risk_preference = 'moderate') =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, risk_preference }),
    }),

  getMe: () => request('/auth/me'),
};

// ── Portfolio Endpoints (MongoDB Atlas) ─────────────────────
export const portfolioApi = {
  get: () => request('/portfolios'),

  update: (portfolioData) =>
    request('/portfolios', {
      method: 'PUT',
      body: JSON.stringify(portfolioData),
    }),

  addHolding: (holding) =>
    request('/portfolios/holdings', {
      method: 'POST',
      body: JSON.stringify(holding),
    }),

  deleteHolding: (holdingId) =>
    request(`/portfolios/holdings/${holdingId}`, {
      method: 'DELETE',
    }),

  seedSample: () =>
    request('/portfolios/seed-sample', {
      method: 'POST',
    }),
};

export default {
  auth: authApi,
  portfolio: portfolioApi,
};
