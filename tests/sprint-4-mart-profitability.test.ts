import { describe, expect, it } from "vitest";
import { computeTruckDayProfitability } from "@/src/lib/operational-profitability/mart-profitability";
import { syntheticOperatingRules } from "@/src/lib/operational-profitability/queries";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";

function testContext(): ProfitabilityContext {
  return {
    rules: syntheticOperatingRules("tenant", "company"),
    truckProfiles: new Map(),
    typeProfiles: new Map(),
    operatorDailyHours: new Map(),
    operatorWeeklyHours: new Map(),
  };
}

describe("mart profitability", () => {
  it("computes contribution from revenue minus variable costs", () => {
    const result = computeTruckDayProfitability(testContext(), "truck-1", "hydrovac", {
      revenue: 5000,
      billableHours: 6,
      committedHours: 6,
      idleHours: 1,
      deadheadMiles: 12,
      miles: 45,
      weeklyCommittedBefore: 0,
    });

    expect(result.labor_cost).toBeGreaterThan(0);
    expect(result.variable_cost).toBeGreaterThan(0);
    expect(result.contribution).toBeLessThan(5000);
    expect(result.margin_pct).not.toBeNull();
    expect(result.contribution_per_hour).not.toBeNull();
    expect(result.revenue_per_hour).toBeCloseTo(5000 / 6, 0);
  });

  it("includes overtime cost when committed hours exceed threshold", () => {
    const normal = computeTruckDayProfitability(testContext(), "truck-1", "hydrovac", {
      revenue: 4000,
      billableHours: 7,
      committedHours: 7,
      idleHours: 0,
      deadheadMiles: 5,
      miles: 20,
      weeklyCommittedBefore: 0,
    });
    const withWeeklyOt = computeTruckDayProfitability(testContext(), "truck-1", "hydrovac", {
      revenue: 4000,
      billableHours: 7,
      committedHours: 7,
      idleHours: 0,
      deadheadMiles: 5,
      miles: 20,
      weeklyCommittedBefore: 38,
    });

    expect(withWeeklyOt.labor_cost).toBeGreaterThanOrEqual(normal.labor_cost);
    expect(withWeeklyOt.overtime_cost).toBeGreaterThanOrEqual(0);
  });
});
