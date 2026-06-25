import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadReadinessSnapshot } from "../src/lib/integrations/readiness-service";
import { loadBaselineSnapshot } from "../src/lib/integrations/baseline-service";

function createSupabaseStub(): SupabaseClient {
  const countBuilder = (count: number) => ({
    eq: () => countBuilder(count),
    in: () => countBuilder(count),
    not: () => countBuilder(count),
    gte: () => countBuilder(count),
    lte: () => countBuilder(count),
    neq: () => countBuilder(count),
    then: (resolve: (value: unknown) => unknown) => resolve({ count, error: null }),
  });

  const listBuilder = <T>(rows: T[]) => ({
    eq: () => listBuilder(rows),
    gte: () => listBuilder(rows),
    lte: () => listBuilder(rows),
    order: () => listBuilder(rows),
    limit: () => listBuilder(rows),
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve: (value: unknown) => unknown) => resolve({ data: rows, error: null }),
  });

  return {
    from: (table: string) => {
      if (table === "integration_connections") {
        return { select: () => countBuilder(2) };
      }
      if (table === "integration_import_batches") {
        return { select: () => countBuilder(3) };
      }
      if (table === "fleet_jobs") {
        return { select: () => countBuilder(24) };
      }
      if (table === "trucks") {
        return { select: () => countBuilder(8) };
      }
      if (table === "recommendation_instances") {
        return { select: () => countBuilder(4) };
      }
      if (table === "utilization_daily") {
        return {
          select: () =>
            listBuilder([
              {
                refreshed_at: new Date().toISOString(),
                revenue: 1000,
                billable_hours: 20,
                total_hours: 30,
                deadhead_miles: 12,
                contribution: 300,
              },
            ]),
        };
      }
      if (table === "branch_capacity_snapshots") {
        return {
          select: () =>
            listBuilder([
              { available_truck_hours: 100, committed_hours: 75 },
              { available_truck_hours: 90, committed_hours: 72 },
            ]),
        };
      }
      if (table === "fleet_operators") {
        return { select: () => countBuilder(6) };
      }
      return {
        select: () => listBuilder([]),
      };
    },
  } as unknown as SupabaseClient;
}

describe("Sprint 5A readiness service", () => {
  it("returns readiness and implementation percentages", async () => {
    const supabase = createSupabaseStub();
    const snapshot = await loadReadinessSnapshot(supabase, "tenant-1");

    expect(snapshot.readinessScorePct).toBeGreaterThan(0);
    expect(snapshot.implementationProgressPct).toBeGreaterThan(0);
    expect(snapshot.checks).toHaveLength(5);
  });
});

describe("Sprint 5A baseline service", () => {
  it("returns baseline metrics with estimated flags", async () => {
    const supabase = createSupabaseStub();
    const baseline = await loadBaselineSnapshot(supabase, "tenant-1", 90);

    expect(baseline.metrics.some((metric) => metric.key === "revenue_per_truck")).toBe(true);
    expect(baseline.metrics.some((metric) => metric.estimated)).toBe(true);
    expect(baseline.windowDays).toBe(90);
  });
});
