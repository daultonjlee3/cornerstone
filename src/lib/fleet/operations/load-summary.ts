import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetOperationsSummary } from "@/src/types/fleet";
import { loadFleetCommandCenterSummary } from "@/src/lib/fleet/queries/command-center-summary";
import { createOperationsPerfTimer } from "./perf";
import {
  getCachedOperationsSummary,
  setCachedOperationsSummary,
} from "./summary-cache";
import { countPendingRecommendationsFast } from "./load-recommendations-page";
import { loadIntegrationHealthCached } from "./shared-loaders";

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

  const [commandCenter, pendingRecommendations, acceptanceRate, integrationHealth] =
    await Promise.all([
      loadFleetCommandCenterSummary(supabase, tenantId, date),
      countPendingRecommendations(supabase, tenantId).catch(() => 0),
      loadAcceptanceRateSnapshot(supabase, tenantId),
      loadIntegrationHealthCached(supabase, tenantId),
    ]);
  perf.stage("parallel-queries");

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
