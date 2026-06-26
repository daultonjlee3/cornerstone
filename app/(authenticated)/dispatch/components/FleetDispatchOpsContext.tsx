"use client";

import type { FleetDispatchBoardData, FleetMetricDelta, FleetTodayViewData } from "@/src/types/fleet";
import { KpiCard, StatusChip } from "@/src/components/design-system";
import { formatCurrency } from "./fleet-dispatch-utils";

type FleetDispatchOpsContextProps = {
  board: FleetDispatchBoardData;
  intel: FleetTodayViewData;
  recommendationCount: number;
};

function findDelta(intel: FleetTodayViewData, key: string): FleetMetricDelta | undefined {
  return intel.changesSinceYesterday.find((d) => d.key === key);
}

function formatDeltaHint(delta: FleetMetricDelta | undefined): string | undefined {
  if (!delta || delta.deltaPercent == null) return undefined;
  const sign = delta.deltaPercent > 0 ? "+" : "";
  return `${sign}${Math.round(delta.deltaPercent)}% vs yesterday`;
}

/** Mission control KPI strip + operational status chips */
export function FleetDispatchOpsContext({
  board,
  intel,
  recommendationCount,
}: FleetDispatchOpsContextProps) {
  const criticalCount = intel.exceptions.filter((e) => e.severity === "critical").length;
  const availableTrucks = board.truckLanes.filter(
    (lane) => lane.status === "active" && lane.jobs.length === 0
  ).length;
  const readyUnits = board.truckLanes.filter(
    (lane) => lane.status === "active" && lane.telematics_status !== "offline"
  ).length;
  const offlineUnits = board.truckLanes.filter((lane) => lane.telematics_status === "offline").length;
  const healthyGpsCount = board.truckLanes.filter((lane) => lane.telematics_status !== "offline").length;
  const gpsHealth = board.truckLanes.length
    ? Math.round((healthyGpsCount / board.truckLanes.length) * 100)
    : 100;
  const revenueAtRisk = intel.revenueAtRisk;
  const jobsWaiting = board.unassignedJobs.length;
  const integrationIssues = intel.integrationHealth.filter((c) => c.status !== "healthy").length;

  const unassignedDelta = findDelta(intel, "unassigned_jobs");
  const recDelta = findDelta(intel, "recommendations");

  return (
    <section id="fleet-executive" className="space-y-5" data-testid="fleet-dispatch-executive">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue at risk"
          value={revenueAtRisk > 0 ? formatCurrency(revenueAtRisk) : "None"}
          hint={jobsWaiting > 0 ? "High priority unassigned revenue" : "No revenue exposure"}
          emphasis={revenueAtRisk > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Jobs waiting"
          value={jobsWaiting}
          hint={formatDeltaHint(unassignedDelta) ?? (jobsWaiting > 0 ? "Awaiting assignment" : "Queue clear")}
          emphasis={jobsWaiting > 0 ? "warning" : "success"}
        />
        <KpiCard
          label="Recommendations ready"
          value={recommendationCount}
          hint={formatDeltaHint(recDelta) ?? (recommendationCount > 0 ? "Ready to act" : "Monitoring fleet state")}
          emphasis={recommendationCount > 0 ? "operational" : "default"}
        />
        <KpiCard
          label="Available trucks"
          value={availableTrucks}
          hint={`${readyUnits} ready units · ${board.truckLanes.length} total`}
          emphasis="info"
        />
      </div>

      <div className="dispatch-mission__status-row">
        <StatusChip
          label={criticalCount > 0 ? `${criticalCount} critical alerts` : "No critical alerts"}
          tone={criticalCount > 0 ? "danger" : "success"}
        />
        <StatusChip
          label={offlineUnits > 0 ? `${offlineUnits} offline units` : "All units online"}
          tone={offlineUnits > 0 ? "warning" : "success"}
        />
        <StatusChip
          label={`GPS health ${gpsHealth}%`}
          tone={gpsHealth < 90 ? "warning" : "success"}
        />
        <StatusChip label={`${availableTrucks} available trucks`} tone="operational" />
        <StatusChip label={`${readyUnits} ready units`} tone="info" />
        <StatusChip
          label={
            integrationIssues > 0
              ? `${integrationIssues} integration${integrationIssues === 1 ? "" : "s"} need attention`
              : "Integrations healthy"
          }
          tone={integrationIssues > 0 ? "warning" : "success"}
        />
      </div>
    </section>
  );
}
