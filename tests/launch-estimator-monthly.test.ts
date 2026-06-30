import { describe, expect, it } from "vitest";
import { calculateLaunchEstimate, normalizeInput } from "@/lib/launch-estimator/calculate";
import { computeMonthlyPrice } from "@/lib/launch-estimator/pricing";

describe("launch estimator monthly pricing", () => {
  it("returns base monthly for a standard single-branch fleet", () => {
    const input = normalizeInput({
      companyName: "Acme Fleet",
      industry: "Industrial Services",
      branchCount: "1",
      truckCount: 25,
      dailyJobs: 30,
      dispatcherCount: 2,
      integrations: ["samsara", "quickbooks", "service_titan"],
      goals: ["improve_dispatch"],
    });
    expect(input).not.toBeNull();

    const monthly = computeMonthlyPrice(input!);
    expect(monthly.amount).toBe(5_000);
    expect(monthly.label).toBe("$5,000/mo");
  });

  it("includes monthly estimate in launch result", () => {
    const input = normalizeInput({
      companyName: "Industrial Services 101",
      industry: "Industrial Services",
      branchCount: "1",
      truckCount: 25,
      dailyJobs: 40,
      dispatcherCount: 2,
      integrations: ["samsara", "quickbooks", "service_titan", "csv"],
      goals: ["improve_dispatch", "capacity_planning"],
    });
    expect(input).not.toBeNull();

    const result = calculateLaunchEstimate(input!);
    expect(result.estimatedMonthly).toBe(5_000);
    expect(result.estimatedMonthlyLabel).toBe("$5,000/mo");
  });
});
