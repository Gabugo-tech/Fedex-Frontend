/**
 * Generates a unique tracking number in the format:
 * GBT-YYYY-XXXXXXXX
 *
 * GBT   = brand prefix (GabugoTech)
 * YYYY  = current year
 * XXXX  = 8 random uppercase alphanumeric characters
 *
 * Example: GBT-2026-A4K9BZ2M
 */
export function generateTrackingNumber() {
  const year    = new Date().getFullYear();
  const chars   = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion
  const length  = 8;
  let suffix    = '';

  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `GBT-${year}-${suffix}`;
}
