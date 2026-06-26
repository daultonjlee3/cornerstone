export function hasCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

/** Approximate circle polygon for Mapbox fill layers (meters) */
export function circlePolygon(
  longitude: number,
  latitude: number,
  radiusMeters: number,
  steps = 64
): GeoJSON.Polygon {
  const coordinates: [number, number][] = [];
  const earthRadius = 6378137;
  const latRad = (latitude * Math.PI) / 180;

  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * 2 * Math.PI;
    const latOffset = (radiusMeters / earthRadius) * Math.cos(bearing);
    const lngOffset = (radiusMeters / (earthRadius * Math.cos(latRad))) * Math.sin(bearing);
    coordinates.push([
      longitude + (lngOffset * 180) / Math.PI,
      latitude + (latOffset * 180) / Math.PI,
    ]);
  }

  return { type: "Polygon", coordinates: [coordinates] };
}

export function boundsFromPoints(
  points: Array<{ latitude: number; longitude: number }>
): [number, number, number, number] | null {
  if (points.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.longitude);
    minLat = Math.min(minLat, p.latitude);
    maxLng = Math.max(maxLng, p.longitude);
    maxLat = Math.max(maxLat, p.latitude);
  }
  return [minLng, minLat, maxLng, maxLat];
}
