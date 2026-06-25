"use client";

import type { FleetDispatchBoardData, FleetTodayViewData } from "@/src/types/fleet";
import { formatCurrency } from "./fleet-dispatch-utils";

type FleetDispatchOpsContextProps = {
  board: FleetDispatchBoardData;
  intel: FleetTodayViewData;
  recommendationCount: number;
};

/** Single-line executive awareness — supports dispatch, does not compete with the workspace */
export function FleetDispatchOpsContext({
  board,
  intel,
  recommendationCount,
}: FleetDispatchOpsContextProps) {
  const criticalCount = intel.exceptions.filter((e) => e.severity === "critical").length;
  const maxBranchUtil = board.branchCapacity.reduce((max, b) => Math.max(max, b.utilization), 0);
  const activeTrucks =
    intel.commandCenter.activeTrucks ??
    board.truckLanes.filter((l) => l.status === "active").length;
  const availableTrucks = board.truckLanes.filter(
    (lane) => lane.status === "active" && lane.jobs.length === 0
  ).length;
  const offlineUnits = board.truckLanes.filter((lane) => lane.telematics_status === "offline").length;
  const healthyGpsCount = board.truckLanes.filter((lane) => lane.telematics_status !== "offline").length;
  const gpsHealth = board.truckLanes.length
    ? Math.round((healthyGpsCount / board.truckLanes.length) * 100)
    : 100;
  const revenueAtRisk = intel.revenueAtRisk;
  const jobsWaiting = board.unassignedJobs.length;

  return (
    <section
      id="fleet-executive"
      className="space-y-2.5"
      data-testid="fleet-dispatch-executive"
    >
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/78 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Revenue at risk</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--status-danger)]">
            {revenueAtRisk > 0 ? formatCurrency(revenueAtRisk) : "None"}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/78 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Jobs waiting</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--foreground)]">
            {jobsWaiting}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-[var(--surface-border-subtle)] bg-[var(--surface-default)]/78 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Recommendations</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-[var(--status-info)]">
            {recommendationCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <MetricChip
          label="Critical alerts"
          value={criticalCount}
          tone={criticalCount > 0 ? "danger" : "neutral"}
        />
        <MetricChip
          label="Offline units"
          value={offlineUnits}
          tone={offlineUnits > 0 ? "warning" : "neutral"}
        />
        <MetricChip label="Available trucks" value={availableTrucks} tone="neutral" />
        <MetricChip
          label="GPS health"
          value={`${gpsHealth}%`}
          tone={gpsHealth < 90 ? "warning" : "success"}
        />
        <MetricChip
          label="Peak branch utilization"
          value={`${Math.round(maxBranchUtil * 100)}%`}
          tone={maxBranchUtil >= 1 ? "danger" : maxBranchUtil >= 0.8 ? "warning" : "neutral"}
        />
        <MetricChip label="Active trucks" value={activeTrucks} tone="neutral" />
      </div>
    </section>
  );
}

function MetricChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "danger"
      ? "border-[color-mix(in_srgb,var(--status-danger)_35%,transparent)] bg-[var(--status-danger-subtle)] text-[var(--status-danger)]"
      : tone === "warning"
        ? "border-[color-mix(in_srgb,var(--status-warning)_35%,transparent)] bg-[var(--status-warning-subtle)] text-[var(--status-warning)]"
        : tone === "success"
          ? "border-[color-mix(in_srgb,var(--status-success)_35%,transparent)] bg-[var(--status-success-subtle)] text-[var(--status-success)]"
          : "border-[var(--surface-border-subtle)] bg-[var(--surface-default)] text-[var(--text-muted-strong)]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${toneClasses}`}
    >
      {label}
      <strong className="font-semibold tabular-nums">{value}</strong>
    </span>
  );
}
