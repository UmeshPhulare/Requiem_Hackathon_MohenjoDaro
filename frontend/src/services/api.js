// api.js — Unified HTTP client connected to FastAPI / MongoDB Atlas backend
const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Universal authenticated HTTP request helper
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('risklens_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Ensure leading slash if needed and strip redundant /api if endpoint already has it
  let cleanEndpoint = endpoint;
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  // If endpoint already starts with /api and API_BASE is /api, avoid /api/api/...
  let fullUrl = `${API_BASE}${cleanEndpoint}`;
  if (API_BASE === '/api' && cleanEndpoint.startsWith('/api/')) {
    fullUrl = cleanEndpoint;
  }

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || response.statusText || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.warn(`[RiskLens API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

// ── Auth Endpoints ──────────────────────────────────────────
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
