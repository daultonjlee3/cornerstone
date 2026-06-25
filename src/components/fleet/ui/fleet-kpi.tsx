import type { LucideIcon } from "lucide-react";
import { KpiCard } from "@/src/components/design-system";
import type { KpiEmphasis } from "@/src/components/design-system/types";

type FleetKpiEmphasis = KpiEmphasis | "critical";

type FleetKpiProps = {
  label: string;
  value: string | number;
  hint?: string;
  trend?: { label: string; tone?: KpiEmphasis };
  icon?: LucideIcon;
  emphasis?: FleetKpiEmphasis;
  className?: string;
};

function resolveEmphasis(emphasis: FleetKpiEmphasis): KpiEmphasis {
  return emphasis === "critical" ? "danger" : emphasis;
}

/** @deprecated Use KpiCard from design-system. */
export function FleetKpi({ emphasis = "default", ...props }: FleetKpiProps) {
  return <KpiCard {...props} emphasis={resolveEmphasis(emphasis)} />;
}

export type { KpiEmphasis };
