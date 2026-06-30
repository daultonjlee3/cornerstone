import type {
  FleetDispatchBoardData,
  FleetIntegrationHealthItem,
  FleetTodayViewData,
} from "@/src/types/fleet";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
import {
  buildCapacityAlerts,
  buildDispatchExceptions,
  commandCenterFromBoard,
  buildDispatchExecutiveSummary,
} from "@/src/lib/fleet/queries/today-view";

const EMPTY_RECOMMENDATIONS = {
  generatedAt: "",
  engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
  pending: [],
  history: [],
  summary: {
    volume: 0,
    accepted: 0,
    rejected: 0,
    dismissed: 0,
    expired: 0,
    applied: 0,
    failed: 0,
    completed: 0,
    acceptanceRate: null,
    rejectionRate: null,
    dismissalRate: null,
    trustScore: null,
  },
};

/** Board-only intel for instant dispatch shell — no DB round trips. */
export function buildMinimalDispatchIntel(
  board: FleetDispatchBoardData,
  date: string,
  integrationHealth: FleetIntegrationHealthItem[] = []
): FleetTodayViewData {
  const revenueAtRisk = board.unassignedJobs.reduce((sum, j) => sum + (j.revenue_estimate || 0), 0);
  const exceptions = buildDispatchExceptions(board, integrationHealth, revenueAtRisk);
  const { upcoming, unused } = buildCapacityAlerts(board);
  const commandCenter = commandCenterFromBoard(board);
  const overloadBranches = board.branchCapacity.filter(
    (b) => b.available_truck_hours > 0 && b.utilization > 1
  );

  const executiveSummary = buildDispatchExecutiveSummary({
    exceptions,
    changes: [],
    recommendations: 0,
    revenueAtRisk,
    unusedBranches: unused,
    overloadBranches: overloadBranches.map((b) => ({
      branch_id: b.branch_id,
      branch_name: b.branch_name,
      utilization: b.utilization,
      committed_hours: b.committed_hours,
      available_truck_hours: b.available_truck_hours,
      href: `/dispatch?date=${date}`,
    })),
  });

  return {
    date,
    executiveSummary,
    board,
    martRows: [],
    commandCenter,
    exceptions,
    changesSinceYesterday: [],
    integrationHealth,
    upcomingCapacityIssues: upcoming,
    unusedCapacityBranches: unused,
    recommendations: EMPTY_RECOMMENDATIONS,
    revenueAtRisk,
    pendingActionCount:
      exceptions.filter((e) => e.severity === "critical").length + board.unassignedJobs.length,
  };
}

/** Merge integration health into existing intel (secondary lazy load). */
export function mergeIntegrationHealthIntoIntel(
  intel: FleetTodayViewData,
  board: FleetDispatchBoardData,
  integrationHealth: FleetIntegrationHealthItem[]
): FleetTodayViewData {
  const revenueAtRisk = intel.revenueAtRisk;
  const exceptions = buildDispatchExceptions(board, integrationHealth, revenueAtRisk);
  return {
    ...intel,
    integrationHealth,
    exceptions,
    pendingActionCount:
      (intel.recommendations?.pending.length ?? 0) +
      exceptions.filter((e) => e.severity === "critical").length,
  };
}
