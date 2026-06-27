import { describe, expect, it } from "vitest";
import { parseFleetKpiId, FLEET_KPI_REGISTRY } from "@/src/lib/fleet/insights/kpi-registry";
import { FLEET_KPI_IDS } from "@/src/lib/fleet/insights/types";

describe("fleet kpi registry", () => {
  it("registers all command center KPIs", () => {
    for (const id of FLEET_KPI_IDS) {
      expect(FLEET_KPI_REGISTRY[id].id).toBe(id);
      expect(FLEET_KPI_REGISTRY[id].title.length).toBeGreaterThan(0);
    }
  });

  it("parses valid kpi query params", () => {
    expect(parseFleetKpiId("active-trucks")).toBe("active-trucks");
    expect(parseFleetKpiId("acceptance-rate")).toBe("acceptance-rate");
    expect(parseFleetKpiId("invalid")).toBeNull();
  });
});
