const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function authFetch(url, options = {}, token) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export const getShipments      = (token) => authFetch('/api/admin/shipments', {}, token);
export const getShipment       = (id, token) => authFetch(`/api/admin/shipments/${id}`, {}, token);
export const createShipment    = (body, token) => authFetch('/api/admin/shipments', { method: 'POST', body: JSON.stringify(body) }, token);
export const updateShipment    = (id, body, token) => authFetch(`/api/admin/shipments/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
export const deleteShipment    = (id, token) => authFetch(`/api/admin/shipments/${id}`, { method: 'DELETE' }, token);
export const updateLocation    = (id, body, token) => authFetch(`/api/admin/shipments/${id}/location`, { method: 'PUT', body: JSON.stringify(body) }, token);
export const addEvent          = (id, body, token) => authFetch(`/api/admin/shipments/${id}/events`, { method: 'POST', body: JSON.stringify(body) }, token);
export const deleteEvent       = (id, token) => authFetch(`/api/admin/events/${id}`, { method: 'DELETE' }, token);
export const uploadImage       = (id, body, token) => authFetch(`/api/admin/shipments/${id}/image`, { method: 'POST', body: JSON.stringify(body) }, token);
export const deleteImage       = (id, token) => authFetch(`/api/admin/shipments/${id}/image`, { method: 'DELETE' }, token);
