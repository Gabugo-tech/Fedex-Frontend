/**
 * Generates a unique tracking number in the format:
 * PLT-YYYY-XXXXXXXX
 *
 * PLT  = PulsTrack brand prefix
 * YYYY = current year
 * XXXX = 8 cryptographically random uppercase alphanumeric characters
 *        (no I, O, 0, 1 to avoid customer confusion)
 *
 * Example: PLT-2026-A4K9BZ2M
 */
export function generateTrackingNumber() {
  const year  = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // Use crypto.getRandomValues for unpredictable tracking numbers
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);

  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars[randomBytes[i] % chars.length];
  }

  return `PLT-${year}-${suffix}`;
}
