import { beforeEach, describe, expect, it, vi } from "vitest";

const getIntegrationApiContextMock = vi.hoisted(() => vi.fn());
const listConnectorsMock = vi.hoisted(() => vi.fn());
const connectConnectorMock = vi.hoisted(() => vi.fn());

vi.mock("../app/api/integrations/_lib/access", () => ({
  getIntegrationApiContext: getIntegrationApiContextMock,
}));

vi.mock("../src/lib/integrations/connector-service", () => ({
  listConnectors: listConnectorsMock,
  connectConnector: connectConnectorMock,
}));

describe("Sprint 5A connector health", () => {
  it("marks missing connection as not connected", async () => {
    const { computeConnectorHealth } = await import("../src/lib/integrations/health");
    const health = computeConnectorHealth(null);
    expect(health.status).toBe("not_connected");
  });

  it("marks stale active connection as warning", async () => {
    const { computeConnectorHealth } = await import("../src/lib/integrations/health");
    const health = computeConnectorHealth({
      status: "active",
      last_sync_at: "2020-01-01T00:00:00.000Z",
      last_error: null,
      config: { poll_interval_sec: 300 },
    });
    expect(health.status).toBe("warning");
  });
});

describe("Sprint 5A connectors API auth behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when access helper denies request", async () => {
    getIntegrationApiContextMock.mockResolvedValue({
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const { GET } = await import("../app/api/integrations/connectors/route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns connector list for authorized requests", async () => {
    getIntegrationApiContextMock.mockResolvedValue({
      supabase: {},
      auth: { tenantId: "tenant-1", userId: "user-1" },
    });
    listConnectorsMock.mockResolvedValue([{ connector: { key: "samsara" } }]);
    const { GET } = await import("../app/api/integrations/connectors/route");
    const response = await GET();
    expect(response.status).toBe(200);
    expect(listConnectorsMock).toHaveBeenCalledWith({}, "tenant-1");
  });

  it("creates connector for authorized POST", async () => {
    getIntegrationApiContextMock.mockResolvedValue({
      supabase: {},
      auth: { tenantId: "tenant-1", userId: "user-1" },
    });
    connectConnectorMock.mockResolvedValue({
      connection: { id: "conn-1", provider: "samsara" },
      credentialMetadata: null,
    });
    const { POST } = await import("../app/api/integrations/connectors/route");
    const response = await POST(
      new Request("http://localhost/api/integrations/connectors", {
        method: "POST",
        body: JSON.stringify({
          key: "samsara",
          config: { poll_interval_sec: 300 },
        }),
      })
    );
    expect(response.status).toBe(200);
    expect(connectConnectorMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        tenantId: "tenant-1",
        key: "samsara",
      })
    );
  });
});
