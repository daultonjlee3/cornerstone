/** Cornerstone Fleet Intelligence — icon design tokens */

export const FLEET_ICON_SIZES = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 48,
} as const;

export type FleetIconSize = keyof typeof FLEET_ICON_SIZES | number;

export function resolveIconSize(size: FleetIconSize = "sm"): number {
  return typeof size === "number" ? size : FLEET_ICON_SIZES[size];
}

/** Status palette — tuned for dark tactical maps */
export const FLEET_TRUCK_COLORS = {
  available: "#2dd4bf",
  driving: "#f97316",
  working: "#60a5fa",
  idle: "#94a3b8",
  offline: "#475569",
  recommended: "#ffffff",
  selected: "#2dd4bf",
  critical: "#f87171",
  highRevenue: "#4ade80",
  maintenance: "#fb923c",
  inspection: "#a78bfa",
  fuel: "#fbbf24",
  busy: "#f97316",
} as const;

export const FLEET_JOB_COLORS = {
  scheduled: "#9aa4b2",
  active: "#60a5fa",
  highPriority: "#fbbf24",
  emergency: "#f87171",
  completed: "#4ade80",
  delayed: "#fb923c",
  recommended: "#f97316",
  selected: "#2dd4bf",
  waiting: "#c5cdd8",
  normal: "#8b95a5",
  late: "#f87171",
  risk: "#f87171",
} as const;

export const FLEET_FACILITY_COLORS = {
  branch: "#60a5fa",
  site: "#2dd4bf",
  yard: "#94a3b8",
  depot: "#a78bfa",
} as const;

export const FLEET_OPS_COLORS = {
  dispatch: "#2dd4bf",
  recommendation: "#f97316",
  ai: "#a78bfa",
  route: "#38bdf8",
  deadhead: "#94a3b8",
  revenue: "#4ade80",
  capacity: "#60a5fa",
  alert: "#f87171",
  warning: "#fbbf24",
  gps: "#2dd4bf",
  traffic: "#f97316",
} as const;

export const FLEET_BADGE_COLORS = {
  pm: "#fb923c",
  fuel: "#fbbf24",
  inspection: "#a78bfa",
  alert: "#f87171",
  highRevenue: "#4ade80",
  critical: "#ef4444",
  gpsLost: "#ef4444",
} as const;
