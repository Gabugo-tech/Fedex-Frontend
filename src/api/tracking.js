const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Fix #2: retry with exponential backoff to handle Render cold starts
async function fetchWithRetry(url, options = {}, retries = 3, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      return res;
    } catch (err) {
      const isLastAttempt = attempt === retries;
      const isNetworkError = err.message === 'Failed to fetch' || err.name === 'TypeError';

      if (isLastAttempt || !isNetworkError) throw err;

      // Wait before retrying (2s, 4s, 8s)
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

/**
 * Fetch tracking info for one or more tracking numbers.
 * @param {string} numbersRaw - comma or space separated tracking numbers
 * @returns {Promise<Array>} array of result objects
 */
export async function fetchTracking(numbersRaw) {
  const encoded = encodeURIComponent(numbersRaw.trim());
  const res = await fetchWithRetry(`${API_BASE}/api/track?numbers=${encoded}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Unknown error');
  return data.results;
}
