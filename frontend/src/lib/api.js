/**
 * src/lib/api.js - Centralized API client for TaxSaathi.
 *
 * - Reads token from localStorage ("taxsaathi_token")
 * - Sets "Authorization: Bearer <token>" on EVERY request
 * - Does NOT set Content-Type manually for FormData (browser sets boundary)
 * - On 401: clears token and redirects to /login with session expired message
 * - Reads VITE_API_URL, default http://localhost:8000
 */

const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'taxsaathi_token';
const USER_KEY = 'taxsaathi_user';
const FIRM_KEY = 'taxsaathi_firm';

// ── Token & session storage helpers ──────────────────────────────────────────

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
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
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
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
  if (firm) {
    localStorage.setItem(FIRM_KEY, JSON.stringify(firm));
  }
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

// ── HTTP Core Wrapper ─────────────────────────────────────────────────────────

function authHeaders(isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

function handleUnauthorized() {
  clearToken();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login?reason=session_expired';
  }
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
    throw new Error(`Cannot reach backend at ${API_BASE}. Is the backend running?`);
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
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

// ── API Surface ───────────────────────────────────────────────────────────────

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

  // Clients
  clients: {
    list: () => request('GET', '/clients'),
    create: (data) => request('POST', '/clients', data),
  },

  // Cases
  cases: {
    list: () => request('GET', '/cases'),
    get: (id) => request('GET', `/cases/${id}`),
    create: (data) => request('POST', '/cases', data),
    deleteAll: () => request('DELETE', '/cases'),
  },

  // Activities
  activities: {
    list: () => request('GET', '/activities'),
  },

  // Documents
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
    reconcileCase: (caseId, paymentFile, invoiceFile = null, dateToleranceDays = 3, amountTolerance = 1.0) => {
      const fd = new FormData();
      fd.append('payment_file', paymentFile);
      if (invoiceFile) {
        fd.append('invoice_file', invoiceFile);
      }
      fd.append('date_tolerance_days', String(dateToleranceDays));
      fd.append('amount_tolerance', String(amountTolerance));
      return request('POST', `/cases/${caseId}/reconcile`, fd, true);
    },
    getCaseReconciliation: (caseId) => request('GET', `/cases/${caseId}/reconcile`),
  },

  // Advisory RAG
  advisory: {
    ask: (question, caseId = null, topK = 7) =>
      request('POST', '/advisory/ask', { query: question, case_id: caseId, top_k: topK }),
    history: (caseId = null) =>
      request('GET', caseId ? `/advisory/history?case_id=${caseId}` : '/advisory/history'),
    health: () => request('GET', '/api/advisory/health'),
  },

  // Client communication drafts
  drafts: {
    create: (caseId) => request('POST', '/draft', { case_id: caseId }),
  },

  // Review & Approve
  review: {
    list: () => request('GET', '/review/items'),
    takeAction: (itemId, action) => request('POST', `/review/items/${itemId}/action`, { action }),
  },
};
