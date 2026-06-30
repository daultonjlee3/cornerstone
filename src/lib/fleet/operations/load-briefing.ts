import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { loadFleetCommandCenterSummary } from "@/src/lib/fleet/queries/command-center-summary";
import {
  buildDispatchExecutiveSummary,
} from "@/src/lib/fleet/queries/today-view";
import { createOperationsPerfTimer } from "./perf";
import {
  countPendingRecommendationsForDate,
  loadPrimaryPendingRecommendation,
} from "./load-recommendations-page";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
import {
  commandCenterFromSummaryCache,
  loadIntegrationHealthCached,
} from "./shared-loaders";

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

/** Hero recommendation + executive summary — reuses cached summary when available. */
export async function loadFleetOperationsBriefing(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsBriefing> {
  const date = options?.date ?? todayDateOnly();
  const perf = createOperationsPerfTimer("operations-briefing");

  const cachedCommandCenter = commandCenterFromSummaryCache(tenantId, date);

  const [primaryResult, pendingCountResult, integrationHealth, commandCenter] =
    await Promise.all([
      loadPrimaryPendingRecommendation(supabase, tenantId, { date }),
      countPendingRecommendationsForDate(supabase, tenantId, date),
      loadIntegrationHealthCached(supabase, tenantId),
      cachedCommandCenter
        ? Promise.resolve(cachedCommandCenter)
        : loadFleetCommandCenterSummary(supabase, tenantId, date),
    ]);

  perf.stage("parallel-light");

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
    recommendations: pendingCountResult,
    revenueAtRisk,
    unusedBranches: [],
    overloadBranches: [],
    unassignedJobCount: commandCenter.unassignedJobs,
  });

  perf.finish({
    pending: pendingCountResult,
    exceptions: exceptionCounts.total,
    summaryCacheHit: cachedCommandCenter ? 1 : 0,
  });

  return {
    date,
    executiveSummary,
    exceptionCounts,
    pendingRecommendationCount: pendingCountResult,
    recommendations: {
      generatedAt: new Date().toISOString(),
      engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
      pending: primaryResult ? [primaryResult] : [],
      history: [],
      summary: {
        volume: pendingCountResult,
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
      refreshing: pendingCountResult === 0,
    },
    revenueAtRisk,
    pendingActionCount: pendingCountResult + exceptionCounts.critical,
    integrationHealth,
  };
}
