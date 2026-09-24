/**
 * Shared map math utilities used by both TrackingMap.jsx and ResultCard.jsx.
 * Keeping them in one place ensures the plane position and the
 * "Current Location" label stay in sync.
 */

/** Journey fraction (0..1) based on real-time clock */
export function getJourneyFraction(pickupTime, deliveryTime) {
  if (!pickupTime || !deliveryTime) return null;
  const now   = Date.now();
  const start = new Date(pickupTime).getTime();
  const end   = new Date(deliveryTime).getTime();
  if (isNaN(start) || isNaN(end) || end - start <= 0) return null;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

/** Quadratic bezier interpolation matching TrackingMap's buildArc */
export function interpolatePosition(originLat, originLng, destLat, destLng, frac) {
  const midLat  = (originLat + destLat) / 2;
  const midLng  = (originLng + destLng) / 2;
  const dist    = Math.hypot(destLat - originLat, destLng - originLng);
  const curveH  = dist * 0.18;
  const dx = destLat - originLat, dy = destLng - originLng;
  const len = Math.hypot(dx, dy) || 1;
  const ctrlLat = midLat + (dy / len) * curveH;
  const ctrlLng = midLng - (dx / len) * curveH;
  const t = frac;
  return {
    lat: (1-t)*(1-t)*originLat + 2*(1-t)*t*ctrlLat + t*t*destLat,
    lng: (1-t)*(1-t)*originLng + 2*(1-t)*t*ctrlLng + t*t*destLng,
  };
}
