import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());
const getAuthContextMock = vi.hoisted(() => vi.fn());
const canMock = vi.hoisted(() => vi.fn());
const loadDispatchBoardMock = vi.hoisted(() => vi.fn());
const loadCommandCenterMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/src/lib/auth-context", () => ({
  getAuthContext: getAuthContextMock,
}));

vi.mock("@/src/lib/permissions", () => ({
  can: canMock,
}));

vi.mock("@/src/lib/fleet/queries/dispatch-board", () => ({
  loadFleetDispatchBoardData: loadDispatchBoardMock,
}));

vi.mock("@/src/lib/fleet/queries/command-center", () => ({
  loadFleetCommandCenterData: loadCommandCenterMock,
}));

describe("fleet dispatch-board route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth context fails", async () => {
    const supabase = { tag: "client" };
    createClientMock.mockResolvedValue(supabase);
    getAuthContextMock.mockRejectedValue(new Error("no auth"));

    const { GET } = await import("../app/api/fleet/dispatch-board/route");
    const response = await GET(
      new Request("http://localhost/api/fleet/dispatch-board?date=2026-04-01")
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 when fleet.view is denied", async () => {
    const supabase = { tag: "client" };
    createClientMock.mockResolvedValue(supabase);
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1" });
    canMock.mockResolvedValue(false);

    const { GET } = await import("../app/api/fleet/dispatch-board/route");
    const response = await GET(
      new Request("http://localhost/api/fleet/dispatch-board?date=2026-04-01")
    );

    expect(response.status).toBe(403);
  });

  it("forwards date and branch_id to loader", async () => {
    const supabase = { tag: "client" };
    createClientMock.mockResolvedValue(supabase);
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1" });
    canMock.mockResolvedValue(true);
    loadDispatchBoardMock.mockResolvedValue({
      date: "2026-04-01",
      jobs: [],
      unassignedJobs: [],
      truckLanes: [],
      branchCapacity: [],
    });

    const { GET } = await import("../app/api/fleet/dispatch-board/route");
    const response = await GET(
      new Request(
        "http://localhost/api/fleet/dispatch-board?date=2026-04-01&branch_id=branch-9"
      )
    );

    expect(response.status).toBe(200);
    expect(loadDispatchBoardMock).toHaveBeenCalledWith(
      supabase,
      "tenant-1",
      "2026-04-01",
      "branch-9"
    );
  });
});

describe("fleet command-center route auth gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth context fails", async () => {
    const supabase = { tag: "client" };
    createClientMock.mockResolvedValue(supabase);
    getAuthContextMock.mockRejectedValue(new Error("no auth"));

    const { GET } = await import("../app/api/fleet/command-center/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("returns 403 when permission is denied", async () => {
    const supabase = { tag: "client" };
    createClientMock.mockResolvedValue(supabase);
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1" });
    canMock.mockResolvedValue(false);

    const { GET } = await import("../app/api/fleet/command-center/route");
    const response = await GET();

    expect(response.status).toBe(403);
  });
});
