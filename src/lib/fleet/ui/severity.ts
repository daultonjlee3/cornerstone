/** Operational severity and confidence styling — shared across Command Center and Dispatch. */

export type FleetSeverity = "critical" | "warning" | "success" | "info" | "neutral";
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

export function fleetChipClass(severity: FleetSeverity): string {
  return `fleet-chip fleet-chip--${severity}`;
}

export function fleetDotClass(severity: FleetSeverity): string {
  return `fleet-status-dot fleet-status-dot--${severity}`;
}

export function fleetPanelSeverityClass(severity: FleetSeverity): string {
  switch (severity) {
    case "critical":
      return "border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.04)]";
    case "warning":
      return "border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.04)]";
    case "success":
      return "border-[rgba(52,211,153,0.18)] bg-[rgba(52,211,153,0.04)]";
    default:
      return "";
  }
}
