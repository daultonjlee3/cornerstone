import { describe, expect, it } from "vitest";
import { autoDetectFieldMappings, parseTabularInput } from "../src/lib/integrations/import-engine";
import { validateImportRows } from "../src/lib/integrations/import-validation";

describe("Sprint 5A import engine", () => {
  it("parses CSV input and auto-detects mappings", () => {
    const parsed = parseTabularInput({
      csvText: "branch_code,unit_number,truck_type\nATL,HV-101,Hydrovac",
    });
    const mappings = autoDetectFieldMappings("trucks", parsed.headers);

    expect(parsed.rows).toHaveLength(1);
    expect(mappings.some((mapping) => mapping.targetField === "branch_code")).toBe(true);
    expect(mappings.some((mapping) => mapping.targetField === "unit_number")).toBe(true);
    expect(mappings.some((mapping) => mapping.targetField === "truck_type")).toBe(true);
  });

  it("returns structured validation issues for duplicate trucks", () => {
    const result = validateImportRows("trucks", [
      { branch_code: "ATL", unit_number: "HV-101", truck_type: "Hydrovac" },
      { branch_code: "ATL", unit_number: "HV-101", truck_type: "Hydrovac" },
    ]);

    expect(result.summary.totalRows).toBe(2);
    expect(result.summary.errorRows).toBe(1);
    expect(result.issues.some((issue) => issue.code === "duplicate_truck")).toBe(true);
  });

  it("flags invalid job payload data", () => {
    const result = validateImportRows("jobs", [
      {
        branch_code: "ATL",
        title: "Emergency dig",
        required_truck_type: "Hydrovac",
        scheduled_start: "invalid-date",
        scheduled_end: "2026-06-25T11:00:00Z",
        revenue_estimate: "-12",
      },
    ]);

    expect(result.summary.errorRows).toBe(1);
    expect(result.issues.some((issue) => issue.code === "invalid_date")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "invalid_revenue")).toBe(true);
    expect(result.issues.some((issue) => issue.code === "missing_job_location")).toBe(true);
  });
});
