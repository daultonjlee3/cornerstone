import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createAdminClientMock = vi.hoisted(() => vi.fn());
const isAdminClientConfigErrorMock = vi.hoisted(() => vi.fn());
const refreshForAllTenantsMock = vi.hoisted(() => vi.fn());
const defaultRangeMock = vi.hoisted(() => vi.fn());

vi.mock("@/src/lib/supabase/admin", () => ({
  createAdminClient: createAdminClientMock,
  isAdminClientConfigError: isAdminClientConfigErrorMock,
}));

vi.mock("@/src/lib/fleet/marts/refresh-utilization-daily", () => ({
  refreshUtilizationDailyForAllTenants: refreshForAllTenantsMock,
  defaultMartRefreshDateRange: defaultRangeMock,
}));

describe("fleet mart refresh cron route", () => {
  const previousCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    defaultRangeMock.mockReturnValue({ from: "2026-04-01", to: "2026-04-02" });
    refreshForAllTenantsMock.mockResolvedValue([{ tenantId: "tenant-1" }]);
    isAdminClientConfigErrorMock.mockReturnValue(false);
  });

  afterEach(() => {
    process.env.CRON_SECRET = previousCronSecret;
  });

  it("returns 401 when cron secret is missing/invalid", async () => {
    const { POST } = await import("../app/api/cron/fleet/refresh-marts/route");
    const response = await POST(new Request("http://localhost/api/cron/fleet/refresh-marts"));
    expect(response.status).toBe(401);
  });

  it("uses explicit from/to query params when provided", async () => {
    const adminClient = { tag: "admin" };
    createAdminClientMock.mockReturnValue(adminClient);

    const { POST } = await import("../app/api/cron/fleet/refresh-marts/route");
    const response = await POST(
      new Request(
        "http://localhost/api/cron/fleet/refresh-marts?from=2026-01-01&to=2026-01-31",
        { headers: { Authorization: "Bearer test-secret" } }
      )
    );

    expect(response.status).toBe(200);
    expect(refreshForAllTenantsMock).toHaveBeenCalledWith(
      adminClient,
      "2026-01-01",
      "2026-01-31"
    );
  });

  it("returns 503 when admin client is misconfigured", async () => {
    const error = new Error("misconfigured");
    createAdminClientMock.mockImplementation(() => {
      throw error;
    });
    isAdminClientConfigErrorMock.mockImplementation((candidate) => candidate === error);

    const { POST } = await import("../app/api/cron/fleet/refresh-marts/route");
    const response = await POST(
      new Request("http://localhost/api/cron/fleet/refresh-marts", {
        headers: { Authorization: "Bearer test-secret" },
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Service temporarily unavailable.",
    });
  });
});

describe("fleet webhook route admin config handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("jobs webhook returns 503 when admin client is misconfigured", async () => {
    const error = new Error("misconfigured");
    createAdminClientMock.mockImplementation(() => {
      throw error;
    });
    isAdminClientConfigErrorMock.mockImplementation((candidate) => candidate === error);

    const { POST } = await import("../app/api/integrations/webhooks/jobs/route");
    const response = await POST(
      new Request("http://localhost/api/integrations/webhooks/jobs?connection=abc", {
        method: "POST",
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Service temporarily unavailable.",
    });
  });

  it("telematics webhook returns 503 when admin client is misconfigured", async () => {
    const error = new Error("misconfigured");
    createAdminClientMock.mockImplementation(() => {
      throw error;
    });
    isAdminClientConfigErrorMock.mockImplementation((candidate) => candidate === error);

    const { POST } = await import("../app/api/integrations/webhooks/telematics/route");
    const response = await POST(
      new Request("http://localhost/api/integrations/webhooks/telematics?connection=abc", {
        method: "POST",
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Service temporarily unavailable.",
    });
  });
});
