import { describe, expect, it } from "vitest";
import { buildJobSpatialIndex } from "@/src/lib/fleet/dispatch/spatial-index";
import {
  applyOptimisticBulkAssignments,
  applyOptimisticFleetAssignment,
} from "@/src/lib/fleet/dispatch/optimistic-board";
import type { FleetDispatchBoardData } from "@/src/types/fleet";

function sampleBoard(): FleetDispatchBoardData {
  return {
    date: "2026-06-24",
    jobs: [
      {
        id: "job-1",
        title: "Job A",
        status: "unassigned",
        priority: "high",
        branch_id: "b1",
        branch_name: "Main",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: null,
        scheduled_end: null,
        revenue_estimate: 5000,
        site_name: "Site",
        site_latitude: 33.75,
        site_longitude: -84.39,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
      {
        id: "job-2",
        title: "Job B",
        status: "unassigned",
        priority: "medium",
        branch_id: "b1",
        branch_name: "Main",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: null,
        scheduled_end: null,
        revenue_estimate: 3000,
        site_name: "Site B",
        site_latitude: 33.76,
        site_longitude: -84.38,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    unassignedJobs: [],
    truckLanes: [
      {
        truck_id: "truck-1",
        unit_number: "101",
        truck_type: "hydrovac",
        branch_id: "b1",
        branch_name: "Main",
        status: "active",
        committed_hours: 2,
        available_hours: 10,
        utilization: 0.2,
        jobs: [],
        latitude: 33.74,
        longitude: -84.4,
        telematics_status: "online",
      },
    ],
    branchCapacity: [],
  };
}

describe("job spatial index", () => {
  it("finds nearest job within threshold", () => {
    const index = buildJobSpatialIndex([
      { id: "job-1", site_latitude: 33.75, site_longitude: -84.39 },
      { id: "job-2", site_latitude: 33.9, site_longitude: -84.5 },
    ]);
    expect(index.findNearest(-84.389, 33.751)).toBe("job-1");
    expect(index.findNearest(-84.0, 34.0)).toBeNull();
  });
});

describe("optimistic fleet assignment", () => {
  it("moves job off unassigned list immediately", () => {
    const board = {
      ...sampleBoard(),
      unassignedJobs: sampleBoard().jobs,
    };
    const next = applyOptimisticFleetAssignment(board, "truck-1", "job-1");
    expect(next.unassignedJobs.map((j) => j.id)).toEqual(["job-2"]);
    expect(next.jobs.find((j) => j.id === "job-1")?.assigned_truck_id).toBe("truck-1");
    expect(next.truckLanes[0]?.jobs.some((j) => j.id === "job-1")).toBe(true);
  });

  it("applies bulk pairs in sequence", () => {
    const board = {
      ...sampleBoard(),
      unassignedJobs: sampleBoard().jobs,
    };
    const next = applyOptimisticBulkAssignments(board, [
      { truckId: "truck-1", jobId: "job-1" },
      { truckId: "truck-1", jobId: "job-2" },
    ]);
    expect(next.unassignedJobs).toHaveLength(0);
  });
});
