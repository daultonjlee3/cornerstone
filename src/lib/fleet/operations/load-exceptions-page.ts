import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetOperationalException } from "@/src/types/fleet";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import {
  buildDispatchExceptions,
  buildIntegrationHealthFromConnections,
} from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";
import { createOperationsPerfTimer } from "./perf";
import type { FleetPaginatedResult, OperationsListQuery } from "./pagination-types";
import { slicePaginated } from "./pagination-types";
import {
  getCachedDispatchExceptions,
  setCachedDispatchExceptions,
} from "./exceptions-cache";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function filterExceptions(
  exceptions: FleetOperationalException[],
  query: Pick<OperationsListQuery, "severity" | "branchId">
): FleetOperationalException[] {
  let filtered = exceptions;
  if (query.severity) {
    filtered = filtered.filter((e) => e.severity === query.severity);
  }
  if (query.branchId) {
    filtered = filtered.filter((e) => e.href.includes(`branchId=${query.branchId}`));
  }
  return filtered;
}

export async function loadDispatchExceptionCounts(
  supabase: SupabaseClient,
  tenantId: string,
  date?: string
): Promise<{ total: number; critical: number }> {
  const exceptions = await loadAllDispatchExceptions(supabase, tenantId, date);
  return {
    total: exceptions.length,
    critical: exceptions.filter((e) => e.severity === "critical").length,
  };
}

async function loadAllDispatchExceptions(
  supabase: SupabaseClient,
  tenantId: string,
  date?: string
): Promise<FleetOperationalException[]> {
  const boardDate = date ?? todayDateOnly();
  const cached = getCachedDispatchExceptions(tenantId, boardDate);
  if (cached) return cached;

  const board = await loadFleetDispatchBoardData(supabase, tenantId, boardDate);
  const { data: connectionsResult } = await supabase
    .from("integration_connections")
    .select("id, provider, display_name, status, config, last_sync_at, last_error")
    .eq("tenant_id", tenantId);

  const connections = (connectionsResult ?? []) as IntegrationConnection[];
  const integrationHealth = buildIntegrationHealthFromConnections(connections);
  const revenueAtRisk = board.unassignedJobs.reduce((sum, j) => sum + (j.revenue_estimate || 0), 0);
  const exceptions = buildDispatchExceptions(board, integrationHealth, revenueAtRisk);
  setCachedDispatchExceptions(tenantId, boardDate, exceptions);
  return exceptions;
}

export async function loadPaginatedDispatchExceptions(
  supabase: SupabaseClient,
  tenantId: string,
  query: OperationsListQuery
): Promise<FleetPaginatedResult<FleetOperationalException>> {
  const date = query.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-exceptions-page");

  const all = filterExceptions(await loadAllDispatchExceptions(supabase, tenantId, date), query);
  const result = slicePaginated(all, query);

  perf.finish({
    page: query.page,
    pageSize: query.pageSize,
    returned: result.items.length,
    totalCount: result.totalCount,
  });

  return result;
}
