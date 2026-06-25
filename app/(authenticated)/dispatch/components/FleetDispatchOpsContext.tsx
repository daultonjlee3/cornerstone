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

  return (
    <p
      id="fleet-executive"
      className="text-xs text-[var(--muted)]"
      data-testid="fleet-dispatch-executive"
    >
      <span className="font-medium text-[var(--foreground)]">{activeTrucks} trucks active</span>
      <span className="mx-1.5 text-[var(--card-border)]">|</span>
      {board.unassignedJobs.length > 0 ? (
        <>
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            {board.unassignedJobs.length} unassigned
          </span>
          <span className="mx-1.5 text-[var(--card-border)]">|</span>
        </>
      ) : (
        <>
          <span>Queue clear</span>
          <span className="mx-1.5 text-[var(--card-border)]">|</span>
        </>
      )}
      {intel.revenueAtRisk > 0 ? (
        <>
          <span className="font-semibold text-red-700 dark:text-red-400">
            {formatCurrency(intel.revenueAtRisk)} at risk
          </span>
          <span className="mx-1.5 text-[var(--card-border)]">|</span>
        </>
      ) : null}
      {maxBranchUtil >= 0.8 ? (
        <>
          <span className={maxBranchUtil >= 1 ? "font-semibold text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"}>
            Capacity {Math.round(maxBranchUtil * 100)}%
          </span>
          <span className="mx-1.5 text-[var(--card-border)]">|</span>
        </>
      ) : null}
      {criticalCount > 0 ? (
        <>
          <span className="font-semibold text-red-700 dark:text-red-400">
            {criticalCount} critical
          </span>
          <span className="mx-1.5 text-[var(--card-border)]">|</span>
        </>
      ) : null}
      {recommendationCount > 0 ? (
        <span className="font-semibold text-blue-700 dark:text-blue-400">
          {recommendationCount} recommendation{recommendationCount === 1 ? "" : "s"}
        </span>
      ) : (
        <span>No pending recommendations</span>
      )}
    </p>
  );
}
