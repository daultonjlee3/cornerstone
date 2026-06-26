import type { FleetBadgeType, FleetJobStatus, FleetTruckStatus } from "./types";

/** Map truck visual states from dispatch to icon statuses */
export function mapTruckVisualStatus(state: string): FleetTruckStatus {
  const allowed = new Set([
    "available",
    "driving",
    "working",
    "idle",
    "offline",
    "recommended",
    "selected",
    "critical",
    "highRevenue",
    "busy",
  ]);
  if (allowed.has(state)) return state as FleetTruckStatus;
  return "driving";
}

/** Map job visual states from dispatch to icon statuses */
export function mapJobVisualStatus(state: string): FleetJobStatus {
  return state as FleetJobStatus;
}

/** Derive optional status badge from truck lane telemetry */
export function truckBadgeFromLane(lane: {
  telematics_status?: string;
  status?: string;
  maintenance_note?: string | null;
  fuel_level_pct?: number | null;
  revenue_today?: number;
}): FleetBadgeType | undefined {
  if (lane.telematics_status === "offline") return "gpsLost";
  if (lane.status === "maintenance" || lane.maintenance_note) return "pm";
  if (lane.fuel_level_pct != null && lane.fuel_level_pct < 20) return "fuel";
  return undefined;
}
