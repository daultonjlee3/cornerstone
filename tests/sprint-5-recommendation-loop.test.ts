import { describe, expect, it } from "vitest";
import { buildFleetRecommendationsFromBoard } from "@/src/lib/fleet-recommendation-engine/service";
import { buildRecommendationExplanation } from "@/src/lib/fleet-recommendation-engine/explainability";
import { validateRecommendationAcceptance } from "@/src/lib/fleet-recommendation-engine/validate-recommendation";
import { measureRecommendationOutcome } from "@/src/lib/fleet-recommendation-engine/outcome-tracking";
import { syntheticOperatingRules } from "@/src/lib/operational-profitability/queries";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";

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

function profitCtx(tenantId = "tenant-1"): ProfitabilityContext {
  return {
    rules: syntheticOperatingRules(tenantId, tenantId),
    truckProfiles: new Map(),
    typeProfiles: new Map(),
    operatorDailyHours: new Map(),
    operatorWeeklyHours: new Map(),
  };
}

describe("recommendation loop — single source of truth", () => {
  it("stores candidate snapshots at generation time", () => {
    const board = sampleBoard();
    const ctx = profitCtx();
    const [rec] = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T20:00:00.000Z",
      ctx
    ).filter((r) => r.recommendation_type === "truck_assignment");

    expect(rec.rationale.candidate_snapshots?.length).toBeGreaterThanOrEqual(2);
    expect(rec.rationale.job_snapshot?.job_id).toBe("job-1");
    expect(rec.rationale.generated_at).toBeTruthy();
  });

  it("explainability uses stored snapshots matching engine scores", () => {
    const board = sampleBoard();
    const ctx = profitCtx();
    const [rec] = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T20:00:00.000Z",
      ctx
    ).filter((r) => r.recommendation_type === "truck_assignment");

    const instance: FleetRecommendationInstance = {
      ...rec,
      id: "rec-1",
      created_at: "2026-06-24T12:00:00.000Z",
    };

    const explanation = buildRecommendationExplanation(instance, board, ctx);
    const stored = rec.rationale.candidate_snapshots?.[0];

    expect(explanation.recommended?.score).toBe(stored?.score);
    expect(explanation.recommended?.estimated_contribution).toBe(stored?.estimated_contribution);
    expect(explanation.recommended?.factors.profitabilityImpact).toBe(
      stored?.factors.profitabilityImpact
    );
  });
});

describe("validateRecommendationAcceptance", () => {
  it("rejects expired recommendations", () => {
    const board = sampleBoard();
    const rec: FleetRecommendationInstance = {
      id: "r1",
      tenant_id: "t1",
      branch_id: "branch-a",
      recommendation_type: "truck_assignment",
      status: "pending",
      score: 80,
      engine_version: "fleet_rules_v2",
      created_at: "2026-06-24T10:00:00.000Z",
      expires_at: "2026-06-24T10:30:00.000Z",
      rationale: {
        title: "Test",
        reasons: [],
        factors: {
          travelImpact: 80,
          utilizationImpact: 70,
          capacityImpact: 70,
          telematicsFreshness: 90,
        },
        entities: { job_id: "job-1", truck_id: "truck-1" },
      },
    };

    const result = validateRecommendationAcceptance({
      recommendation: rec,
      board,
      now: new Date("2026-06-24T12:00:00.000Z"),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("expired");
  });

  it("rejects when job already assigned elsewhere", () => {
    const board = sampleBoard();
    board.jobs[0].assigned_truck_id = "truck-2";
    board.unassignedJobs = [];

    const rec: FleetRecommendationInstance = {
      id: "r1",
      tenant_id: "t1",
      branch_id: "branch-a",
      recommendation_type: "truck_assignment",
      status: "pending",
      score: 80,
      engine_version: "fleet_rules_v2",
      created_at: "2026-06-24T12:00:00.000Z",
      expires_at: "2026-06-24T23:00:00.000Z",
      rationale: {
        title: "Test",
        reasons: [],
        factors: {
          travelImpact: 80,
          utilizationImpact: 70,
          capacityImpact: 70,
          telematicsFreshness: 90,
        },
        entities: { job_id: "job-1", truck_id: "truck-1" },
      },
    };

    const result = validateRecommendationAcceptance({
      recommendation: rec,
      board,
      now: new Date("2026-06-24T12:00:00.000Z"),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("job_already_assigned");
  });
});

describe("measureRecommendationOutcome", () => {
  it("marks missing actuals as pending, not faked", () => {
    const measured = measureRecommendationOutcome({
      job: null,
      recommendedTruckId: "truck-1",
      estimatedTravelMinutes: 25,
      estimatedContribution: 1200,
      estimatedDeadheadMiles: 8,
      scheduledStart: "2026-06-24T09:00:00.000Z",
    });

    expect(measured.actual_travel_minutes.status).toBe("pending");
    expect(measured.actual_travel_minutes.actual).toBeNull();
    expect(measured.actual_contribution.status).toBe("pending");
  });

  it("records measured assignment when truck matches", () => {
    const measured = measureRecommendationOutcome({
      job: {
        id: "job-1",
        title: "Test",
        status: "scheduled",
        priority: "high",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: "truck-1",
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T09:00:00.000Z",
        scheduled_end: "2026-06-24T11:00:00.000Z",
        revenue_estimate: 5000,
        site_name: null,
        site_latitude: null,
        site_longitude: null,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
      recommendedTruckId: "truck-1",
      estimatedTravelMinutes: 25,
      estimatedContribution: 1200,
      estimatedDeadheadMiles: 8,
      scheduledStart: "2026-06-24T09:00:00.000Z",
    });

    expect(measured.assignment_applied).toBe(true);
    expect(measured.actual_truck_id).toBe("truck-1");
    expect(measured.actual_start_time.status).toBe("pending");
  });
});
