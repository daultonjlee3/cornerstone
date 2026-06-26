import { describe, expect, it } from "vitest";
import {
  evaluateOperatorHardConstraints,
  evaluateTruckJobHardConstraints,
  filterEligibleTrucksForJob,
} from "@/src/lib/fleet-recommendation-engine/constraints";
import { dedupeRecommendationsByJobAndType, rankTruckCandidatesForJob } from "@/src/lib/fleet-recommendation-engine/pipeline";
import { buildFleetRecommendationsFromBoard } from "@/src/lib/fleet-recommendation-engine/service";
import {
  validateRecommendationInstance,
} from "@/src/lib/fleet-recommendation-engine/validation-engine";
import { syntheticOperatingRules } from "@/src/lib/operational-profitability/queries";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";

function sampleBoard(overrides?: Partial<FleetDispatchBoardData>): FleetDispatchBoardData {
  const base: FleetDispatchBoardData = {
    date: "2026-06-24",
    jobs: [
      {
        id: "job-1",
        title: "Utility daylighting",
        status: "unassigned",
        priority: "urgent",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T17:00:00.000Z",
        scheduled_end: "2026-06-24T23:00:00.000Z",
        revenue_estimate: 6900,
        site_name: "Site 1",
        site_latitude: 33.75,
        site_longitude: -84.55,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    unassignedJobs: [
      {
        id: "job-1",
        title: "Utility daylighting",
        status: "unassigned",
        priority: "urgent",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: "2026-06-24T17:00:00.000Z",
        scheduled_end: "2026-06-24T23:00:00.000Z",
        revenue_estimate: 6900,
        site_name: "Site 1",
        site_latitude: 33.75,
        site_longitude: -84.55,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    truckLanes: [
      {
        truck_id: "truck-1004",
        unit_number: "1004",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        committed_hours: 2,
        available_hours: 10,
        utilization: 0.2,
        jobs: [],
        latitude: 33.76,
        longitude: -84.54,
        telematics_status: "online",
        operator_name: "J. Smith",
      },
      {
        truck_id: "truck-1012",
        unit_number: "1012",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        committed_hours: 1,
        available_hours: 10,
        utilization: 0.15,
        jobs: [],
        latitude: 33.77,
        longitude: -84.53,
        telematics_status: "online",
        operator_name: "A. Lee",
      },
    ],
    branchCapacity: [
      {
        branch_id: "branch-a",
        branch_name: "Marietta",
        available_truck_hours: 30,
        committed_hours: 10,
        utilization: 0.33,
      },
    ],
  };
  return { ...base, ...overrides };
}

function profitCtx(): ProfitabilityContext {
  return {
    rules: syntheticOperatingRules("tenant-1", "tenant-1"),
    truckProfiles: new Map(),
    typeProfiles: new Map(),
    operatorDailyHours: new Map(),
    operatorWeeklyHours: new Map(),
  };
}

function assignmentRec(truckId: string, unitNumber: string): FleetRecommendationInstance {
  return {
    id: "rec-1",
    tenant_id: "tenant-1",
    branch_id: "branch-a",
    recommendation_type: "truck_assignment",
    status: "pending",
    score: 82,
    engine_version: "fleet_rules_v2",
    created_at: "2026-06-24T12:00:00.000Z",
    expires_at: "2026-06-24T23:00:00.000Z",
    rationale: {
      title: `Assign ${unitNumber} to Utility daylighting`,
      reasons: [],
      factors: {
        travelImpact: 80,
        utilizationImpact: 70,
        capacityImpact: 70,
        telematicsFreshness: 90,
      },
      entities: { job_id: "job-1", truck_id: truckId },
      candidates: [{ truck_id: truckId, unit_number: unitNumber, score: 82 }],
      board_date: "2026-06-24",
      generated_at: "2026-06-24T12:00:00.000Z",
      job_snapshot: {
        job_id: "job-1",
        status: "unassigned",
        assigned_truck_id: null,
        priority: "urgent",
        revenue_estimate: 6900,
        required_truck_type: "hydrovac",
      },
    },
  };
}

describe("hard constraints", () => {
  it("eliminates offline trucks", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = { ...board.truckLanes[0], telematics_status: "offline" as const };
    const result = evaluateTruckJobHardConstraints({ job, lane, board });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("truck_gps_offline");
  });

  it("eliminates trucks in maintenance", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = {
      ...board.truckLanes[0],
      status: "maintenance" as const,
      maintenance_note: "PM due",
    };
    const result = evaluateTruckJobHardConstraints({ job, lane, board });
    expect(result.ok).toBe(false);
  });

  it("eliminates wrong equipment", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = { ...board.truckLanes[0], truck_type: "vacuum" };
    const result = evaluateTruckJobHardConstraints({ job, lane, board });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("truck_wrong_equipment");
  });

  it("eliminates operators on PTO", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = {
      ...board.truckLanes[0],
      operator_id: "op-1",
      operator_name: "J. Smith",
      operator_on_pto: true,
    };
    const result = evaluateOperatorHardConstraints({ job, lane });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("driver_on_pto");
  });

  it("eliminates operators missing certification", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = {
      ...board.truckLanes[0],
      operator_id: "op-1",
      operator_certifications: [],
      operator_truck_qualifications: ["vacuum"],
    };
    const result = evaluateOperatorHardConstraints({ job, lane });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("certification_missing");
  });

  it("eliminates trucks already dispatched on another job", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = {
      ...board.truckLanes[0],
      jobs: [
        {
          id: "other-job",
          title: "Other",
          status: "in_progress" as const,
          priority: "high",
          branch_id: "branch-a",
          branch_name: "Marietta",
          assigned_truck_id: "truck-1004",
          required_truck_type: "hydrovac",
          scheduled_start: "2026-06-24T12:00:00.000Z",
          scheduled_end: "2026-06-24T14:00:00.000Z",
          revenue_estimate: 1000,
          site_name: null,
          site_latitude: null,
          site_longitude: null,
          estimated_deadhead_miles: null,
          estimated_travel_minutes: null,
        },
      ],
    };
    const result = evaluateTruckJobHardConstraints({ job, lane, board });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("truck_already_dispatched");
  });
});

