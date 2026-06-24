import Link from "next/link";
import { Truck, Clock, ClipboardList, DollarSign, Percent } from "lucide-react";
import { MetricCard } from "@/src/components/ui/metric-card";
import type { FleetCommandCenterData } from "@/src/types/fleet";
import { DashboardSectionEmpty } from "../../dashboard/components/dashboard-section-empty";

type FleetCommandCenterSectionProps = {
  data: FleetCommandCenterData;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function FleetCommandCenterSection({ data }: FleetCommandCenterSectionProps) {
  const hasMartData = data.utilizationPercent != null || (data.revenuePerTruckMtd ?? 0) > 0;

  return (
    <section className="space-y-4" data-testid="fleet-command-center">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Fleet Command Center</h2>
        <p className="text-sm text-[var(--muted)]">
          Morning briefing — utilization, idle trucks, and revenue signals from fleet marts.
        </p>
        <Link
          href="/dispatch"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Open dispatch board →
        </Link>
      </div>

      {!hasMartData ? (
        <DashboardSectionEmpty
          message="Fleet utilization data is not available yet."
          subtext="Run a mart refresh after telematics and jobs are ingested, or wait for the nightly cron."
          cta={{ label: "View integrations", href: "/settings/integrations" }}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Utilization Today"
          value={data.utilizationPercent != null ? `${data.utilizationPercent.toFixed(1)}%` : "—"}
          description="Billable hours / total hours (mart)"
          icon={Percent}
        />
        <MetricCard
          title="Active Trucks"
          value={data.activeTrucks}
          description="Receiving telematics within 10 min"
          icon={Truck}
          variant="success"
        />
        <MetricCard
          title="Idle Trucks"
          value={data.idleTrucks}
          description="Stale or offline telematics"
          icon={Clock}
          variant={data.idleTrucks > 0 ? "danger" : "default"}
        />
        <MetricCard
          title="Jobs Today"
          value={data.jobsToday}
          description={`${data.unassignedJobs} unassigned`}
          icon={ClipboardList}
        />
        <MetricCard
          title="Revenue / Truck MTD"
          value={
            data.revenuePerTruckMtd != null ? formatCurrency(data.revenuePerTruckMtd) : "—"
          }
          description={`${data.truckCount} active truck${data.truckCount === 1 ? "" : "s"}`}
          icon={DollarSign}
        />
      </div>
    </section>
  );
}
