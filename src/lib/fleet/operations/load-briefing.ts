import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { loadCachedFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import {
  buildCapacityAlerts,
  buildDispatchExceptions,
  buildDispatchExecutiveSummary,
  buildIntegrationHealthFromConnections,
} from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";
import { createOperationsPerfTimer } from "./perf";

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
  | "exceptions"
  | "recommendations"
  | "revenueAtRisk"
  | "pendingActionCount"
  | "integrationHealth"
  | "upcomingCapacityIssues"
  | "unusedCapacityBranches"
>;

/** Board + cached recommendations + exceptions — no recommendation engine regeneration. */
export async function loadFleetOperationsBriefing(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsBriefing> {
  const date = options?.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-briefing");

  const board = await loadFleetDispatchBoardData(supabase, tenantId, date);
  perf.stage("board");

  const [recommendations, connectionsResult, martRows] = await Promise.all([
    loadCachedFleetRecommendations(supabase, tenantId, { date }),
    supabase
      .from("integration_connections")
      .select("id, provider, display_name, status, config, last_sync_at, last_error")
      .eq("tenant_id", tenantId),
    loadUtilizationMartRows(supabase, tenantId, date),
  ]);
  perf.stage("parallel-cached");

  const connections = (connectionsResult.data ?? []) as IntegrationConnection[];
  const integrationHealth = buildIntegrationHealthFromConnections(connections);
  const revenueAtRisk = board.unassignedJobs.reduce((sum, j) => sum + (j.revenue_estimate || 0), 0);
  const exceptions = buildDispatchExceptions(board, integrationHealth, revenueAtRisk);
  const { upcoming, unused } = buildCapacityAlerts(board);
  const overloadBranches = board.branchCapacity.filter(
    (b) => b.available_truck_hours > 0 && b.utilization > 1
  );

  const executiveSummary = buildDispatchExecutiveSummary({
    exceptions,
    changes: [],
    recommendations: recommendations.pending.length,
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
    pending: recommendations.pending.length,
    exceptions: exceptions.length,
  });

  return {
    date,
    executiveSummary,
    board,
    martRows: martRows as FleetTodayViewData["martRows"],
    exceptions,
    recommendations,
    revenueAtRisk,
    pendingActionCount:
      recommendations.pending.length +
      exceptions.filter((e) => e.severity === "critical").length,
    integrationHealth,
    upcomingCapacityIssues: upcoming,
    unusedCapacityBranches: unused,
  };
}
