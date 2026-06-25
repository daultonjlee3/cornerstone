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

/** Compact operational chips — fleet design tokens */
export function FleetDispatchStatusBar({ items }: FleetDispatchStatusBarProps) {
  if (items.length === 0) return null;

  const primary = items.find((i) => i.severity === "critical") ?? items[0];
  const secondary = items.filter((i) => i.id !== primary.id);

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-1" data-testid="fleet-dispatch-status-bar">
      <button
        type="button"
        onClick={() => scrollToSection(primary.targetId)}
        className="fleet-chip fleet-chip--neutral flex items-center gap-2 px-3 py-1.5 text-left transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-default)]"
      >
        <span className={fleetDotClass(dispatchSeverityToFleet(primary.severity))} />
        <span className="text-xs font-semibold text-[var(--foreground)]">{primary.label}</span>
        {primary.detail ? (
          <span className="hidden text-[11px] text-[var(--muted)] sm:inline">· {primary.detail}</span>
        ) : null}
      </button>

      {secondary.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollToSection(item.targetId)}
          className="fleet-chip fleet-chip--neutral flex shrink-0 items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium transition hover:border-[var(--accent)]/30 hover:bg-[var(--surface-default)]"
        >
          <span className={fleetDotClass(dispatchSeverityToFleet(item.severity))} />
          {item.label}
        </button>
      ))}
    </div>
  );
}
