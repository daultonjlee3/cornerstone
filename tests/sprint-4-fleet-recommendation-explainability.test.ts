import { describe, expect, it } from "vitest";
import { buildRecommendationExplanation } from "../src/lib/fleet-recommendation-engine/explainability";
import { buildFleetRecommendationsFromBoard } from "../src/lib/fleet-recommendation-engine/service";
import type { FleetDispatchBoardData } from "../src/types/fleet";

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
      {
        truck_id: "truck-3",
        unit_number: "1022",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        committed_hours: 8.5,
        available_hours: 10,
        utilization: 0.85,
        jobs: [],
        latitude: 29.8,
        longitude: -95.42,
        telematics_status: "online",
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

describe("buildRecommendationExplanation", () => {
  it("builds comparison rows and winner reasons for truck assignment", () => {
    const board = sampleBoard();
    const [rec] = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T18:00:00.000Z"
    ).filter((r) => r.recommendation_type === "truck_assignment");

    expect(rec).toBeDefined();
    const explanation = buildRecommendationExplanation(
      {
        ...rec!,
        id: "rec-test",
        created_at: "2026-06-24T12:00:00.000Z",
      },
      board
    );

    expect(explanation.recommended?.unitNumber).toBe("1016");
    expect(explanation.alternatives.length).toBeGreaterThan(0);
    expect(explanation.comparisonRows.length).toBeGreaterThan(5);
    expect(explanation.winnerReasons.length).toBeGreaterThan(0);
    expect(explanation.loserReasons.length).toBeGreaterThan(0);
    expect(explanation.confidenceExplanation.length).toBeGreaterThan(10);
    expect(explanation.ignoreRisk).toMatch(/revenue at risk/i);
    expect(explanation.factorScores.some((f) => f.label === "Travel")).toBe(true);
  });

  it("highlights winning comparison values", () => {
    const board = sampleBoard();
    const [rec] = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T18:00:00.000Z"
    ).filter((r) => r.recommendation_type === "truck_assignment");
    const explanation = buildRecommendationExplanation(
      {
        ...rec!,
        id: "rec-test",
        created_at: "2026-06-24T12:00:00.000Z",
      },
      board
    );
    const scoreRow = explanation.comparisonRows.find((row) => row.key === "score");
    expect(scoreRow?.winnerIndex).toBe(0);
  });
});
