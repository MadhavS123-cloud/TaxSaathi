// If not set, it will be undefined, so we fallback to an empty string to easily check if it's configured
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const checkBackendHealth = async () => {
  if (!API_BASE_URL) return { ok: false, error: 'API_BASE_URL is not configured.' };
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};
