/** Bearing in degrees (0 = north, clockwise) between two WGS84 points. */
export function bearingDegrees(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): number | null {
  const dLat = to.latitude - from.latitude;
  const dLon = to.longitude - from.longitude;
  if (Math.abs(dLat) < 1e-7 && Math.abs(dLon) < 1e-7) return null;

  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function midpoint(
  a: [number, number],
  b: [number, number]
): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
