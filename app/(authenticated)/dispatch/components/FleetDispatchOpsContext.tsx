"use client";

import type { FleetDispatchBoardData, FleetMetricDelta, FleetTodayViewData } from "@/src/types/fleet";
import { StatusChip } from "@/src/components/design-system";
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

function KpiTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "operational" | "info";
}) {
  const valueClass =
    tone === "danger"
      ? "text-[var(--status-danger)]"
      : tone === "warning"
        ? "text-[var(--status-warning)]"
        : tone === "operational"
          ? "text-[var(--brand-operational)]"
          : tone === "info"
            ? "text-[var(--status-info)]"
            : "text-[var(--text-primary)]";

  return (
    <div className="dispatch-mission__kpi-tile">
      <p className="dispatch-mission__kpi-label">{label}</p>
      <p className={`dispatch-mission__kpi-value ${valueClass}`}>{value}</p>
      {hint ? <p className="dispatch-mission__kpi-hint">{hint}</p> : null}
    </div>
  );
}

/** Compact KPI strip for the command band (inline with title and controls). */
export function FleetDispatchKpiStrip({
  board,
  intel,
  recommendationCount,
}: FleetDispatchOpsContextProps) {
  const availableTrucks = board.truckLanes.filter(
    (lane) => lane.status === "active" && lane.jobs.length === 0
  ).length;
  const revenueAtRisk = intel.revenueAtRisk;
  const jobsWaiting = board.unassignedJobs.length;
  const unassignedDelta = findDelta(intel, "unassigned_jobs");
  const recDelta = findDelta(intel, "recommendations");

  return (
    <div className="dispatch-mission__kpi-strip" data-testid="fleet-dispatch-kpi-strip">
      <KpiTile
        label="Revenue at risk"
        value={revenueAtRisk > 0 ? formatCurrency(revenueAtRisk) : "None"}
        hint={jobsWaiting > 0 ? "High priority" : undefined}
        tone={revenueAtRisk > 0 ? "danger" : "default"}
      />
      <KpiTile
        label="Jobs waiting"
        value={jobsWaiting}
        hint={formatDeltaHint(unassignedDelta) ?? (jobsWaiting > 0 ? "Awaiting assignment" : "Queue clear")}
        tone={jobsWaiting > 0 ? "warning" : "default"}
      />
      <KpiTile
        label="Recommendations"
        value={recommendationCount}
        hint={formatDeltaHint(recDelta) ?? (recommendationCount > 0 ? "Ready to act" : "Monitoring")}
        tone={recommendationCount > 0 ? "operational" : "default"}
      />
      <KpiTile
        label="Available trucks"
        value={availableTrucks}
        hint={`${board.truckLanes.length} in fleet`}
        tone="info"
      />
    </div>
  );
}

/** Operational status chips beneath the command band KPI row. */
export function FleetDispatchOperationalChips({
  board,
  intel,
}: Pick<FleetDispatchOpsContextProps, "board" | "intel">) {
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
  const maxBranchUtil = board.branchCapacity.reduce((max, b) => Math.max(max, b.utilization), 0);
  const integrationIssues = intel.integrationHealth.filter((c) => c.status !== "healthy").length;

  return (
    <div className="dispatch-mission__status-row" data-testid="fleet-dispatch-executive">
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
      <StatusChip
        label={`Peak branch ${Math.round(maxBranchUtil * 100)}%`}
        tone={maxBranchUtil >= 1 ? "danger" : maxBranchUtil >= 0.8 ? "warning" : "neutral"}
      />
      <StatusChip label={`${availableTrucks} available trucks`} tone="operational" />
      <StatusChip label={`${readyUnits} ready units`} tone="info" />
      <StatusChip
        label={
          integrationIssues > 0
            ? `${integrationIssues} integration issue${integrationIssues === 1 ? "" : "s"}`
            : "Integrations healthy"
        }
        tone={integrationIssues > 0 ? "warning" : "success"}
      />
    </div>
  );
}

/** @deprecated Use FleetDispatchKpiStrip + FleetDispatchOperationalChips */
export function FleetDispatchOpsContext(props: FleetDispatchOpsContextProps) {
  return (
    <section className="space-y-3">
      <FleetDispatchKpiStrip {...props} />
      <FleetDispatchOperationalChips board={props.board} intel={props.intel} />
    </section>
  );
}
