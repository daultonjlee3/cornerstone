import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { loadFleetCommandCenterSummary } from "@/src/lib/fleet/queries/command-center-summary";
import {
  buildDispatchExecutiveSummary,
  buildIntegrationHealthFromConnections,
} from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";
import { createOperationsPerfTimer } from "./perf";
import {
  countPendingRecommendationsForDate,
  loadPrimaryPendingRecommendation,
} from "./load-recommendations-page";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export type FleetOperationsBriefing = Pick<
  FleetTodayViewData,
  | "date"
  | "executiveSummary"
  | "revenueAtRisk"
  | "pendingActionCount"
  | "integrationHealth"
  | "recommendations"
> & {
  exceptionCounts: { total: number; critical: number };
  pendingRecommendationCount: number;
};

/** Hero recommendation + executive summary — no dispatch board (KPI detail loads on demand). */
export async function loadFleetOperationsBriefing(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsBriefing> {
  const date = options?.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-briefing");

  const [primaryResult, pendingCountResult, connectionsResult, commandCenterResult] =
    await Promise.allSettled([
      loadPrimaryPendingRecommendation(supabase, tenantId, { date }),
      countPendingRecommendationsForDate(supabase, tenantId, date),
      supabase
        .from("integration_connections")
        .select("id, provider, display_name, status, config, last_sync_at, last_error")
        .eq("tenant_id", tenantId),
      loadFleetCommandCenterSummary(supabase, tenantId, date),
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
  if (commandCenterResult.status === "rejected") {
    throw commandCenterResult.reason;
  }

  perf.stage("parallel-light");

  const commandCenter = commandCenterResult.value;
  const connections = (connectionsResult.value.data ?? []) as IntegrationConnection[];
  const integrationHealth = buildIntegrationHealthFromConnections(connections);
  const revenueAtRisk = commandCenter.revenueAtRisk ?? 0;
  const integrationIssueCount = integrationHealth.filter((c) => c.status !== "healthy").length;

  const exceptionCounts = {
    total: commandCenter.unassignedJobs + integrationIssueCount,
    critical:
      (commandCenter.unassignedJobs > 0 ? 1 : 0) +
      integrationHealth.filter((c) => c.status === "error").length,
  };

  const executiveSummary = buildDispatchExecutiveSummary({
    exceptions: [],
    changes: [],
    recommendations: pendingRecommendationCount,
    revenueAtRisk,
    unusedBranches: [],
    overloadBranches: [],
    unassignedJobCount: commandCenter.unassignedJobs,
  });

  perf.finish({
    pending: pendingRecommendationCount,
    exceptions: exceptionCounts.total,
  });

  return {
    date,
    executiveSummary,
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
    pendingActionCount: pendingRecommendationCount + exceptionCounts.critical,
    integrationHealth,
  };
}
