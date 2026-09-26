/**
 * Shared map math utilities — great-circle interpolation.
 * Both TrackingMap.jsx (animated plane) and ResultCard.jsx (live location label)
 * use the same algorithm so they stay in sync.
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

/**
 * Great-circle (spherical slerp) interpolation — matches TrackingMap's buildGreatCircleArc.
 * Returns the lat/lng at fraction `frac` (0=origin, 1=destination) along the great-circle path.
 */
export function interpolatePosition(originLat, originLng, destLat, destLng, frac) {
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;

  const φ1 = toRad(originLat), λ1 = toRad(originLng);
  const φ2 = toRad(destLat),   λ2 = toRad(destLng);

  const x1 = Math.cos(φ1) * Math.cos(λ1);
  const y1 = Math.cos(φ1) * Math.sin(λ1);
  const z1 = Math.sin(φ1);

  const x2 = Math.cos(φ2) * Math.cos(λ2);
  const y2 = Math.cos(φ2) * Math.sin(λ2);
  const z2 = Math.sin(φ2);

  const dot   = Math.min(1, Math.max(-1, x1*x2 + y1*y2 + z1*z2));
  const omega = Math.acos(dot);

  if (omega < 0.001) {
    // Points are essentially the same — linear interpolation
    return {
      lat: originLat + (destLat - originLat) * frac,
      lng: originLng + (destLng - originLng) * frac,
    };
  }

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - frac) * omega) / sinOmega;
  const b = Math.sin(frac * omega) / sinOmega;

  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;

  return {
    lat: toDeg(Math.atan2(z, Math.sqrt(x*x + y*y))),
    lng: toDeg(Math.atan2(y, x)),
  };
}
