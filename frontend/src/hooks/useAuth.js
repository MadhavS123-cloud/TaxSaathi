/**
 * src/hooks/useAuth.js - Re-exports session helpers from src/lib/api.js.
 */
export {
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  getFirm,
  setFirm,
  isAuthenticated,
} from '../lib/api';

import { getUser } from '../lib/api';

export function getEmail() {
  const user = getUser();
  return user?.email || null;
}
