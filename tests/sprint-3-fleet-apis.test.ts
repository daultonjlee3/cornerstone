/**
 * Sprint 3 fleet API shape tests (module-level).
 * Run: npx vitest run tests/sprint-3-fleet-apis.test.ts
 */

import { describe, it, expect } from "vitest";
import type {
  FleetCommandCenterData,
  FleetDispatchBoardData,
  FleetUtilizationReportData,
} from "../src/types/fleet";

describe("Fleet API response shapes", () => {
  it("FleetCommandCenterData has required KPI fields", () => {
    const sample: FleetCommandCenterData = {
      activeTrucks: 5,
      idleTrucks: 2,
      jobsToday: 10,
      unassignedJobs: 3,
      utilizationPercent: 72.5,
      revenuePerTruckMtd: 4200,
      truckCount: 7,
    };
    expect(sample.utilizationPercent).toBe(72.5);
    expect(sample.revenuePerTruckMtd).toBeGreaterThan(0);
  });

  it("FleetDispatchBoardData includes truck lanes and jobs", () => {
    const sample: FleetDispatchBoardData = {
      date: "2026-04-20",
      jobs: [],
      unassignedJobs: [],
      truckLanes: [],
      branchCapacity: [],
    };
    expect(sample.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(sample.truckLanes)).toBe(true);
  });

  it("FleetUtilizationReportData includes week-over-week trend", () => {
    const sample: FleetUtilizationReportData = {
      from: "2026-04-01",
      to: "2026-04-14",
      rows: [],
      weekOverWeek: [{ label: "2026-04-01", utilization_percent: 65, revenue: 1000 }],
      summary: {
        totalRevenue: 1000,
        avgUtilizationPercent: 65,
        totalDeadheadMiles: 42.5,
      },
    };
    expect(sample.weekOverWeek[0].utilization_percent).toBe(65);
  });
});
