import { getToken, clearToken } from '../hooks/useAuth';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/** Redirect to /login and clear the stored token on 401. */
function handleUnauthorized(): void {
  clearToken();
  window.location.href = '/login';
}

/**
 * Build the Authorization header from the stored JWT.
 * Returns an empty object if no token is present (public routes).
 */
function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────

  auth: {
    /**
     * Exchange a Google ID token (credential from the GoogleLogin component)
     * for a TaxSaathi JWT.
     */
    google: async (credential: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || `Auth failed: ${response.status}`);
      }
      return response.json(); // { access_token, token_type, email }
    },
  },

  // ── Extract ───────────────────────────────────────────────────────────────

  extractDocument: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/extract`, {
        method: 'POST',
        headers: { ...authHeader() },
        body: formData,
      });

      if (response.status === 401) { handleUnauthorized(); return; }

      if (!response.ok) {
        throw new Error(`Extraction failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('API Error in extractDocument:', err);
      return { success: false, error: String(err) };
    }
  },

  // ── Reconciliation ────────────────────────────────────────────────────────

  reconcileLedger: async (
    invoiceFile: File,
    paymentFile: File,
    dateToleranceDays: number = 3,
    amountTolerance: number = 1.0,
  ) => {
    try {
      const formData = new FormData();
      formData.append('invoice_file', invoiceFile);
      formData.append('payment_file', paymentFile);
      formData.append('date_tolerance_days', String(dateToleranceDays));
      formData.append('amount_tolerance', String(amountTolerance));

      const response = await fetch(`${API_BASE_URL}/reconciliation/run`, {
        method: 'POST',
        headers: { ...authHeader() },
        body: formData,
      });

      if (response.status === 401) { handleUnauthorized(); return; }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Reconciliation failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('API Error in reconcileLedger:', err);
      return { success: false, error: String(err) };
    }
  },

  // ── Advisory ──────────────────────────────────────────────────────────────

  askAdvisory: async (query: string, topK: number = 3) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/advisory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ query, top_k: topK }),
      });

      if (response.status === 401) { handleUnauthorized(); return; }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Advisory query failed with status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('API Error in askAdvisory:', err);
      return { success: false, error: String(err) };
    }
  },

  // ── Advisory health ───────────────────────────────────────────────────────

  checkAdvisoryHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/advisory/health`, {
        headers: { ...authHeader() },
      });
      if (response.status === 401) { handleUnauthorized(); return; }
      return await response.json();
    } catch (err) {
      console.error('API Error checking advisory health:', err);
      return { status: 'error', message: String(err) };
    }
  },
};