describe("validation pipeline — read time", () => {
  const validationNow = new Date("2026-06-24T14:00:00.000Z");

  it("invalidates when truck goes offline after generation", () => {
    const board = sampleBoard({
      truckLanes: sampleBoard().truckLanes.map((lane) =>
        lane.truck_id === "truck-1004"
          ? { ...lane, telematics_status: "offline" as const }
          : lane
      ),
    });
    const result = validateRecommendationInstance({
      recommendation: assignmentRec("truck-1004", "1004"),
      board,
      now: validationNow,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("truck_gps_offline");
      expect(result.health.status).toBe("invalid");
      expect(result.health.lifecycle).toBe("invalid");
    }
  });

  it("invalidates when job assigned elsewhere", () => {
    const board = sampleBoard({
      jobs: [
        {
          ...sampleBoard().jobs[0],
          assigned_truck_id: "truck-1012",
          status: "scheduled",
        },
      ],
      unassignedJobs: [],
    });
    const result = validateRecommendationInstance({
      recommendation: assignmentRec("truck-1004", "1004"),
      board,
      now: validationNow,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("job_already_assigned");
  });

  it("invalidates when board date mismatches", () => {
    const board = sampleBoard({ date: "2026-06-25" });
    const result = validateRecommendationInstance({
      recommendation: assignmentRec("truck-1004", "1004"),
      board,
      now: validationNow,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("board_date_mismatch");
  });

  it("passes for valid executable assignment", () => {
    const board = sampleBoard();
    const result = validateRecommendationInstance({
      recommendation: assignmentRec("truck-1004", "1004"),
      board,
      now: validationNow,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.health.status).toBe("valid");
      expect(result.health.lifecycle).toBe("ready");
      expect(result.health.constraint_count).toBe(0);
      expect(result.health.ranking_score).toBe(82);
      expect(result.health.confidence).toBeGreaterThan(0);
    }
  });
});

describe("generation uses hard constraints", () => {
  const validationNow = new Date("2026-06-24T14:00:00.000Z");

  it("never recommends offline trucks", () => {
    const board = sampleBoard({
      truckLanes: sampleBoard().truckLanes.map((lane) => ({
        ...lane,
        telematics_status: "offline" as const,
      })),
    });
    const generated = buildFleetRecommendationsFromBoard(
      "tenant-1",
      board,
      "2026-06-24T23:00:00.000Z",
      profitCtx()
    );
    const assignments = generated.filter((r) => r.recommendation_type === "truck_assignment");
    expect(assignments.length).toBe(0);
  });

  it("ranks only eligible trucks", () => {
    const board = sampleBoard();
    const job = board.jobs[0];
    const ranked = rankTruckCandidatesForJob({
      job,
      board,
      profitCtx: profitCtx(),
      now: validationNow,
    });
    expect(ranked.length).toBe(2);
    expect(ranked[0].lane.unit_number).toBeTruthy();
    const eligible = filterEligibleTrucksForJob(job, board, validationNow);
    expect(eligible.length).toBe(2);
  });
});

describe("deduplication", () => {
  it("keeps highest score per job and type", () => {
    const recA = assignmentRec("truck-1004", "1004");
    const recB = { ...assignmentRec("truck-1012", "1012"), score: 90 };
    const deduped = dedupeRecommendationsByJobAndType([recA, recB]);
    expect(deduped.length).toBe(1);
    expect(deduped[0].rationale.entities.truck_id).toBe("truck-1012");
  });
});
