import { describe, expect, it } from "vitest";
import {
  peachtreeExpectedTelematicsStatus,
  peachtreeGpsProfileForUnit,
  peachtreeTargetLastTelematicsAt,
  peachtreeTelematicsNeedsRefresh,
} from "@/src/lib/fleet/demo/peachtree-demo-telematics";

describe("peachtree demo telematics refresh", () => {
  it("maps staged unit numbers to GPS profiles", () => {
    expect(peachtreeGpsProfileForUnit("PT-1023")).toBe("offline");
    expect(peachtreeGpsProfileForUnit("PT-1015")).toBe("stale");
    expect(peachtreeGpsProfileForUnit("PT-1004")).toBe("online");
  });

  it("targets fresh timestamps for online trucks", () => {
    const target = peachtreeTargetLastTelematicsAt("online", 0);
    const ageMs = Date.now() - Date.parse(target);
    expect(ageMs).toBeGreaterThan(0);
    expect(ageMs).toBeLessThan(10 * 60 * 1000);
    expect(peachtreeExpectedTelematicsStatus("PT-1004", 0)).toBe("online");
  });

  it("detects decay when online-capable trucks read offline", () => {
    const trucks = [
      { id: "1", unit_number: "PT-1004", last_telematics_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "2", unit_number: "PT-1007", last_telematics_at: new Date(Date.now() - 86400000).toISOString() },
      { id: "3", unit_number: "PT-1023", last_telematics_at: new Date(Date.now() - 86400000).toISOString() },
    ];
    expect(peachtreeTelematicsNeedsRefresh(trucks)).toBe(true);
  });

  it("skips refresh when online trucks still ping recently", () => {
    const trucks = [
      { id: "1", unit_number: "PT-1004", last_telematics_at: peachtreeTargetLastTelematicsAt("online", 0) },
      { id: "2", unit_number: "PT-1007", last_telematics_at: peachtreeTargetLastTelematicsAt("online", 1) },
      { id: "3", unit_number: "PT-1023", last_telematics_at: peachtreeTargetLastTelematicsAt("offline", 2) },
    ];
    expect(peachtreeTelematicsNeedsRefresh(trucks)).toBe(false);
  });
});
