/**
 * Sprint 2 fleet ingest verification tests.
 * Run: npx vitest run tests/sprint-2-fleet-ingest.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const finishSyncRunMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const updateConnectionSyncStatusMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/src/lib/integrations/sync-runs", () => ({
  finishSyncRun: finishSyncRunMock,
  startSyncRun: vi.fn(),
}));

vi.mock("@/src/lib/integrations/connections", () => ({
  updateConnectionSyncStatus: updateConnectionSyncStatusMock,
}));

vi.mock("@/src/lib/notifications/service", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import {
  generateWebhookSecret,
  hashWebhookSecret,
  verifyWebhookSecret,
} from "../src/lib/integrations/webhook-secret";
import { extractWebhookSecret, resolveWebhookConnection } from "../src/lib/integrations/ingest/auth";
import {
  insertTelematicsEvent,
  normalizeTelematicsWebhookBody,
} from "../src/lib/integrations/ingest/telematics-insert";
import { computeTelematicsStatus } from "../src/lib/fleet/queries";
import { finalizeIngestRun } from "../src/lib/integrations/ingest/pipeline";

describe("webhook secret", () => {
  it("hashes and verifies a generated secret", () => {
    const secret = generateWebhookSecret();
    const hash = hashWebhookSecret(secret);
    expect(verifyWebhookSecret(secret, hash)).toBe(true);
    expect(verifyWebhookSecret("wrong-secret", hash)).toBe(false);
  });

  it("rejects empty or missing hash", () => {
    expect(verifyWebhookSecret("abc", null)).toBe(false);
    expect(verifyWebhookSecret("", "abc")).toBe(false);
  });
});

describe("extractWebhookSecret", () => {
  it("reads X-Webhook-Secret header", () => {
    const req = new Request("http://localhost", {
      headers: { "X-Webhook-Secret": "test-secret" },
    });
    expect(extractWebhookSecret(req)).toBe("test-secret");
  });

  it("reads Authorization Bearer token", () => {
    const req = new Request("http://localhost", {
      headers: { Authorization: "Bearer bearer-secret" },
    });
    expect(extractWebhookSecret(req)).toBe("bearer-secret");
  });
});

describe("resolveWebhookConnection", () => {
  it("returns null for invalid secret", async () => {
    const secret = generateWebhookSecret();
    const hash = hashWebhookSecret("other-secret");
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "conn-1",
                tenant_id: "tenant-1",
                provider: "webhook_telematics",
                config: {},
                webhook_secret_hash: hash,
                status: "active",
              },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await resolveWebhookConnection(supabase, "conn-1", secret);
    expect(result).toBeNull();
  });

  it("returns connection for valid secret and provider", async () => {
    const secret = generateWebhookSecret();
    const hash = hashWebhookSecret(secret);
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "conn-1",
                tenant_id: "tenant-1",
                provider: "webhook_telematics",
                config: {},
                webhook_secret_hash: hash,
                status: "active",
              },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await resolveWebhookConnection(supabase, "conn-1", secret);
    expect(result?.tenant_id).toBe("tenant-1");
    expect(result?.provider).toBe("webhook_telematics");
  });

  it("rejects disabled connections", async () => {
    const secret = generateWebhookSecret();
    const hash = hashWebhookSecret(secret);
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "conn-1",
                tenant_id: "tenant-1",
                provider: "webhook_telematics",
                config: {},
                webhook_secret_hash: hash,
                status: "disabled",
              },
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const result = await resolveWebhookConnection(supabase, "conn-1", secret);
    expect(result).toBeNull();
  });
});

describe("normalizeTelematicsWebhookBody", () => {
  it("parses batch and single event payloads", () => {
    const batch = normalizeTelematicsWebhookBody({
      events: [{ external_truck_id: "t1", recorded_at: "2026-01-01T00:00:00Z", latitude: 1, longitude: 2 }],
    });
    expect(batch).toHaveLength(1);

    const single = normalizeTelematicsWebhookBody({
      external_truck_id: "t2",
      recorded_at: "2026-01-01T00:00:00Z",
      latitude: 3,
      longitude: 4,
    });
    expect(single).toHaveLength(1);
  });
});

describe("computeTelematicsStatus", () => {
  it("marks recent timestamps as online", () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(computeTelematicsStatus(recent)).toBe("online");
  });

  it("marks missing timestamps as offline", () => {
    expect(computeTelematicsStatus(null)).toBe("offline");
  });
});

describe("insertTelematicsEvent tenant isolation", () => {
  const tenantId = "tenant-a";
  const connectionId = "conn-a";
  const externalTruckId = "samsara-99";
  const wrongTenantTruckId = "truck-b";

  function createFilterBuilder(
    onMaybeSingle: (filters: Record<string, string>) => Promise<{ data: unknown }>
  ) {
    const filters: Record<string, string> = {};
    const builder = {
      eq: (col: string, val: string) => {
        filters[col] = val;
        return builder;
      },
      maybeSingle: () => onMaybeSingle(filters),
    };
    return builder;
  }

  function buildSupabase(opts: {
    mappedTruckId?: string | null;
    deviceTruckId?: string | null;
    tenantTruckValid?: boolean;
    insertError?: string | null;
  }) {
    return {
      from: (table: string) => {
        if (table === "external_entity_mappings") {
          return {
            select: () =>
              createFilterBuilder(async () => ({
                data: opts.mappedTruckId ? { internal_id: opts.mappedTruckId } : null,
              })),
          };
        }
        if (table === "trucks") {
          return {
            select: () =>
              createFilterBuilder(async (filters) => {
                if (filters.telematics_device_id) {
                  return {
                    data: opts.deviceTruckId ? { id: opts.deviceTruckId } : null,
                  };
                }
                if (filters.id) {
                  const valid =
                    opts.tenantTruckValid !== false &&
                    (filters.id === opts.mappedTruckId || filters.id === opts.deviceTruckId);
                  return { data: valid ? { id: filters.id } : null };
                }
                return { data: null };
              }),
          };
        }
        if (table === "telematics_events") {
          return {
            select: () =>
              createFilterBuilder(async () => ({ data: null })),
            insert: async () =>
              opts.insertError
                ? { error: { message: opts.insertError, code: "XX" } }
                : { error: null },
          };
        }
        return {};
      },
    } as unknown as SupabaseClient;
  }

  it("rejects truck mapped to another tenant", async () => {
    const supabase = buildSupabase({
      mappedTruckId: wrongTenantTruckId,
      tenantTruckValid: false,
    });

    const result = await insertTelematicsEvent(supabase, {
      tenantId,
      connectionId,
      source: "webhook_telematics",
      event: {
        external_truck_id: externalTruckId,
        recorded_at: new Date().toISOString(),
        latitude: 29.76,
        longitude: -95.36,
      },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("Unmapped");
  });

  it("inserts when truck resolves in same tenant", async () => {
    const truckId = "truck-a";
    const supabase = buildSupabase({
      mappedTruckId: truckId,
      tenantTruckValid: true,
    });

    const result = await insertTelematicsEvent(supabase, {
      tenantId,
      connectionId,
      source: "webhook_telematics",
      event: {
        external_truck_id: externalTruckId,
        recorded_at: new Date().toISOString(),
        latitude: 29.76,
        longitude: -95.36,
        external_event_id: "evt-1",
      },
    });

    expect(result.ok).toBe(true);
  });

  it("resolves truck via telematics_device_id when unmapped", async () => {
    const truckId = "truck-device";
    const supabase = buildSupabase({
      mappedTruckId: null,
      deviceTruckId: truckId,
      tenantTruckValid: true,
    });

    const result = await insertTelematicsEvent(supabase, {
      tenantId,
      connectionId,
      source: "webhook_telematics",
      event: {
        external_truck_id: externalTruckId,
        recorded_at: new Date().toISOString(),
        latitude: 29.76,
        longitude: -95.36,
      },
    });

    expect(result.ok).toBe(true);
  });
});

describe("finalizeIngestRun health updates", () => {
  beforeEach(() => {
    finishSyncRunMock.mockClear();
    updateConnectionSyncStatusMock.mockClear();
  });

  it("marks connection active on full success", async () => {
    const status = await finalizeIngestRun({} as SupabaseClient, {
      runId: "run-1",
      tenantId: "tenant-1",
      connectionId: "conn-1",
      provider: "webhook_telematics",
      processed: 3,
      failed: 0,
    });

    expect(status).toBe("success");
    expect(finishSyncRunMock).toHaveBeenCalledWith(
      {},
      "run-1",
      "tenant-1",
      expect.objectContaining({ status: "success", recordsProcessed: 3, recordsFailed: 0 })
    );
    expect(updateConnectionSyncStatusMock).toHaveBeenCalledWith(
      {},
      "conn-1",
      "tenant-1",
      expect.objectContaining({ status: "active", lastError: null })
    );
  });

  it("marks connection error on total failure", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            in: async () => ({ data: [] }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const status = await finalizeIngestRun(supabase, {
      runId: "run-1",
      tenantId: "tenant-1",
      connectionId: "conn-1",
      provider: "webhook_telematics",
      processed: 0,
      failed: 2,
      errorSummary: "All rows failed",
    });

    expect(status).toBe("failed");
    expect(updateConnectionSyncStatusMock).toHaveBeenCalledWith(
      supabase,
      "conn-1",
      "tenant-1",
      expect.objectContaining({ status: "error", lastError: "All rows failed" })
    );
  });

  it("keeps connection active on partial success", async () => {
    const status = await finalizeIngestRun({} as SupabaseClient, {
      runId: "run-1",
      tenantId: "tenant-1",
      connectionId: "conn-1",
      provider: "webhook_telematics",
      processed: 1,
      failed: 1,
    });

    expect(status).toBe("partial");
    expect(updateConnectionSyncStatusMock).toHaveBeenCalledWith(
      {},
      "conn-1",
      "tenant-1",
      expect.objectContaining({ status: "active" })
    );
  });
});
