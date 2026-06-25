import type { ReactNode } from "react";
import type { FleetSeverity } from "@/src/lib/fleet/ui/severity";
import { fleetChipClass, fleetDotClass } from "@/src/lib/fleet/ui/severity";

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
  return (
    <span className={`${fleetChipClass(severity)} ${className}`}>
      {showDot ? <span className={fleetDotClass(severity)} aria-hidden /> : null}
      {label}
    </span>
  );
}

type FleetEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function FleetEmptyState({ icon, title, description, action }: FleetEmptyStateProps) {
  return (
    <div className="fleet-empty">
      {icon ? <div className="text-[var(--muted)]">{icon}</div> : null}
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {description ? <p className="max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
