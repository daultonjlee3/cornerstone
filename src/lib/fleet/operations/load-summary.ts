import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetOperationsSummary } from "@/src/types/fleet";
import { loadFleetCommandCenterSummary } from "@/src/lib/fleet/queries/command-center-summary";
import {
  buildIntegrationHealthFromConnections,
} from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";
import { createOperationsPerfTimer } from "./perf";
import {
  getCachedOperationsSummary,
  setCachedOperationsSummary,
} from "./summary-cache";

import {
  countPendingRecommendationsFast,
} from "./load-recommendations-page";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

async function countPendingRecommendations(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  return countPendingRecommendationsFast(supabase, tenantId);
}

async function loadAcceptanceRateSnapshot(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number | null> {
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const { data, error } = await supabase
    .from("recommendation_instances")
    .select("status")
    .eq("tenant_id", tenantId)
    .in("status", ["accepted", "dismissed"])
    .gte("created_at", weekAgo.toISOString())
    .limit(200);

  if (error || !data?.length) return null;
  const accepted = data.filter((r) => (r as { status: string }).status === "accepted").length;
  return Math.round((accepted / data.length) * 100);
}

export async function loadFleetOperationsSummary(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string; skipCache?: boolean }
): Promise<FleetOperationsSummary> {
  const date = options?.date ?? todayDateOnly();

  if (!options?.skipCache) {
    const cached = getCachedOperationsSummary(tenantId, date);
    if (cached) return cached;
  }

  const perf = createOperationsPerfTimer("operations-summary");

  const [commandCenter, connectionsResult, pendingRecommendations, acceptanceRate] =
    await Promise.all([
      loadFleetCommandCenterSummary(supabase, tenantId, date),
      supabase
        .from("integration_connections")
        .select("id, provider, display_name, status, config, last_sync_at, last_error")
        .eq("tenant_id", tenantId),
      countPendingRecommendations(supabase, tenantId).catch(() => 0),
      loadAcceptanceRateSnapshot(supabase, tenantId),
    ]);
  perf.stage("parallel-queries");

  const connections = (connectionsResult.data ?? []) as IntegrationConnection[];
  const integrationHealth = buildIntegrationHealthFromConnections(connections);
  const revenueAtRisk = commandCenter.revenueAtRisk ?? 0;

  const summary: FleetOperationsSummary = {
    date,
    lastUpdated: new Date().toISOString(),
    commandCenter,
    revenueAtRisk,
    criticalExceptionCount: commandCenter.unassignedJobs > 0 ? 1 : 0,
    totalExceptionCount: null,
    pendingRecommendations,
    pendingActionCount: pendingRecommendations + (commandCenter.unassignedJobs > 0 ? 1 : 0),
    acceptanceRate,
    integrationHealth,
  };

  setCachedOperationsSummary(tenantId, date, summary);
  perf.finish({ pending: pendingRecommendations });
  return summary;
}
