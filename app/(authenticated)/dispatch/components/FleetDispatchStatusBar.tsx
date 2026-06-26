"use client";

import type { DispatchStatusItem } from "./fleet-dispatch-utils";
import { scrollToSection } from "./fleet-dispatch-utils";
import type { FleetSeverity } from "@/src/lib/fleet/ui/severity";
import { fleetDotClass } from "@/src/lib/fleet/ui/severity";

type FleetDispatchStatusBarProps = {
  items: DispatchStatusItem[];
};

function dispatchSeverityToFleet(severity: DispatchStatusItem["severity"]): FleetSeverity {
  switch (severity) {
    case "critical":
      return "critical";
    case "warning":
      return "warning";
    case "healthy":
      return "success";
    case "opportunity":
      return "info";
    default:
      return "neutral";
  }
}

function chipTone(severity: DispatchStatusItem["severity"]): string {
  switch (severity) {
    case "critical":
      return "fleet-chip--critical";
    case "warning":
      return "fleet-chip--warning";
    case "opportunity":
      return "fleet-chip--accent";
    case "healthy":
      return "fleet-chip--success";
    default:
      return "fleet-chip--neutral";
  }
}

/** Operational alert chips — scroll to relevant workspace section */
export function FleetDispatchStatusBar({ items }: FleetDispatchStatusBarProps) {
  if (items.length === 0) return null;

  return (
    <div className="dispatch-mission__status-row" data-testid="fleet-dispatch-status-bar">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSection(item.targetId)}
          className={`fleet-chip ${chipTone(item.severity)} transition hover:brightness-110`}
        >
          <span className={fleetDotClass(dispatchSeverityToFleet(item.severity))} />
          <span className="font-semibold">{item.label}</span>
          {item.detail ? (
            <span className="hidden text-[var(--text-muted)] sm:inline">· {item.detail}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
