import { describe, expect, it } from "vitest";
import { buildFleetDispatchBoardQuery } from "../app/(authenticated)/dispatch/components/fleet-dispatch-query";

describe("buildFleetDispatchBoardQuery", () => {
  it("preserves selected branch scope when provided", () => {
    const query = buildFleetDispatchBoardQuery("2026-04-01", "branch-1");
    const params = new URLSearchParams(query);

    expect(params.get("date")).toBe("2026-04-01");
    expect(params.get("branch_id")).toBe("branch-1");
  });

  it("omits branch_id when no branch is selected", () => {
    const query = buildFleetDispatchBoardQuery("2026-04-01", null);
    const params = new URLSearchParams(query);

    expect(params.get("date")).toBe("2026-04-01");
    expect(params.get("branch_id")).toBeNull();
  });
});
