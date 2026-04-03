// ─────────────────────────────────────────────────────────────────────────────
// api.js — centralised Axios-free fetch wrapper
// All API_BASE references point to REACT_APP_API_URL from .env
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('wl_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Handle 204 No Content
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({ message: res.statusText }));

  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    throw err;
  }

  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  me: () => request('/auth/me'),
};

// ── Logs ──────────────────────────────────────────────────────────────────────
export const logsAPI = {
  getMyLogs: () => request('/logs/me'),
  createLog: (date, content) =>
    request('/logs', { method: 'POST', body: JSON.stringify({ date, content }) }),
  updateLog: (id, content) =>
    request(`/logs/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getOverview: () => request('/admin/overview'),
  getUserLogs: (userId) => request(`/admin/user/${userId}/logs`),
};
