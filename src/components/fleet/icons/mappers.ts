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
  if (state === "dragging") return "selected";
  return "driving";
}

/** Map job visual states from dispatch to icon statuses */
export function mapJobVisualStatus(state: string): FleetJobStatus {
  const allowed = new Set([
    "scheduled",
    "active",
    "highPriority",
    "emergency",
    "completed",
    "delayed",
    "recommended",
    "selected",
    "waiting",
    "normal",
    "late",
    "risk",
  ]);
  if (allowed.has(state)) return state as FleetJobStatus;
  if (state === "invalid" || state === "dropTarget") return "waiting";
  if (state === "eligible") return "normal";
  return "normal";
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
