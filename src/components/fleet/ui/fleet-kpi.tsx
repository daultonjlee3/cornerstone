import type { LucideIcon } from "lucide-react";
import type { FleetSeverity } from "@/src/lib/fleet/ui/severity";
import { fleetDotClass } from "@/src/lib/fleet/ui/severity";

type FleetKpiProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { label: string; tone?: FleetSeverity };
  icon?: LucideIcon;
  emphasis?: FleetSeverity | "default";
  className?: string;
};

export function FleetKpi({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  emphasis = "default",
  className = "",
}: FleetKpiProps) {
  const emphasisBorder =
    emphasis === "critical"
      ? "border-[rgba(248,113,113,0.2)]"
      : emphasis === "warning"
        ? "border-[rgba(251,191,36,0.18)]"
        : emphasis === "success"
          ? "border-[rgba(52,211,153,0.18)]"
          : emphasis === "info"
            ? "border-[rgba(96,165,250,0.18)]"
            : "";

  return (
    <div className={`fleet-panel px-4 py-3.5 ${emphasisBorder} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="fleet-kpi-label">{label}</p>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-[var(--muted)]" strokeWidth={1.5} aria-hidden />
        ) : null}
      </div>
      <p className="fleet-kpi-value mt-2">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
      {trend ? (
        <span className={`fleet-chip mt-2.5 ${trend.tone ? `fleet-chip--${trend.tone}` : "fleet-chip--neutral"}`}>
          {trend.tone && trend.tone !== "neutral" ? (
            <span className={fleetDotClass(trend.tone)} aria-hidden />
          ) : null}
          {trend.label}
        </span>
      ) : null}
    </div>
  );
}
