import type { LucideIcon } from "lucide-react";
import type { KpiEmphasis } from "../types";

export type AppIconSize = "xs" | "sm" | "md" | "lg";

export type AppIconIntent =
  | "default"
  | "muted"
  | "operational"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "ai";

export type IconChipVariant =
  | "default"
  | "active"
  | "muted"
  | "warning"
  | "danger"
  | "success"
  | "ai"
  | "fleet";

export type IconChipSize = "sm" | "md" | "lg";

export type OperationalStatus =
  | "available"
  | "working"
  | "en_route"
  | "idle"
  | "offline"
  | "critical"
  | "warning"
  | "healthy"
  | "gps_delayed"
  | "gps_offline";

export type MapLayerName =
  | "trucks"
  | "jobs"
  | "recommendations"
  | "routes"
  | "branches"
  | "capacity"
  | "deadhead"
  | "traffic"
  | "heatmap"
  | "dispatch"
  | "ai"
  | "revenue"
  | "gps";

export type AppIconProps = {
  icon: LucideIcon;
  size?: AppIconSize;
  strokeWidth?: number;
  intent?: AppIconIntent;
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
};

export type IconChipProps = {
  icon: LucideIcon;
  variant?: IconChipVariant;
  size?: IconChipSize;
  glow?: boolean;
  className?: string;
  label?: string;
};

export type MetricIconProps = {
  icon: LucideIcon;
  prominent?: boolean;
  emphasis?: KpiEmphasis;
  className?: string;
};

export type StatusIconProps = {
  status: OperationalStatus;
  size?: AppIconSize;
  chip?: boolean;
  className?: string;
  label?: string;
};

export type MapLayerIconProps = {
  layer: MapLayerName;
  size?: AppIconSize;
  className?: string;
};

export const APP_ICON_SIZE_PX: Record<AppIconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
};

export const ICON_CHIP_SIZE_PX: Record<IconChipSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};
