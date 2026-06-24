import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/src/lib/supabase/admin";
import { startSyncRun } from "@/src/lib/integrations/sync-runs";
import { finalizeIngestRun } from "@/src/lib/integrations/ingest/pipeline";
import { getSamsaraClientForConnection } from "./client";
import { syncSamsaraVehicles } from "./sync-vehicles";
import { syncSamsaraPositions } from "./sync-positions";

export async function runSamsaraFullSync(connectionId: string, tenantId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id, tenant_id, provider, status")
    .eq("id", connectionId)
    .eq("tenant_id", tenantId)
    .eq("provider", "samsara")
    .maybeSingle();

  if (!connection || (connection as { status: string }).status === "disabled") {
    throw new Error("Samsara connection not found.");
  }

  const client = await getSamsaraClientForConnection(supabase, connectionId, tenantId);
  if (!client) throw new Error("Samsara is not connected or tokens are missing.");

  const run = await startSyncRun(supabase, connectionId, tenantId);

  try {
    const vehicles = await client.listVehicles();
    const vehicleResult = await syncSamsaraVehicles(supabase, {
      tenantId,
      connectionId,
      vehicles,
    });

    const locations = await client.listVehicleLocations();
    const positionResult = await syncSamsaraPositions(supabase, {
      tenantId,
      connectionId,
      locations,
    });

    const processed = vehicleResult.mapped + positionResult.processed;
    const failed = positionResult.failed + vehicleResult.unmapped.length;

    const { data: connRow } = await supabase
      .from("integration_connections")
      .select("config")
      .eq("id", connectionId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    const prevConfig = ((connRow as { config?: Record<string, unknown> } | null)?.config ??
      {}) as Record<string, unknown>;

    await supabase
      .from("integration_connections")
      .update({
        config: {
          ...prevConfig,
          last_vehicle_sync_at: new Date().toISOString(),
          vehicle_count: vehicles.length,
          unmapped_vehicles: vehicleResult.unmapped,
        },
        last_sync_at: new Date().toISOString(),
        last_error: failed > 0 ? `${failed} unmapped or failed` : null,
        status: failed > 0 && processed === 0 ? "error" : "active",
      })
      .eq("id", connectionId)
      .eq("tenant_id", tenantId);

    await finalizeIngestRun(supabase, {
      runId: run.id,
      tenantId,
      connectionId,
      provider: "samsara",
      processed,
      failed,
      errors: [
        ...vehicleResult.unmapped.map((u) => ({ type: "unmapped_vehicle", ...u })),
        ...positionResult.errors,
      ],
      affectedDates: positionResult.affectedDates,
    });
  } catch (error) {
    await finalizeIngestRun(supabase, {
      runId: run.id,
      tenantId,
      connectionId,
      provider: "samsara",
      processed: 0,
      failed: 1,
      errorSummary: error instanceof Error ? error.message : "Samsara sync failed",
    });
    throw error;
  }
}

export async function pollAllSamsaraConnections(): Promise<{ synced: number; failed: number }> {
  const supabase = createAdminClient();
  const { data: connections } = await supabase
    .from("integration_connections")
    .select("id, tenant_id")
    .eq("provider", "samsara")
    .eq("status", "active");

  let synced = 0;
  let failed = 0;

  for (const row of connections ?? []) {
    const conn = row as { id: string; tenant_id: string };
    try {
      await runSamsaraFullSync(conn.id, conn.tenant_id);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function runSamsaraFullSyncWithUserClient(
  supabase: SupabaseClient,
  connectionId: string,
  tenantId: string
): Promise<void> {
  await runSamsaraFullSync(connectionId, tenantId);
  void supabase;
}
