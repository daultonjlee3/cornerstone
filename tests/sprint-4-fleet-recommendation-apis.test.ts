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

const loadRecommendationTrustDashboardMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/fleet-recommendation-engine/service", () => ({
  getFleetRecommendations: getFleetRecommendationsMock,
  applyRecommendationOutcome: applyRecommendationOutcomeMock,
}));

vi.mock("@/src/lib/fleet-recommendation-engine/trust-dashboard", () => ({
  loadRecommendationTrustDashboard: loadRecommendationTrustDashboardMock,
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
          rejected: 0,
          dismissed: 0,
          expired: 0,
          applied: 0,
          failed: 0,
          completed: 0,
          acceptanceRate: null,
          rejectionRate: null,
          dismissalRate: null,
          trustScore: null,
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
      deferGeneration: false,
      skipHistory: false,
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
      boardDate: null,
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
      boardDate: null,
    });
  });

  it("reject route is an alias for dismissed outcome", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    applyRecommendationOutcomeMock.mockResolvedValue({ id: "rec-1", status: "dismissed" });

    const { POST } = await import("../app/api/fleet/recommendations/[id]/reject/route");
    const response = await POST(
      new Request("http://localhost/api/fleet/recommendations/rec-1/reject", {
        method: "POST",
        body: JSON.stringify({ notes: "Wrong truck" }),
      }),
      { params: Promise.resolve({ id: "rec-1" }) }
    );

    expect(response.status).toBe(200);
    expect(applyRecommendationOutcomeMock).toHaveBeenCalledWith({}, "tenant-1", {
      recommendationId: "rec-1",
      action: "dismissed",
      actedBy: "user-1",
      notes: "Wrong truck",
      boardDate: null,
    });
  });
});

describe("fleet recommendations trust route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns trust dashboard for authorized requests", async () => {
    createClientMock.mockResolvedValue({});
    getAuthContextMock.mockResolvedValue({ tenantId: "tenant-1", userId: "user-1" });
    canMock.mockResolvedValue(true);
    loadRecommendationTrustDashboardMock.mockResolvedValue({
      from: "2026-06-01",
      to: "2026-06-24",
      totals: { generated: 5, accepted: 3, rejected: 1, dismissed: 1, expired: 1, applied: 2, failed: 0, completed: 2 },
      rates: { acceptanceRate: 75, rejectionRate: 25, applicationSuccessRate: 100 },
      estimatedImpact: {
        contributionImprovement: 5000,
        revenueProtected: 12000,
        deadheadReduction: 12,
        overtimeAvoided: 400,
        travelTimeSavedMinutes: 90,
        laborSaved: 200,
      },
      measuredOutcomes: {
        measuredCount: 2,
        pendingCount: 1,
        contributionAccuracyPct: 96,
        onTimeCompletionRate: 100,
        totalMeasuredContribution: 4800,
        totalEstimatedContribution: 5000,
      },
      recentHistory: [],
      trustScore: 82,
    });

    const { GET } = await import("../app/api/fleet/recommendations/trust/route");
    const response = await GET(
      new Request("http://localhost/api/fleet/recommendations/trust?branch_id=branch-a")
    );

    expect(response.status).toBe(200);
    expect(loadRecommendationTrustDashboardMock).toHaveBeenCalledWith({}, "tenant-1", {
      branchId: "branch-a",
      from: undefined,
      to: undefined,
      refreshOutcomes: true,
    });
    const body = await response.json();
    expect(body.trustScore).toBe(82);
  });
});
