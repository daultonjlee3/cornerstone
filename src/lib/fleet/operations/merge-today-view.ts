import type {
  FleetRecommendationsResponse,
  FleetTodayViewData,
  FleetOperationsSummary,
} from "@/src/types/fleet";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
import type { FleetOperationsBriefing } from "./load-briefing";
import type { FleetOperationsEnrichment } from "./load-enrichment";

function emptyRecommendations(): FleetRecommendationsResponse {
  return {
    generatedAt: "",
    engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
    pending: [],
    history: [],
    summary: {
      volume: 0,
      accepted: 0,
      dismissed: 0,
      expired: 0,
      acceptanceRate: null,
      dismissalRate: null,
    },
    refreshing: true,
  };
}

export function createEmptyTodayView(date: string): FleetTodayViewData {
  return {
    date,
    executiveSummary: "",
    board: {
      date,
      jobs: [],
      unassignedJobs: [],
      truckLanes: [],
      branchCapacity: [],
    },
    martRows: [],
    commandCenter: {
      activeTrucks: 0,
      idleTrucks: 0,
      jobsToday: 0,
      unassignedJobs: 0,
      utilizationPercent: null,
      revenuePerTruckMtd: null,
      truckCount: 0,
    },
    exceptions: [],
    changesSinceYesterday: [],
    integrationHealth: [],
    upcomingCapacityIssues: [],
    unusedCapacityBranches: [],
    recommendations: emptyRecommendations(),
    revenueAtRisk: 0,
    pendingActionCount: 0,
  };
}

export function mergeSummaryIntoTodayView(
  base: FleetTodayViewData,
  summary: FleetOperationsSummary
): FleetTodayViewData {
  return {
    ...base,
    date: summary.date,
    commandCenter: summary.commandCenter,
    revenueAtRisk: summary.revenueAtRisk,
    pendingActionCount: summary.pendingActionCount,
    integrationHealth: summary.integrationHealth,
    recommendations: {
      ...base.recommendations,
      summary: {
        ...base.recommendations.summary,
        acceptanceRate: summary.acceptanceRate,
      },
      generatedAt: summary.lastUpdated,
    },
  };
}

export function mergeBriefingIntoTodayView(
  base: FleetTodayViewData,
  briefing: FleetOperationsBriefing
): FleetTodayViewData {
  return {
    ...base,
    ...briefing,
    commandCenter: base.commandCenter,
  };
}

export function mergeEnrichmentIntoTodayView(
  base: FleetTodayViewData,
  enrichment: FleetOperationsEnrichment
): FleetTodayViewData {
  return {
    ...base,
    commandCenter: enrichment.commandCenter,
    executiveInsights: enrichment.executiveInsights,
    recommendationRoi: enrichment.recommendationRoi,
    changesSinceYesterday: enrichment.changesSinceYesterday,
    recommendations: enrichment.recommendations,
    pendingActionCount:
      enrichment.recommendations.pending.length +
      base.exceptions.filter((e) => e.severity === "critical").length,
  };
}
