import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationSyncRun, IntegrationSyncRunStatus } from "@/src/types/fleet";

export async function startSyncRun(
  supabase: SupabaseClient,
  connectionId: string,
  tenantId: string
): Promise<IntegrationSyncRun> {
  const { data, error } = await supabase
    .from("integration_sync_runs")
    .insert({
      connection_id: connectionId,
      tenant_id: tenantId,
      status: "running" satisfies IntegrationSyncRunStatus,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as IntegrationSyncRun;
}

export async function finishSyncRun(
  supabase: SupabaseClient,
  runId: string,
  tenantId: string,
  update: {
    status: IntegrationSyncRunStatus;
    recordsProcessed: number;
    recordsFailed: number;
    errorSummary?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase
    .from("integration_sync_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: update.status,
      records_processed: update.recordsProcessed,
      records_failed: update.recordsFailed,
      error_summary: update.errorSummary ?? null,
      metadata: update.metadata ?? {},
    })
    .eq("id", runId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}

export async function listSyncRuns(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { connectionId?: string; limit?: number }
): Promise<IntegrationSyncRun[]> {
  let query = supabase
    .from("integration_sync_runs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("started_at", { ascending: false })
    .limit(options?.limit ?? 20);

  if (options?.connectionId) {
    query = query.eq("connection_id", options.connectionId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as IntegrationSyncRun[];
}
