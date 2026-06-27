import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import { ensurePeachtreeDemoTelematicsFresh } from "@/src/lib/fleet/demo/peachtree-demo-telematics";
import { loadFleetCommandCenterData } from "@/src/lib/fleet/queries/command-center";
import {
  loadFleetExecutiveInsights,
  loadRecommendationRoiSummary,
} from "@/src/lib/operational-profitability/performance-reports";
import { loadDayOverDayMetrics } from "@/src/lib/fleet/queries/today-view";
import { createOperationsPerfTimer } from "./perf";
import { countPendingRecommendationsForDate } from "./load-recommendations-page";

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

/** ROI, history, day-over-day — skips recommendation engine regeneration. */
export async function loadFleetOperationsEnrichment(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsEnrichment> {
  const date = options?.date ?? todayDateOnly();
  const yesterday = yesterdayDateOnly();
  const perf = createOperationsPerfTimer("operations-enrichment");

  void ensurePeachtreeDemoTelematicsFresh(supabase, tenantId);

  const weekStart = new Date(`${date}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [commandCenter, executiveInsights, recommendationRoi, recommendations, pendingCount] =
    await Promise.all([
      loadFleetCommandCenterData(supabase, tenantId),
      loadFleetExecutiveInsights(supabase, tenantId, date),
      loadRecommendationRoiSummary(supabase, tenantId, weekStartStr, date),
      getFleetRecommendations(supabase, tenantId, {
        date,
        deferGeneration: true,
        skipHistory: false,
      }),
      countPendingRecommendationsForDate(supabase, tenantId, date).catch(() => 0),
    ]);
  perf.stage("parallel-enrichment");

  const changesSinceYesterday = await loadDayOverDayMetrics(
    supabase,
    tenantId,
    date,
    yesterday,
    commandCenter,
    { ...EMPTY_BOARD_STUB, date },
    pendingCount,
    0
  );
  perf.stage("day-over-day");
  perf.finish();

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
