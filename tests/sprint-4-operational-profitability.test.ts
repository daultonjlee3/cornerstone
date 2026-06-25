import { describe, expect, it } from "vitest";
import { computeIncrementalLaborCost } from "../src/lib/operational-profitability/labor";
import { DEFAULT_OPERATING_RULES, syntheticOperatingRules } from "../src/lib/operational-profitability/queries";

describe("operational profitability labor", () => {
  it("avoids overtime when hours remain under threshold", () => {
    const rules = syntheticOperatingRules("t1", "c1");
    const result = computeIncrementalLaborCost({
      rules,
      hourlyRate: 50,
      jobHours: 2,
      dailyHoursBefore: 4,
      weeklyHoursBefore: 20,
    });
    expect(result.overtime_hours).toBe(0);
    expect(result.total_cost).toBe(100);
  });

  it("applies overtime when daily threshold exceeded", () => {
    const rules = syntheticOperatingRules("t1", "c1");
    const result = computeIncrementalLaborCost({
      rules,
      hourlyRate: 50,
      jobHours: 3,
      dailyHoursBefore: 7,
      weeklyHoursBefore: 30,
    });
    expect(result.overtime_hours).toBeGreaterThan(0);
    expect(result.total_cost).toBeGreaterThan(150);
  });
});

describe("DEFAULT_OPERATING_RULES", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_OPERATING_RULES.overtime_multiplier).toBe(1.5);
    expect(DEFAULT_OPERATING_RULES.fuel_cost_per_mile).toBeGreaterThan(0);
  });
});
