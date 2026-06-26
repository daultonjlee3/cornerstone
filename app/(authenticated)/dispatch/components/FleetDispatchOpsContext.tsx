"use client";

import type { FleetDispatchBoardData, FleetMetricDelta, FleetTodayViewData } from "@/src/types/fleet";
import { formatCurrency } from "./fleet-dispatch-utils";
import { AnimatedMetric } from "./AnimatedMetric";

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
  const sign = delta.deltaPercent > 0 ? "↑" : "↓";
  return `${sign} ${Math.abs(Math.round(delta.deltaPercent))}% vs yesterday`;
}

function MissionKpi({
  label,
  value,
  hint,
  tone = "default",
  hero = false,
  numeric,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warning" | "operational" | "info";
  hero?: boolean;
  numeric?: number;
}) {
  const valueClass =
    tone === "danger"
      ? "dispatch-mission__kpi-value--danger"
      : tone === "warning"
        ? "dispatch-mission__kpi-value--warning"
        : tone === "operational"
          ? "dispatch-mission__kpi-value--operational"
          : tone === "info"
            ? "dispatch-mission__kpi-value--info"
            : "";

  return (
    <div className={`dispatch-mission__kpi-tile ${hero ? "dispatch-mission__kpi-tile--hero" : ""}`}>
      <p className="dispatch-mission__kpi-label">{label}</p>
      {numeric != null && hero ? (
        <AnimatedMetric
          value={numeric}
          format={(n) => formatCurrency(n)}
          className={`dispatch-mission__kpi-value dispatch-mission__kpi-value--hero ${valueClass}`}
        />
      ) : (
        <p
          className={`dispatch-mission__kpi-value ${hero ? "dispatch-mission__kpi-value--hero" : ""} ${valueClass}`}
        >
          {value}
        </p>
      )}
      {hint ? <p className="dispatch-mission__kpi-hint">{hint}</p> : null}
    </div>
  );
}

/** Level-one mission metrics — today's operational picture. */
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
  const revenueDelta = findDelta(intel, "revenue_at_risk");

  return (
    <div className="dispatch-mission__mission-grid" data-testid="fleet-dispatch-kpi-strip">
      <MissionKpi
        label="Revenue at risk"
        value={revenueAtRisk > 0 ? formatCurrency(revenueAtRisk) : "None"}
        hint={
          formatDeltaHint(revenueDelta) ??
          (jobsWaiting > 0 ? `${jobsWaiting} jobs unassigned` : "Fleet protected")
        }
        tone={revenueAtRisk > 0 ? "danger" : "default"}
        hero
        numeric={revenueAtRisk > 0 ? revenueAtRisk : undefined}
      />
      <MissionKpi
        label="Jobs waiting"
        value={jobsWaiting}
        hint={formatDeltaHint(unassignedDelta) ?? (jobsWaiting > 0 ? "Dispatch inbox" : "Queue clear")}
        tone={jobsWaiting > 0 ? "warning" : "default"}
      />
      <MissionKpi
        label="Recommendations"
        value={recommendationCount}
        hint={formatDeltaHint(recDelta) ?? (recommendationCount > 0 ? "Ready to assign" : "Monitoring")}
        tone={recommendationCount > 0 ? "operational" : "default"}
      />
      <MissionKpi
        label="Available trucks"
        value={availableTrucks}
        hint={`${board.truckLanes.length} in fleet`}
        tone="info"
      />
    </div>
  );
}

/** @deprecated Operational chips merged into status bar for lower cognitive load */
export function FleetDispatchOperationalChips({
  board,
  intel,
}: Pick<FleetDispatchOpsContextProps, "board" | "intel">) {
  void board;
  void intel;
  return null;
}

/** @deprecated Use FleetDispatchKpiStrip */
export function FleetDispatchOpsContext(props: FleetDispatchOpsContextProps) {
  return <FleetDispatchKpiStrip {...props} />;
}
