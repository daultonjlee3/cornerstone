import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";
import { hashOperationalSnapshot } from "@/src/lib/fleet-recommendation-engine/snapshot-hash";
import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";
import { syntheticOperatingRules } from "@/src/lib/operational-profitability/queries";

const loadBoardMock = vi.hoisted(() => vi.fn());
const loadProfitCtxMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/fleet/queries/dispatch-board", () => ({
  loadFleetDispatchBoardData: loadBoardMock,
}));

vi.mock("@/src/lib/operational-profitability/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/lib/operational-profitability/queries")>();
  return {
    ...actual,
    loadProfitabilityContext: loadProfitCtxMock,
  };
});

function sampleBoard(): FleetDispatchBoardData {
  return {
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
}

function stalePendingRec(board: FleetDispatchBoardData): FleetRecommendationInstance {
  return {
    id: "rec-stale",
    tenant_id: "tenant-1",
    branch_id: "branch-a",
    recommendation_type: "truck_assignment",
    status: "pending",
    lifecycle: "ready",
    score: 82,
    engine_version: "fleet_rules_v2",
    created_at: "2026-06-24T12:00:00.000Z",
    expires_at: "2026-06-24T23:00:00.000Z",
    rationale: {
      title: "Assign 1004 to Utility daylighting",
      reasons: [],
      factors: {
        travelImpact: 80,
        utilizationImpact: 70,
        capacityImpact: 70,
        telematicsFreshness: 90,
      },
      entities: { job_id: "job-1", truck_id: "truck-1004" },
      candidates: [{ truck_id: "truck-1004", unit_number: "1004", score: 82 }],
      candidate_snapshots: [
        {
          truck_id: "truck-1004",
          unit_number: "1004",
          score: 82,
          factors: {
            travelImpact: 80,
            utilizationImpact: 70,
            capacityImpact: 70,
            telematicsFreshness: 90,
          },
          travel_minutes: 20,
          deadhead_miles: 5,
          current_utilization_pct: 20,
          projected_utilization_pct: 35,
          branch_utilization_pct: 33,
          branch_capacity_label: "Healthy",
          revenue_impact: 6900,
          gps_freshness_pct: 95,
          gps_label: "Current",
          hours_remaining: 8,
          operator_name: "J. Smith",
          branch_name: "Marietta",
          maintenance_status: "Clear",
          truck_type_match: true,
          estimated_contribution: 5980,
          estimated_labor: 900,
          estimated_fuel: 120,
          projected_overtime_cost: 0,
          telematics_status: "online",
        },
      ],
      board_date: board.date,
      snapshot_hash: hashOperationalSnapshot(board),
      generated_at: "2026-06-24T12:00:00.000Z",
    },
  };
}

function createMockSupabase(options: {
  pending: FleetRecommendationInstance[];
  inserted: unknown[];
  updated: Array<Record<string, unknown>>;
}) {
  const state = {
    pending: [...options.pending],
    inserted: options.inserted,
    updated: options.updated,
  };

  const fluentQuery = {
    eq: () => fluentQuery,
    gt: () => fluentQuery,
    lt: () => fluentQuery,
    neq: () => fluentQuery,
    in: () => fluentQuery,
    order: () => fluentQuery,
    limit: () => fluentQuery,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => void) => {
      resolve({ data: state.pending, error: null });
    },
  };

  const expireQuery = {
    eq: () => expireQuery,
    lt: () => expireQuery,
    then: (resolve: (value: unknown) => void) => {
      resolve({ data: [], error: null });
    },
  };

  const from = (table: string) => {
    if (table === "recommendation_instances") {
      return {
        select: (columns?: string) => ({
          eq: () => (columns === "id" ? expireQuery : fluentQuery),
        }),
        insert: (rows: unknown) => {
          state.inserted.push(rows);
          const row = Array.isArray(rows) ? rows[0] : rows;
          const id = `rec-new-${state.inserted.length}`;
          if (row && typeof row === "object") {
            state.pending.push({
              id,
              tenant_id: "tenant-1",
              branch_id: "branch-a",
              recommendation_type: "truck_assignment",
              status: "pending",
              lifecycle: "ready",
              score: Number((row as { score: number }).score),
              engine_version: "fleet_rules_v2",
              created_at: new Date().toISOString(),
              expires_at: (row as { expires_at: string }).expires_at,
              rationale: (row as { rationale: FleetRecommendationInstance["rationale"] }).rationale,
            });
          }
          return {
            select: () => ({
              maybeSingle: () => Promise.resolve({ data: { id }, error: null }),
            }),
            then: (resolve: (value: unknown) => void) =>
              resolve({ data: null, error: null }),
          };
        },
        update: (payload: Record<string, unknown>) => ({
          eq: () => ({
            eq: () => {
              state.updated.push(payload);
              return Promise.resolve({ data: null, error: null });
            },
            in: () => ({
              eq: () => {
                state.updated.push(payload);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
          in: () => ({
            eq: () => {
              state.updated.push(payload);
              return Promise.resolve({ data: null, error: null });
            },
          }),
        }),
      };
    }

    if (table === "recommendation_outcomes") {
      return {
        insert: () => Promise.resolve({ data: null, error: null }),
      };
    }

    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            lt: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    };
  };

  return { from, state } as unknown as SupabaseClient & { state: typeof state };
}

describe("getFleetRecommendations integration", () => {
  beforeEach(() => {
    loadBoardMock.mockReset();
    loadProfitCtxMock.mockReset();
    loadProfitCtxMock.mockResolvedValue({
      rules: syntheticOperatingRules("tenant-1", "tenant-1"),
      truckProfiles: new Map(),
      typeProfiles: new Map(),
      operatorDailyHours: new Map(),
      operatorWeeklyHours: new Map(),
    });
  });

  it("invalidates stale truck rec, cascades replacement, and returns notice", async () => {
    const board = sampleBoard();
    board.truckLanes = board.truckLanes.map((lane) =>
      lane.truck_id === "truck-1004"
        ? { ...lane, telematics_status: "offline" as const }
        : lane
    );

    loadBoardMock.mockResolvedValue(board);

    const inserted: unknown[] = [];
    const updated: Array<Record<string, unknown>> = [];
    const supabase = createMockSupabase({
      pending: [stalePendingRec(sampleBoard())],
      inserted,
      updated,
    });

    const response = await getFleetRecommendations(supabase, "tenant-1", {
      date: "2026-06-24",
    });

    expect(response.pending.length).toBeGreaterThan(0);
    expect(response.pending[0].rationale.entities.truck_id).not.toBe("truck-1004");
    expect(response.recalculationNotice).toBeDefined();
    expect(response.recalculationNotice?.invalidated_count).toBe(1);
    expect(response.recalculationNotice?.replacements?.[0]?.new_unit_number).toBe("1012");
    expect(updated.some((row) => row.lifecycle === "failed" || row.status === "failed")).toBe(
      true
    );
    expect(inserted.length).toBeGreaterThan(0);
    expect(response.pending[0].lifecycle).toBe("displayed");
    expect(response.pending[0].rationale.validation_health?.ranking_score).toBeDefined();
  });

  it("regenerates when no valid pending recommendations remain", async () => {
    const board = sampleBoard();
    loadBoardMock.mockResolvedValue(board);

    const inserted: unknown[] = [];
    const supabase = createMockSupabase({
      pending: [],
      inserted,
      updated: [],
    });

    const response = await getFleetRecommendations(supabase, "tenant-1", {
      date: "2026-06-24",
    });

    expect(inserted.length).toBeGreaterThan(0);
    expect(response.pending.length).toBeGreaterThan(0);
  });
});
