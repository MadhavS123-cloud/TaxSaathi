/**
 * useAuth.js — single source of truth for the TaxSaathi JWT.
 *
 * The token is a HS256 JWT with claims: sub (email), iat, exp.
 * All functions are plain exports (not a React hook) so they can be
 * called from both components and api.ts without hook rules.
 *
 * isAuthenticated() decodes the JWT exp claim CLIENT-SIDE to detect
 * expiry before a network request is even made. This does NOT replace
 * server-side verification — it only improves UX by redirecting early.
 */

const TOKEN_KEY = 'taxsaathi_token';

/** Persist the JWT to localStorage. */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Retrieve the raw JWT string, or null if not set. */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the JWT (logout). */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decode the JWT payload without verification.
 * Verification happens on the backend; this is only for client-side UX.
 */
function _decodePayload(token) {
  try {
    const base64 = token.split('.')[1];
    // atob doesn't handle URL-safe base64 — replace chars first.
    const padded = base64.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Return true if a non-expired JWT is present in localStorage.
 * Compares exp (seconds) against Date.now() (milliseconds).
 */
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  const payload = _decodePayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 > Date.now();
}

/**
 * Return the authenticated user's email from the JWT sub claim,
 * or null if there is no valid token.
 */
export function getEmail() {
  const token = getToken();
  if (!token) return null;
  const payload = _decodePayload(token);
  return payload?.sub ?? null;
}
