"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleOff,
  MapPinOff,
  Navigation,
  SatelliteDish,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { AppIcon } from "./app-icon";
import { IconChip } from "./icon-chip";
import type { AppIconIntent, OperationalStatus, StatusIconProps } from "./types";

type StatusConfig = {
  icon: LucideIcon;
  intent: AppIconIntent;
  chipVariant: "success" | "warning" | "danger" | "muted" | "fleet" | "default";
  label: string;
};

const STATUS_CONFIG: Record<OperationalStatus, StatusConfig> = {
  available: { icon: CheckCircle2, intent: "success", chipVariant: "success", label: "Available" },
  working: { icon: Wrench, intent: "info", chipVariant: "fleet", label: "Working" },
  en_route: { icon: Navigation, intent: "operational", chipVariant: "fleet", label: "En route" },
  idle: { icon: Circle, intent: "muted", chipVariant: "muted", label: "Idle" },
  offline: { icon: CircleOff, intent: "muted", chipVariant: "muted", label: "Offline" },
  critical: { icon: AlertTriangle, intent: "danger", chipVariant: "danger", label: "Critical" },
  warning: { icon: AlertTriangle, intent: "warning", chipVariant: "warning", label: "Warning" },
  healthy: { icon: CheckCircle2, intent: "success", chipVariant: "success", label: "Healthy" },
  gps_delayed: { icon: SatelliteDish, intent: "warning", chipVariant: "warning", label: "GPS delayed" },
  gps_offline: { icon: MapPinOff, intent: "danger", chipVariant: "danger", label: "GPS offline" },
};

export function StatusIcon({
  status,
  size = "sm",
  chip = false,
  className = "",
  label,
}: StatusIconProps) {
  const config = STATUS_CONFIG[status];
  const accessibleLabel = label ?? config.label;

  if (chip) {
    return (
      <IconChip
        icon={config.icon}
        variant={config.chipVariant}
        size="sm"
        className={className}
        label={accessibleLabel}
      />
    );
  }

  return (
    <AppIcon
      icon={config.icon}
      size={size}
      intent={config.intent}
      className={className}
      aria-hidden={!accessibleLabel}
      aria-label={accessibleLabel}
    />
  );
}

/** Map legacy truck status strings to operational status keys. */
export function truckStatusToOperational(status: string): OperationalStatus {
  switch (status) {
    case "available":
      return "available";
    case "working":
      return "working";
    case "driving":
    case "en_route":
      return "en_route";
    case "idle":
    case "busy":
      return "idle";
    case "offline":
      return "offline";
    case "critical":
      return "critical";
    default:
      return "idle";
  }
}
