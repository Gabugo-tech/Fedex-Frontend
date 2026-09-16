const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Fetch tracking info for one or more tracking numbers.
 * @param {string} numbersRaw - comma or space separated tracking numbers
 * @returns {Promise<Array>} array of result objects
 */
export async function fetchTracking(numbersRaw) {
  const encoded = encodeURIComponent(numbersRaw.trim());
  const res = await fetch(`${API_BASE}/api/track?numbers=${encoded}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data.results;
}
