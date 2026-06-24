/**
 * Sprint 3 fleet mart and deadhead tests.
 * Run: npx vitest run tests/sprint-3-fleet-marts.test.ts
 */

import { describe, it, expect } from "vitest";
import { estimateDeadheadMiles } from "../src/lib/fleet/marts/deadhead";

describe("estimateDeadheadMiles", () => {
  it("returns null when coordinates are missing", () => {
    expect(
      estimateDeadheadMiles({ latitude: null, longitude: null }, { latitude: 40, longitude: -74 })
    ).toBeNull();
    expect(
      estimateDeadheadMiles({ latitude: 40, longitude: -74 }, { latitude: null, longitude: null })
    ).toBeNull();
  });

  it("returns estimated miles and travel minutes with isEstimated flag", () => {
    const result = estimateDeadheadMiles(
      { latitude: 40.7128, longitude: -74.006 },
      { latitude: 40.758, longitude: -73.9855 }
    );
    expect(result).not.toBeNull();
    expect(result?.isEstimated).toBe(true);
    expect(result!.miles).toBeGreaterThan(0);
    expect(result!.travelMinutes).toBeGreaterThanOrEqual(0);
  });

  it("labels deadhead as heuristic (isEstimated always true)", () => {
    const result = estimateDeadheadMiles(
      { latitude: 34.05, longitude: -118.25 },
      { latitude: 34.15, longitude: -118.35 }
    );
    expect(result?.isEstimated).toBe(true);
  });
});

describe("utilizationReportToCsvRows", () => {
  it("includes estimated deadhead column label", async () => {
    const { utilizationReportToCsvRows } = await import(
      "../src/lib/fleet/queries/utilization-report"
    );
    const { columns } = utilizationReportToCsvRows({
      from: "2026-04-01",
      to: "2026-04-07",
      rows: [],
      weekOverWeek: [],
      summary: { totalRevenue: 0, avgUtilizationPercent: null, totalDeadheadMiles: 0 },
    });
    expect(columns.some((c) => c.label.includes("estimated"))).toBe(true);
  });
});
