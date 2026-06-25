import { describe, expect, it } from "vitest";
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
        branch_name: "Branch A",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T09:00:00.000Z",
        scheduled_end: "2026-06-24T11:00:00.000Z",
        revenue_estimate: 1200,
        site_name: "Site 1",
        site_latitude: 29.75,
        site_longitude: -95.37,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
      {
        id: "job-2",
        title: "Hydrovac follow-up",
        status: "unassigned",
        priority: "medium",
        branch_id: "branch-a",
        branch_name: "Branch A",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T12:00:00.000Z",
        scheduled_end: "2026-06-24T14:00:00.000Z",
        revenue_estimate: 900,
        site_name: "Site 2",
        site_latitude: 29.78,
        site_longitude: -95.39,
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
        branch_name: "Branch A",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T09:00:00.000Z",
        scheduled_end: "2026-06-24T11:00:00.000Z",
        revenue_estimate: 1200,
        site_name: "Site 1",
        site_latitude: 29.75,
        site_longitude: -95.37,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
      {
        id: "job-2",
        title: "Hydrovac follow-up",
        status: "unassigned",
        priority: "medium",
        branch_id: "branch-a",
        branch_name: "Branch A",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T12:00:00.000Z",
        scheduled_end: "2026-06-24T14:00:00.000Z",
        revenue_estimate: 900,
        site_name: "Site 2",
        site_latitude: 29.78,
        site_longitude: -95.39,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    truckLanes: [
      {
        truck_id: "truck-1",
        unit_number: "Truck 14",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        status: "active",
        committed_hours: 2,
        available_hours: 10,
        utilization: 0.2,
        jobs: [],
        latitude: 29.76,
        longitude: -95.36,
        telematics_status: "online",
      },
      {
        truck_id: "truck-2",
        unit_number: "Truck 22",
        truck_type: "hydrovac",
        branch_id: "branch-b",
        status: "active",
        committed_hours: 0,
        available_hours: 10,
        utilization: 0,
        jobs: [],
        latitude: 29.9,
        longitude: -95.5,
        telematics_status: "stale",
      },
    ],
    branchCapacity: [
      {
        branch_id: "branch-a",
        branch_name: "Branch A",
        available_truck_hours: 10,
        committed_hours: 14,
        utilization: 1.4,
      },
      {
        branch_id: "branch-b",
        branch_name: "Branch B",
        available_truck_hours: 10,
        committed_hours: 3,
        utilization: 0.3,
      },
    ],
  };
}

describe("buildFleetRecommendationsFromBoard", () => {
  it("builds deterministic explainable recommendations", () => {
    const expiresAt = "2026-06-24T18:00:00.000Z";
    const first = buildFleetRecommendationsFromBoard("tenant-1", sampleBoard(), expiresAt);
    const second = buildFleetRecommendationsFromBoard("tenant-1", sampleBoard(), expiresAt);

    const normalize = (recs: ReturnType<typeof buildFleetRecommendationsFromBoard>) =>
      recs.map((r) => ({
        ...r,
        rationale: { ...r.rationale, generated_at: "fixed" },
      }));

    expect(normalize(first)).toEqual(normalize(second));
    expect(first.length).toBeGreaterThan(0);
    for (const recommendation of first) {
      expect(recommendation.score).toBeGreaterThanOrEqual(0);
      expect(recommendation.score).toBeLessThanOrEqual(100);
      expect(recommendation.rationale.reasons.length).toBeGreaterThan(0);
      expect(recommendation.rationale.factors).toMatchObject({
        travelImpact: expect.any(Number),
        utilizationImpact: expect.any(Number),
        capacityImpact: expect.any(Number),
        telematicsFreshness: expect.any(Number),
      });
    }
  });

  it("emits all v1 recommendation types when signals exist", () => {
    const results = buildFleetRecommendationsFromBoard(
      "tenant-1",
      sampleBoard(),
      "2026-06-24T18:00:00.000Z"
    );
    const types = new Set(results.map((r) => r.recommendation_type));

    expect(types.has("truck_assignment")).toBe(true);
    expect(types.has("capacity_overload")).toBe(true);
    expect(types.has("idle_truck_match")).toBe(true);
  });
});
