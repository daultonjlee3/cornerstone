/** Lightweight grid spatial index for map drag-drop nearest-job lookup. */

export type SpatialPoint = {
  id: string;
  longitude: number;
  latitude: number;
};

const CELL_SIZE = 0.012;

function cellKey(lng: number, lat: number): string {
  return `${Math.floor(lng / CELL_SIZE)}:${Math.floor(lat / CELL_SIZE)}`;
}

export class JobSpatialIndex {
  private cells = new Map<string, SpatialPoint[]>();

  constructor(points: SpatialPoint[]) {
    for (const point of points) {
      const key = cellKey(point.longitude, point.latitude);
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(point);
      else this.cells.set(key, [point]);
    }
  }

  /** Find nearest point within maxDistSq (degrees²). */
  findNearest(lng: number, lat: number, maxDistSq = 0.0004): string | null {
    const cx = Math.floor(lng / CELL_SIZE);
    const cy = Math.floor(lat / CELL_SIZE);
    let bestId: string | null = null;
    let bestDist = maxDistSq;

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const bucket = this.cells.get(`${cx + dx}:${cy + dy}`);
        if (!bucket) continue;
        for (const point of bucket) {
          const dLng = point.longitude - lng;
          const dLat = point.latitude - lat;
          const dist = dLng * dLng + dLat * dLat;
          if (dist < bestDist) {
            bestDist = dist;
            bestId = point.id;
          }
        }
      }
    }

    return bestId;
  }
}

export function buildJobSpatialIndex(
  jobs: Array<{ id: string; site_longitude: number | null; site_latitude: number | null }>
): JobSpatialIndex {
  const points: SpatialPoint[] = [];
  for (const job of jobs) {
    if (job.site_longitude == null || job.site_latitude == null) continue;
    points.push({ id: job.id, longitude: job.site_longitude, latitude: job.site_latitude });
  }
  return new JobSpatialIndex(points);
}
