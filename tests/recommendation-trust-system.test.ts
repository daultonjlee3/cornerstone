import { describe, expect, it } from "vitest";
import { buildFleetRecommendationsFromBoard } from "@/src/lib/fleet-recommendation-engine/service";
import {
  attachTrustToHistory,
  attachTrustToRecommendations,
  buildRecommendationTrustSurface,
  buildTrustSurfaceFromHistory,
} from "@/src/lib/fleet-recommendation-engine/trust-surface";
import type {
  FleetDispatchBoardData,
  FleetRecommendationHistoryEntry,
} from "@/src/types/fleet";

function sampleBoard(): FleetDispatchBoardData {
  return {
    date: "2026-06-24",
    jobs: [
      {
        id: "job-1",
        title: "Hydrovac urgent call",
        status: "unassigned",
        priority: "urgent",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T09:00:00.000Z",
        scheduled_end: "2026-06-24T11:00:00.000Z",
        revenue_estimate: 6900,
        site_name: "Site 1",
        site_latitude: 29.75,
        site_longitude: -95.37,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    unassignedJobs: [
      {
        id: "job-1",
        title: "Hydrovac urgent call",
        status: "unassigned",
        priority: "urgent",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T09:00:00.000Z",
        scheduled_end: "2026-06-24T11:00:00.000Z",
        revenue_estimate: 6900,
        site_name: "Site 1",
        site_latitude: 29.75,
        site_longitude: -95.37,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    truckLanes: [
      {
        truck_id: "truck-1",
        unit_number: "1016",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        committed_hours: 2,
        available_hours: 10,
        utilization: 0.2,
        jobs: [],
        latitude: 29.76,
        longitude: -95.36,
        telematics_status: "online",
        operator_name: "J. Smith",
        revenue_today: 4200,
        idle_hours: 1.2,
      },
      {
        truck_id: "truck-2",
        unit_number: "1017",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        committed_hours: 4,
        available_hours: 10,
        utilization: 0.4,
        jobs: [],
        latitude: 29.79,
        longitude: -95.41,
        telematics_status: "stale",
        operator_name: "A. Lee",
      },
    ],
    branchCapacity: [
      {
        branch_id: "branch-a",
        branch_name: "Marietta",
        available_truck_hours: 30,
        committed_hours: 22,
        utilization: 0.73,
      },
    ],
  };
}

describe("recommendation trust surface", () => {
  it("builds enterprise trust fields from existing explainability", () => {
    const board = sampleBoard();
    const [rec] = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T18:00:00.000Z"
    ).filter((r) => r.recommendation_type === "truck_assignment");

    expect(rec).toBeDefined();

    const trust = buildRecommendationTrustSurface(
      { ...rec!, id: "rec-1", created_at: "2026-06-24T12:00:00.000Z" },
      board
    );

    expect(trust.confidenceScore).toBeGreaterThan(0);
    expect(["high", "medium", "low"]).toContain(trust.confidenceLabel);
    expect(trust.whyThisRecommendation.length).toBeGreaterThan(0);
    expect(trust.financialImpact).not.toBeNull();
    expect(trust.confidenceExplanation.length).toBeGreaterThan(5);
  });

  it("attaches trust to pending recommendations", () => {
    const board = sampleBoard();
    const recs = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T18:00:00.000Z"
    ).map((rec, index) => ({
      ...rec,
      id: `rec-${index}`,
      created_at: "2026-06-24T12:00:00.000Z",
    }));

    const enriched = attachTrustToRecommendations(recs, board);
    expect(enriched[0]?.trust).toBeDefined();
    expect(enriched[0]?.trust?.alternativeOptions.length).toBeGreaterThanOrEqual(0);
  });

  it("reconstructs trust from stored history outcomes", () => {
    const entry: FleetRecommendationHistoryEntry = {
      id: "rec-hist-1",
      tenant_id: "tenant-1",
      branch_id: "branch-a",
      recommendation_type: "truck_assignment",
      status: "completed",
      lifecycle: "accepted",
      score: 82,
      rationale: {
        title: "Assign truck 1016",
        reasons: ["Lowest deadhead"],
        factors: {
          travelImpact: 0,
          utilizationImpact: 0,
          capacityImpact: 0,
          telematicsFreshness: 100,
        },
        entities: { job_id: "job-1", truck_id: "truck-1" },
      },
      engine_version: "fleet_rules_v1",
      created_at: "2026-06-24T10:00:00.000Z",
      expires_at: "2026-06-24T18:00:00.000Z",
      latest_outcome: {
        id: "out-1",
        recommendation_id: "rec-hist-1",
        action: "accepted",
        acted_by: "user-1",
        acted_at: "2026-06-24T10:05:00.000Z",
        estimated_impact: {
          financial_estimate: {
            contribution_improvement: 1200,
            deadhead_reduction_miles: 4.2,
            overtime_avoided: 85,
            revenue_protected: 6900,
            travel_reduction_minutes: 18,
          },
          decision_record: {
            engine_score: 82,
            confidence: "high",
            winner_reasons: ["Lowest deadhead", "Best utilization"],
            alternatives: [{ truck_id: "truck-2", unit_number: "1017", score: 71 }],
          },
        },
        measured_impact: {
          actual_contribution: { status: "measured", estimated: 1200, actual: 1150 },
          completed_on_time: { status: "measured", actual: true },
        },
        application_error: null,
        notes: null,
      },
    };

    const trust = buildTrustSurfaceFromHistory(entry);
    expect(trust).not.toBeNull();
    expect(trust?.financialImpact).toBe(1200);
    expect(trust?.deadheadReductionMiles).toBe(4.2);
    expect(trust?.whyThisRecommendation).toContain("Lowest deadhead");
    expect(trust?.alternativeOptions[0]?.unit_number).toBe("1017");

    const [withTrust] = attachTrustToHistory([entry]);
    expect(withTrust.trust?.revenueProtected).toBe(6900);
  });
});
