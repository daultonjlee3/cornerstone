/** Operational severity styling — delegates to design-system StatusChip. */

import { fleetLegacySeverityToTone } from "@/src/components/design-system/chip-maps";
import { statusChipClass, statusDotClass } from "@/src/components/design-system/status-chip";
import type { ChipTone } from "@/src/components/design-system/types";

export type FleetSeverity = "critical" | "warning" | "success" | "info" | "neutral" | "accent";
export type FleetConfidence = "high" | "medium" | "low";

export function severityToFleetSeverity(
  severity: "critical" | "warning" | "info" | string
): FleetSeverity {
  switch (severity) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "neutral";
  }
}

export function confidenceToFleetSeverity(confidence: FleetConfidence): FleetSeverity {
  switch (confidence) {
    case "high":
      return "success";
    case "medium":
      return "warning";
    default:
      return "neutral";
  }
}

function toTone(severity: FleetSeverity): ChipTone {
  return fleetLegacySeverityToTone(severity);
}

export function fleetChipClass(severity: FleetSeverity): string {
  return statusChipClass(toTone(severity));
}

export function fleetDotClass(severity: FleetSeverity): string {
  return statusDotClass(toTone(severity));
}

export function fleetPanelSeverityClass(severity: FleetSeverity): string {
  switch (severity) {
    case "critical":
      return "border-[color-mix(in_srgb,var(--status-danger)_20%,transparent)] bg-[var(--status-danger-subtle)]";
    case "warning":
      return "border-[color-mix(in_srgb,var(--status-warning)_20%,transparent)] bg-[var(--status-warning-subtle)]";
    case "success":
      return "border-[color-mix(in_srgb,var(--status-success)_20%,transparent)] bg-[var(--status-success-subtle)]";
    default:
      return "";
  }
}
