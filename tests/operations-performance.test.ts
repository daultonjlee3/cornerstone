import { describe, expect, it, beforeEach } from "vitest";
import { commandCenterFromSummaryCache } from "@/src/lib/fleet/operations/shared-loaders";
import {
  getCachedOperationsSummary,
  invalidateOperationsSummaryCache,
  setCachedOperationsSummary,
} from "@/src/lib/fleet/operations/summary-cache";
import type { FleetCommandCenterData, FleetOperationsSummary } from "@/src/types/fleet";

function sampleSummary(): FleetOperationsSummary {
  const commandCenter: FleetCommandCenterData = {
    activeTrucks: 12,
    idleTrucks: 3,
    jobsToday: 40,
    unassignedJobs: 5,
    utilizationPercent: 78,
    revenuePerTruckMtd: null,
    truckCount: 15,
    revenueScheduledToday: 10000,
    estimatedContributionToday: 8000,
    contributionAtRisk: 5000,
    revenueAtRisk: 5000,
    overtimeCostToday: 200,
    deadheadCostToday: 150,
  };

  return {
    date: "2026-06-24",
    lastUpdated: new Date().toISOString(),
    commandCenter,
    revenueAtRisk: 5000,
    criticalExceptionCount: 1,
    totalExceptionCount: null,
    pendingRecommendations: 3,
    pendingActionCount: 4,
    acceptanceRate: 80,
    integrationHealth: [],
  };
}

describe("operations summary cache", () => {
  beforeEach(() => {
    invalidateOperationsSummaryCache("tenant-bench");
  });

  it("returns cached command center for briefing/enrichment dedupe", () => {
    setCachedOperationsSummary("tenant-bench", "2026-06-24", sampleSummary());
    const cc = commandCenterFromSummaryCache("tenant-bench", "2026-06-24");
    expect(cc?.activeTrucks).toBe(12);
    expect(getCachedOperationsSummary("tenant-bench", "2026-06-24")?.pendingRecommendations).toBe(3);
  });
});
