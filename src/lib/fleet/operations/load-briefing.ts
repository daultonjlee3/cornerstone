import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import {
  buildCapacityAlerts,
  buildDispatchExceptions,
  buildDispatchExecutiveSummary,
  buildIntegrationHealthFromConnections,
} from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";
import { createOperationsPerfTimer } from "./perf";
import { setCachedDispatchExceptions } from "./exceptions-cache";
import {
  countPendingRecommendationsForDate,
  loadPrimaryPendingRecommendation,
} from "./load-recommendations-page";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadUtilizationMartRows(
  supabase: SupabaseClient,
  tenantId: string,
  date: string
) {
  const { data, error } = await supabase
    .from("utilization_daily")
    .select(
      "truck_id, branch_id, deadhead_miles, deadhead_cost, contribution, billable_hours, total_hours, overtime_cost, trucks(unit_number), branches(name)"
    )
    .eq("tenant_id", tenantId)
    .eq("date", date);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type FleetOperationsBriefing = Pick<
  FleetTodayViewData,
  | "date"
  | "executiveSummary"
  | "board"
  | "martRows"
  | "revenueAtRisk"
  | "pendingActionCount"
  | "integrationHealth"
  | "upcomingCapacityIssues"
  | "unusedCapacityBranches"
  | "recommendations"
> & {
  exceptionCounts: { total: number; critical: number };
  pendingRecommendationCount: number;
};

/** Board + hero recommendation + counts — list sections paginate separately. */
export async function loadFleetOperationsBriefing(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsBriefing> {
  const date = options?.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-briefing");

  const board = await loadFleetDispatchBoardData(supabase, tenantId, date);
  perf.stage("board");

  const [primaryResult, pendingCountResult, connectionsResult, martRows] = await Promise.allSettled([
    loadPrimaryPendingRecommendation(supabase, tenantId, { date }),
    countPendingRecommendationsForDate(supabase, tenantId, date),
    supabase
      .from("integration_connections")
      .select("id, provider, display_name, status, config, last_sync_at, last_error")
      .eq("tenant_id", tenantId),
    loadUtilizationMartRows(supabase, tenantId, date),
  ]);

  const primaryRecommendation =
    primaryResult.status === "fulfilled" ? primaryResult.value : null;
  const pendingRecommendationCount =
    pendingCountResult.status === "fulfilled" ? pendingCountResult.value : 0;

  if (primaryResult.status === "rejected") {
    console.warn("[operations-briefing] primary recommendation:", primaryResult.reason);
  }
  if (pendingCountResult.status === "rejected") {
    console.warn("[operations-briefing] pending count:", pendingCountResult.reason);
  }

  if (connectionsResult.status === "rejected") {
    throw connectionsResult.reason;
  }
  if (martRows.status === "rejected") {
    throw martRows.reason;
  }

  perf.stage("parallel-light");

  const connections = (connectionsResult.value.data ?? []) as IntegrationConnection[];
  const integrationHealth = buildIntegrationHealthFromConnections(connections);
  const revenueAtRisk = board.unassignedJobs.reduce((sum, j) => sum + (j.revenue_estimate || 0), 0);
  const exceptions = buildDispatchExceptions(board, integrationHealth, revenueAtRisk);
  setCachedDispatchExceptions(tenantId, date, exceptions);

  const exceptionCounts = {
    total: exceptions.length,
    critical: exceptions.filter((e) => e.severity === "critical").length,
  };

  const { upcoming, unused } = buildCapacityAlerts(board);
  const overloadBranches = board.branchCapacity.filter(
    (b) => b.available_truck_hours > 0 && b.utilization > 1
  );

  const executiveSummary = buildDispatchExecutiveSummary({
    exceptions,
    changes: [],
    recommendations: pendingRecommendationCount,
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

  perf.finish({
    pending: pendingRecommendationCount,
    exceptions: exceptionCounts.total,
  });

  return {
    date,
    executiveSummary,
    board,
    martRows: martRows.value as FleetTodayViewData["martRows"],
    exceptionCounts,
    pendingRecommendationCount,
    recommendations: {
      generatedAt: new Date().toISOString(),
      engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
      pending: primaryRecommendation ? [primaryRecommendation] : [],
      history: [],
      summary: {
        volume: pendingRecommendationCount,
        accepted: 0,
        dismissed: 0,
        expired: 0,
        acceptanceRate: null,
        dismissalRate: null,
      },
      refreshing: pendingRecommendationCount === 0,
    },
    revenueAtRisk,
    pendingActionCount:
      pendingRecommendationCount + exceptionCounts.critical,
    integrationHealth,
    upcomingCapacityIssues: upcoming,
    unusedCapacityBranches: unused,
  };
}
