import type { FleetIconSize } from "./tokens";

export type FleetTruckStatus =
  | "available"
  | "driving"
  | "working"
  | "idle"
  | "offline"
  | "recommended"
  | "selected"
  | "critical"
  | "highRevenue"
  | "maintenance"
  | "inspection"
  | "fuel"
  | "busy";

export type FleetJobStatus =
  | "scheduled"
  | "active"
  | "highPriority"
  | "emergency"
  | "completed"
  | "delayed"
  | "recommended"
  | "selected"
  | "waiting"
  | "normal"
  | "late"
  | "risk";

export type FleetBadgeType =
  | "pm"
  | "fuel"
  | "inspection"
  | "alert"
  | "highRevenue"
  | "critical"
  | "gpsLost";

export type FleetMarkerBaseProps = {
  size?: FleetIconSize;
  selected?: boolean;
  recommended?: boolean;
  heading?: number | null;
  animated?: boolean;
  className?: string;
};

export type FleetTruckProps = FleetMarkerBaseProps & {
  status?: FleetTruckStatus;
  badge?: FleetBadgeType;
  unitLabel?: string;
  dimmed?: boolean;
  color?: string;
};

export type FleetJobProps = FleetMarkerBaseProps & {
  status?: FleetJobStatus;
  priority?: "default" | "high" | "urgent";
  color?: string;
};

export type FleetClusterProps = {
  count: number;
  kind?: "truck" | "job" | "mixed";
  size?: FleetIconSize;
};
