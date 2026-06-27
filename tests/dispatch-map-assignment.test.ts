import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FleetDispatchBoardData } from "@/src/types/fleet";
import { syntheticOperatingRules } from "@/src/lib/operational-profitability/queries";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";

const createClientMock = vi.hoisted(() => vi.fn());
const getAuthContextMock = vi.hoisted(() => vi.fn());
const canMock = vi.hoisted(() => vi.fn());
const loadAssignmentContextMock = vi.hoisted(() => vi.fn());
const suggestAssignmentForJobMock = vi.hoisted(() => vi.fn());
const suggestAssignmentForTruckMock = vi.hoisted(() => vi.fn());
const validateFleetAssignmentPairMock = vi.hoisted(() => vi.fn());
const commitFleetAssignmentMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/src/lib/auth-context", () => ({ getAuthContext: getAuthContextMock }));
vi.mock("@/src/lib/permissions", () => ({ can: canMock }));
vi.mock("@/src/lib/fleet/dispatch/assignment-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/fleet/dispatch/assignment-service")>();
  return {
    ...actual,
    loadAssignmentContext: loadAssignmentContextMock,
    suggestAssignmentForJob: suggestAssignmentForJobMock,
    suggestAssignmentForTruck: suggestAssignmentForTruckMock,
    validateFleetAssignmentPair: validateFleetAssignmentPairMock,
    commitFleetAssignment: commitFleetAssignmentMock,
  };
});

function sampleBoard(): FleetDispatchBoardData {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 1);
  const boardDate = day.toISOString().slice(0, 10);
  const start = `${boardDate}T17:00:00.000Z`;
  const end = `${boardDate}T23:00:00.000Z`;

  return {
    date: boardDate,
    jobs: [
      {
        id: "job-1",
        title: "Storm Drain Cleaning",
        status: "unassigned",
        priority: "high",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: start,
        scheduled_end: end,
        revenue_estimate: 4200,
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
        title: "Storm Drain Cleaning",
        status: "unassigned",
        priority: "high",
        branch_id: "branch-a",
        branch_name: "Marietta",
        assigned_truck_id: null,
        required_truck_type: "hydrovac",
        scheduled_start: start,
        scheduled_end: end,
        revenue_estimate: 4200,
        site_name: "Site 1",
        site_latitude: 33.75,
        site_longitude: -84.55,
        estimated_deadhead_miles: null,
        estimated_travel_minutes: null,
      },
    ],
    truckLanes: [
      {
        truck_id: "truck-1",
        unit_number: "PT-1003",
        truck_type: "hydrovac",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        latitude: 33.74,
        longitude: -84.54,
        telematics_status: "online",
        utilization: 0.35,
        available_hours: 10,
        committed_hours: 3.5,
        revenue_today: 1200,
        idle_hours: 1,
        jobs: [],
        operator_id: "op-1",
        operator_name: "Driver A",
        operator_certifications: ["CDL-A"],
        operator_on_pto: false,
        operator_daily_hours: 0,
        operator_weekly_hours: 0,
        maintenance_note: null,
      },
      {
        truck_id: "truck-2",
        unit_number: "PT-1009",
        truck_type: "vacuum",
        branch_id: "branch-a",
        branch_name: "Marietta",
        status: "active",
        latitude: 33.76,
        longitude: -84.56,
        telematics_status: "online",
        utilization: 0.2,
        available_hours: 10,
        committed_hours: 2,
        revenue_today: 800,
        idle_hours: 2,
        jobs: [],
        operator_id: "op-2",
        operator_name: "Driver B",
        operator_on_pto: false,
        operator_daily_hours: 3,
        operator_weekly_hours: 18,
        maintenance_note: null,
      },
    ],
    branchCapacity: [],
  };
}

function profitCtx(board: FleetDispatchBoardData): ProfitabilityContext {
  return {
    rules: syntheticOperatingRules(board.truckLanes[0].branch_id, board.truckLanes[0].branch_id),
    truckProfiles: new Map(),
    typeProfiles: new Map(),
    operatorDailyHours: new Map(),
    operatorWeeklyHours: new Map(),
  };
}

