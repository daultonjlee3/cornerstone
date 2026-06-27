import { describe, expect, it } from "vitest";
import {
  createEmptyTodayView,
  mergeSummaryIntoTodayView,
} from "@/src/lib/fleet/operations/merge-today-view";
import type { FleetOperationsSummary } from "@/src/types/fleet";

describe("fleet operations progressive merge", () => {
  it("creates empty today view with refreshing recommendations", () => {
    const empty = createEmptyTodayView("2026-06-23");
    expect(empty.recommendations.refreshing).toBe(true);
    expect(empty.commandCenter.activeTrucks).toBe(0);
  });

  it("merges summary KPIs without board data", () => {
    const summary: FleetOperationsSummary = {
      date: "2026-06-23",
      lastUpdated: "2026-06-23T12:00:00.000Z",
      commandCenter: {
        activeTrucks: 18,
        idleTrucks: 2,
        jobsToday: 57,
        unassignedJobs: 30,
        utilizationPercent: 84.7,
        revenuePerTruckMtd: null,
        truckCount: 20,
        estimatedContributionToday: 123751,
        revenueAtRisk: 231800,
      },
      revenueAtRisk: 231800,
      criticalExceptionCount: 1,
      pendingRecommendations: 5,
      pendingActionCount: 6,
      acceptanceRate: 72,
      integrationHealth: [],
    };

    const merged = mergeSummaryIntoTodayView(createEmptyTodayView("2026-06-23"), summary);
    expect(merged.commandCenter.activeTrucks).toBe(18);
    expect(merged.revenueAtRisk).toBe(231800);
    expect(merged.recommendations.summary.acceptanceRate).toBe(72);
    expect(merged.board.truckLanes).toHaveLength(0);
  });
});
