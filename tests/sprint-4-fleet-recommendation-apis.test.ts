import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.hoisted(() => vi.fn());
const getAuthContextMock = vi.hoisted(() => vi.fn());
const canMock = vi.hoisted(() => vi.fn());
const getFleetRecommendationsMock = vi.hoisted(() => vi.fn());
const applyRecommendationOutcomeMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/src/lib/auth-context", () => ({
  getAuthContext: getAuthContextMock,
}));

vi.mock("@/src/lib/permissions", () => ({
  can: canMock,
}));

vi.mock("@/src/lib/fleet-recommendation-engine/service", () => ({
  getFleetRecommendations: getFleetRecommendationsMock,
  applyRecommendationOutcome: applyRecommendationOutcomeMock,
}));

describe("fleet recommendations route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated requests", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockRejectedValue(new Error("unauthorized"));

    const { GET } = await import("../app/api/fleet/recommendations/route");
    const response = await GET(new Request("http://localhost/api/fleet/recommendations"));

    expect(response.status).toBe(401);
  });

  it("returns 403 when fleet.view is denied", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(false);

    const { GET } = await import("../app/api/fleet/recommendations/route");
    const response = await GET(new Request("http://localhost/api/fleet/recommendations"));

    expect(response.status).toBe(403);
  });

  it("returns recommendations for authorized requests", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    getFleetRecommendationsMock.mockResolvedValue({
      generatedAt: "2026-06-24T00:00:00.000Z",
      engineVersion: "fleet_rules_v1",
      pending: [],
      history: [],
      summary: {
        volume: 0,
        accepted: 0,
        dismissed: 0,
        expired: 0,
        acceptanceRate: null,
        dismissalRate: null,
      },
    });

    const { GET } = await import("../app/api/fleet/recommendations/route");
    const response = await GET(
      new Request(
        "http://localhost/api/fleet/recommendations?branch_id=branch-a&date=2026-06-24&refresh=true"
      )
    );

    expect(response.status).toBe(200);
    expect(getFleetRecommendationsMock).toHaveBeenCalledWith({}, "tenant-1", {
      branchId: "branch-a",
      date: "2026-06-24",
      forceRefresh: true,
    });
  });
});

describe("fleet recommendations action routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accept route returns 403 when fleet.manage is denied", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(false);

    const { POST } = await import("../app/api/fleet/recommendations/[id]/accept/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/recommendations/rec-1/accept", { method: "POST" }),
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(403);
  });

  it("accept route applies accepted outcome", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    applyRecommendationOutcomeMock.mockResolvedValue({ id: "rec-1", status: "accepted" });

    const { POST } = await import("../app/api/fleet/recommendations/[id]/accept/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/recommendations/rec-1/accept", {
        method: "POST",
        body: JSON.stringify({ notes: "Looks good" }),
      }),
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    expect(applyRecommendationOutcomeMock).toHaveBeenCalledWith({}, "tenant-1", {
      recommendationId: "rec-1",
      action: "accepted",
      actedBy: "user-1",
      notes: "Looks good",
    });
  });

  it("dismiss route applies dismissed outcome", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    applyRecommendationOutcomeMock.mockResolvedValue({ id: "rec-1", status: "dismissed" });

    const { POST } = await import("../app/api/fleet/recommendations/[id]/dismiss/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/recommendations/rec-1/dismiss", {
        method: "POST",
        body: JSON.stringify({ notes: "Not needed" }),
      }),
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    expect(applyRecommendationOutcomeMock).toHaveBeenCalledWith({}, "tenant-1", {
      recommendationId: "rec-1",
      action: "dismissed",
      actedBy: "user-1",
      notes: "Not needed",
    });
  });
});
