import { describe, expect, it } from "vitest";
import { buildLaunchEstimatePdf } from "@/lib/launch-estimator/pdf";
import { calculateLaunchEstimate, normalizeInput } from "@/lib/launch-estimator/calculate";

describe("launch estimate pdf", () => {
  it("builds a branded one-page PDF with estimator data", async () => {
    const input = normalizeInput({
      companyName: "Industrial Services 101",
      industry: "Industrial Services",
      branchCount: "1",
      truckCount: 25,
      dailyJobs: 40,
      dispatcherCount: 2,
      integrations: ["samsara", "quickbooks", "service_titan", "csv"],
      goals: ["improve_dispatch", "capacity_planning", "better_reporting", "increase_contribution"],
    });
    expect(input).not.toBeNull();

    const result = calculateLaunchEstimate(input!);
    const pdf = await buildLaunchEstimatePdf(input!, result, {
      email: "ops@example.com",
      companyName: "Industrial Services 101",
    });

    expect(pdf.byteLength).toBeGreaterThan(5_000);
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});
