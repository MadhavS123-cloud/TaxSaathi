/**
 * src/lib/api.js - Centralized API client for TaxSaathi.
 *
 * - Reads token from localStorage ("taxsaathi_token")
 * - Sets "Authorization: Bearer <token>" on every request
 * - On 401: clears token and redirects to /login
 * - Does NOT set Content-Type for FormData (browser sets it with boundary)
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'taxsaathi_token';
const USER_KEY = 'taxsaathi_user';
const FIRM_KEY = 'taxsaathi_firm';

// ── Token helpers ─────────────────────────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(FIRM_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getFirm() {
  try {
    const raw = localStorage.getItem(FIRM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setFirm(firm) {
  localStorage.setItem(FIRM_KEY, JSON.stringify(firm));
}

export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

function authHeaders(isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';
  return headers;
}

function handleUnauthorized() {
  clearToken();
  // Redirect with a query param so LoginPage can show a message
  window.location.href = '/login?reason=session_expired';
}

async function request(method, path, body = null, isFormData = false) {
  const url = `${API_BASE}${path}`;
  const options = {
    method,
    headers: authHeaders(isFormData),
  };
  if (body !== null) {
    options.body = isFormData ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (networkErr) {
    throw new Error(`Network error: cannot reach ${API_BASE}. Is the backend running?`);
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired, please sign in again.');
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const err = await response.json();
      detail = err.detail || err.message || detail;
    } catch { /* ignore parse errors */ }
    throw new Error(detail);
  }

  // 204 No Content
  if (response.status === 204) return null;
  return response.json();
}

// ── API surface ───────────────────────────────────────────────────────────────

export const api = {

  // Auth
  auth: {
    register: (name, email, password, firmName) =>
      request('POST', '/auth/register', { name, email, password, firm_name: firmName }),

    login: (email, password) =>
      request('POST', '/auth/login', { email, password }),
  },

  // Health
  health: () => request('GET', '/health'),

  // Dashboard
  dashboard: {
    summary: () => request('GET', '/dashboard/summary'),
  },

  // Cases
  cases: {
    list: () => request('GET', '/cases/'),
    get: (id) => request('GET', `/cases/${id}`),
    create: (data) => request('POST', '/cases/', data),
    deleteAll: () => request('DELETE', '/cases/'),
  },

  // Activities
  activities: {
    list: () => request('GET', '/activities/'),
  },

  // Documents (OCR upload)
  documents: {
    upload: (caseId, file) => {
      const fd = new FormData();
      fd.append('file', file);
      return request('POST', `/cases/${caseId}/documents`, fd, true);
    },
    list: (caseId) => request('GET', `/cases/${caseId}/documents`),
    update: (caseId, docId, extractedJson) =>
      request('PUT', `/cases/${caseId}/documents/${docId}`, { extracted_json: extractedJson }),
  },

  // Extract (legacy single-file endpoint)
  extract: {
    document: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      return request('POST', '/api/extract', fd, true);
    },
  },

  // Reconciliation
  reconciliation: {
    run: (invoiceFile, paymentFile, dateToleranceDays = 3, amountTolerance = 1.0) => {
      const fd = new FormData();
      fd.append('invoice_file', invoiceFile);
      fd.append('payment_file', paymentFile);
      fd.append('date_tolerance_days', String(dateToleranceDays));
      fd.append('amount_tolerance', String(amountTolerance));
      return request('POST', '/reconciliation/run', fd, true);
    },
  },

  // Advisory
  advisory: {
    ask: (query, caseId = null, topK = 7) =>
      request('POST', '/api/advisory', { query, case_id: caseId, top_k: topK }),
    history: (caseId = null) =>
      request('GET', caseId ? `/api/advisory/history?case_id=${caseId}` : '/api/advisory/history'),
    health: () => request('GET', '/api/advisory/health'),
  },
};
