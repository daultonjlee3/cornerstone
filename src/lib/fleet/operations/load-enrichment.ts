import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { loadFleetRecommendationHistoryLight } from "@/src/lib/fleet-recommendation-engine/service";
import { loadFleetCommandCenterData } from "@/src/lib/fleet/queries/command-center";
import {
  loadFleetExecutiveInsights,
  loadRecommendationRoiSummary,
} from "@/src/lib/operational-profitability/performance-reports";
import { loadDayOverDayMetrics } from "@/src/lib/fleet/queries/today-view";
import { createOperationsPerfTimer } from "./perf";
import { countPendingRecommendationsForDate } from "./load-recommendations-page";
import {
  commandCenterFromSummaryCache,
  resolveCommandCenterForEnrichment,
} from "./shared-loaders";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateOnly(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const EMPTY_BOARD_STUB: FleetTodayViewData["board"] = {
  date: "",
  jobs: [],
  unassignedJobs: [],
  truckLanes: [],
  branchCapacity: [],
};

export type FleetOperationsEnrichment = Pick<
  FleetTodayViewData,
  | "commandCenter"
  | "executiveInsights"
  | "recommendationRoi"
  | "changesSinceYesterday"
  | "recommendations"
>;

/** ROI, history, day-over-day — no dispatch board or recommendation engine regeneration. */
export async function loadFleetOperationsEnrichment(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsEnrichment> {
  const date = options?.date ?? todayDateOnly();
  const yesterday = yesterdayDateOnly();
  const perf = createOperationsPerfTimer("operations-enrichment");

  const weekStart = new Date(`${date}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const summaryCommandCenter = commandCenterFromSummaryCache(tenantId, date);

  const commandCenterPromise = resolveCommandCenterForEnrichment(
    supabase,
    tenantId,
    date,
    () => loadFleetCommandCenterData(supabase, tenantId)
  );

  const pendingCountPromise = countPendingRecommendationsForDate(supabase, tenantId, date).catch(
    () => 0
  );

  const dayOverDayPromise = Promise.all([commandCenterPromise, pendingCountPromise]).then(
    ([commandCenter, pendingCount]) =>
      loadDayOverDayMetrics(
        supabase,
        tenantId,
        date,
        yesterday,
        summaryCommandCenter ?? commandCenter,
        { ...EMPTY_BOARD_STUB, date },
        pendingCount,
        0
      )
  );

  const [commandCenter, executiveInsights, recommendationRoi, recommendations, pendingCount, changesSinceYesterday] =
    await Promise.all([
      commandCenterPromise,
      loadFleetExecutiveInsights(supabase, tenantId, date),
      loadRecommendationRoiSummary(supabase, tenantId, weekStartStr, date),
      loadFleetRecommendationHistoryLight(supabase, tenantId),
      pendingCountPromise,
      dayOverDayPromise,
    ]);

  perf.stage("parallel-enrichment");
  perf.finish({ history: recommendations.history.length });

  return {
    commandCenter,
    executiveInsights,
    recommendationRoi,
    changesSinceYesterday,
    recommendations: {
      ...recommendations,
      pending: [],
      summary: {
        ...recommendations.summary,
        volume: pendingCount,
      },
      refreshing: false,
    },
  };
}
