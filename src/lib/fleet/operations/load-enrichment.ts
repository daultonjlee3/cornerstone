import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetTodayViewData } from "@/src/types/fleet";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import { ensurePeachtreeDemoTelematicsFresh } from "@/src/lib/fleet/demo/peachtree-demo-telematics";
import { loadFleetCommandCenterData } from "@/src/lib/fleet/queries/command-center";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import {
  loadFleetExecutiveInsights,
  loadRecommendationRoiSummary,
} from "@/src/lib/operational-profitability/performance-reports";
import { loadDayOverDayMetrics } from "@/src/lib/fleet/queries/today-view";
import { createOperationsPerfTimer } from "./perf";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateOnly(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type FleetOperationsEnrichment = Pick<
  FleetTodayViewData,
  | "commandCenter"
  | "executiveInsights"
  | "recommendationRoi"
  | "changesSinceYesterday"
  | "recommendations"
>;

/** ROI, history, validated recommendations — runs after first paint. */
export async function loadFleetOperationsEnrichment(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { date?: string }
): Promise<FleetOperationsEnrichment> {
  const date = options?.date ?? todayDateOnly();
  const yesterday = yesterdayDateOnly();
  const perf = createOperationsPerfTimer("operations-enrichment");

  void ensurePeachtreeDemoTelematicsFresh(supabase, tenantId);

  const board = await loadFleetDispatchBoardData(supabase, tenantId, date);
  perf.stage("board");

  const weekStart = new Date(`${date}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const [commandCenter, executiveInsights, recommendationRoi, recommendations] =
    await Promise.all([
      loadFleetCommandCenterData(supabase, tenantId),
      loadFleetExecutiveInsights(supabase, tenantId, date),
      loadRecommendationRoiSummary(supabase, tenantId, weekStartStr, date),
      getFleetRecommendations(supabase, tenantId, { date, board, skipHistory: false }),
    ]);
  perf.stage("parallel-enrichment");

  const changesSinceYesterday = await loadDayOverDayMetrics(
    supabase,
    tenantId,
    date,
    yesterday,
    commandCenter,
    board,
    recommendations.pending.length,
    0
  );
  perf.stage("day-over-day");
  perf.finish();

  return {
    commandCenter,
    executiveInsights,
    recommendationRoi,
    changesSinceYesterday,
    recommendations,
  };
}
