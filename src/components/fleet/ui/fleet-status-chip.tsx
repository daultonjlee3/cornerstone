import type { ReactNode } from "react";
import { EmptyState, StatusChip } from "@/src/components/design-system";
import { fleetLegacySeverityToTone } from "@/src/components/design-system/chip-maps";
import type { ChipTone } from "@/src/components/design-system/types";

/** @deprecated Use ChipTone from design-system */
export type FleetSeverity = "critical" | "warning" | "success" | "info" | "neutral" | "accent";

type FleetStatusChipProps = {
  label: string;
  severity?: FleetSeverity;
  showDot?: boolean;
  className?: string;
};

export function FleetStatusChip({
  label,
  severity = "neutral",
  showDot = true,
  className = "",
}: FleetStatusChipProps) {
  const tone: ChipTone = fleetLegacySeverityToTone(severity);
  return <StatusChip label={label} tone={tone} showDot={showDot} className={className} />;
}

type FleetEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

/** @deprecated Use EmptyState from design-system. */
export function FleetEmptyState(props: FleetEmptyStateProps) {
  return <EmptyState {...props} />;
}