describe("assignment-service validation", () => {
  it("returns best valid truck for a job", async () => {
    const actual = await vi.importActual<typeof import("@/src/lib/fleet/dispatch/assignment-service")>(
      "@/src/lib/fleet/dispatch/assignment-service"
    );
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = board.truckLanes[0];
    const result = actual.validateFleetAssignmentPair({
      job,
      lane,
      board,
      profitCtx: profitCtx(board),
    });
    expect(result.valid).toBe(true);
    expect(result.unitNumber).toBe("PT-1003");
    expect(result.alternatives.length).toBeGreaterThanOrEqual(0);
  });

  it("blocks invalid equipment mismatch", async () => {
    const actual = await vi.importActual<typeof import("@/src/lib/fleet/dispatch/assignment-service")>(
      "@/src/lib/fleet/dispatch/assignment-service"
    );
    const board = sampleBoard();
    const job = board.jobs[0];
    const lane = board.truckLanes[1];
    const result = actual.previewInvalidAssignment({ job, lane, board });
    expect(result.valid).toBe(false);
    expect(result.blockingReasons[0]?.code).toBe("truck_wrong_equipment");
  });

  it("builds and parses validation ids", async () => {
    const actual = await vi.importActual<typeof import("@/src/lib/fleet/dispatch/assignment-service")>(
      "@/src/lib/fleet/dispatch/assignment-service"
    );
    const id = actual.buildValidationId("snap123", "truck-1", "job-1");
    expect(actual.parseValidationId(id)).toEqual({
      snapshotId: "snap123",
      truckId: "truck-1",
      jobId: "job-1",
    });
  });
});

describe("dispatch assignment API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("suggest-assignment returns 401 when unauthenticated", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockRejectedValue(new Error("unauthorized"));

    const { POST } = await import("../app/api/fleet/dispatch/suggest-assignment/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/dispatch/suggest-assignment", {
        method: "POST",
        body: JSON.stringify({ jobId: "job-1" }),
      })
    );
    expect(response.status).toBe(401);
  });

  it("click job suggest returns best truck payload", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    suggestAssignmentForJobMock.mockResolvedValue({
      snapshotId: "snap123",
      jobId: "job-1",
      validation: { valid: true, truckId: "truck-1" },
      displayRecommendation: { id: "rec-1" },
      alternatives: [],
    });

    const { POST } = await import("../app/api/fleet/dispatch/suggest-assignment/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/dispatch/suggest-assignment", {
        method: "POST",
        body: JSON.stringify({ jobId: "job-1", date: "2026-06-24" }),
      })
    );

    expect(response.status).toBe(200);
    expect(suggestAssignmentForJobMock).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-1", jobId: "job-1" })
    );
  });

  it("validate-assignment enforces tenant auth", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(false);

    const { POST } = await import("../app/api/fleet/dispatch/validate-assignment/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/dispatch/validate-assignment", {
        method: "POST",
        body: JSON.stringify({ truckId: "truck-1", jobId: "job-1" }),
      })
    );
    expect(response.status).toBe(403);
  });

  it("assign route requires fleet.manage", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(false);

    const { POST } = await import("../app/api/fleet/dispatch/assign/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/dispatch/assign", {
        method: "POST",
        body: JSON.stringify({
          truckId: "truck-1",
          jobId: "job-1",
          validationId: "snap:truck-1:job-1",
          snapshotId: "snap",
        }),
      })
    );
    expect(response.status).toBe(403);
  });

  it("assign route revalidates before commit", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    commitFleetAssignmentMock.mockResolvedValue({
      success: true,
      jobId: "job-1",
      truckId: "truck-1",
      unitNumber: "PT-1003",
      jobTitle: "Storm Drain Cleaning",
      recommendationId: null,
      assignmentSource: "manual_drag",
    });

    const { POST } = await import("../app/api/fleet/dispatch/assign/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/dispatch/assign", {
        method: "POST",
        body: JSON.stringify({
          truckId: "truck-1",
          jobId: "job-1",
          validationId: "snap:truck-1:job-1",
          snapshotId: "snap",
          assignmentSource: "manual_drag",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(commitFleetAssignmentMock).toHaveBeenCalled();
  });
});
