import { describe, expect, it } from "vitest";
import {
  createEmptyTodayView,
  mergeBriefingIntoTodayView,
  mergeSummaryIntoTodayView,
} from "@/src/lib/fleet/operations/merge-today-view";
import { slicePaginated, parseOperationsListQuery } from "@/src/lib/fleet/operations/pagination-types";
import type { FleetOperationsSummary } from "@/src/types/fleet";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";

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
      totalExceptionCount: null,
      pendingRecommendations: 5,
      pendingActionCount: 6,
      acceptanceRate: 72,
      integrationHealth: [],
    };

    const merged = mergeSummaryIntoTodayView(createEmptyTodayView("2026-06-23"), summary);
    expect(merged.commandCenter.activeTrucks).toBe(18);
    expect(merged.revenueAtRisk).toBe(231800);
    expect(merged.recommendations.summary.acceptanceRate).toBe(72);
    expect(merged.pendingRecommendationCount).toBe(5);
    expect(merged.board.truckLanes).toHaveLength(0);
  });

  it("merges briefing counts without full exception/recommendation lists", () => {
    const base = mergeSummaryIntoTodayView(
      createEmptyTodayView("2026-06-23"),
      {
        date: "2026-06-23",
        lastUpdated: "2026-06-23T12:00:00.000Z",
        commandCenter: {
          activeTrucks: 1,
          idleTrucks: 0,
          jobsToday: 1,
          unassignedJobs: 0,
          utilizationPercent: 50,
          revenuePerTruckMtd: null,
          truckCount: 1,
        },
        revenueAtRisk: 0,
        criticalExceptionCount: 2,
        totalExceptionCount: null,
        pendingRecommendations: 12,
        pendingActionCount: 14,
        acceptanceRate: null,
        integrationHealth: [],
      }
    );

    const merged = mergeBriefingIntoTodayView(base, {
      date: "2026-06-23",
      executiveSummary: "Brief",
      board: base.board,
      martRows: [],
      exceptionCounts: { total: 25, critical: 2 },
      pendingRecommendationCount: 12,
      recommendations: {
        generatedAt: "2026-06-23T12:00:00.000Z",
        engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
        pending: [],
        history: [],
        summary: { volume: 12, accepted: 0, dismissed: 0, expired: 0, acceptanceRate: null, dismissalRate: null },
        refreshing: false,
      },
      revenueAtRisk: 0,
      pendingActionCount: 14,
      integrationHealth: [],
      upcomingCapacityIssues: [],
      unusedCapacityBranches: [],
    });

    expect(merged.exceptions).toHaveLength(0);
    expect(merged.exceptionCounts).toEqual({ total: 25, critical: 2 });
    expect(merged.pendingRecommendationCount).toBe(12);
  });
});

describe("operations list pagination helpers", () => {
  it("parses page and pageSize from query params", () => {
    const params = new URLSearchParams("page=2&pageSize=20&skip=1&severity=critical");
    const query = parseOperationsListQuery(params, { pageSize: 10 });
    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(20);
    expect(query.skip).toBe(1);
    expect(query.severity).toBe("critical");
  });

  it("slices paginated items with skip offset", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i) }));
    const page = slicePaginated(items, { page: 1, pageSize: 10, skip: 1 });
    expect(page.items).toHaveLength(10);
    expect(page.items[0]?.id).toBe("1");
    expect(page.totalCount).toBe(25);
    expect(page.hasMore).toBe(true);
  });
});
