import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncLogStatus = "info" | "success" | "warning" | "error";

export type SyncLogRecord = {
  id: string;
  tenant_id: string;
  connection_id: string;
  sync_run_id: string | null;
  provider: string;
  operation: string;
  status: SyncLogStatus;
  duration_ms: number | null;
  payload_summary: Record<string, unknown>;
  error_message: string | null;
  retryable: boolean;
  created_at: string;
};

export async function appendSyncLog(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    syncRunId?: string | null;
    provider: string;
    operation: string;
    status: SyncLogStatus;
    durationMs?: number | null;
    payloadSummary?: Record<string, unknown>;
    errorMessage?: string | null;
    retryable?: boolean;
  }
): Promise<void> {
  const { error } = await supabase.from("integration_sync_logs").insert({
    tenant_id: input.tenantId,
    connection_id: input.connectionId,
    sync_run_id: input.syncRunId ?? null,
    provider: input.provider,
    operation: input.operation,
    status: input.status,
    duration_ms: input.durationMs ?? null,
    payload_summary: input.payloadSummary ?? {},
    error_message: input.errorMessage ?? null,
    retryable: input.retryable ?? false,
  });

  if (error) throw new Error(error.message);
}

export async function listSyncLogs(
  supabase: SupabaseClient,
  tenantId: string,
  options?: {
    provider?: string;
    status?: SyncLogStatus;
    syncRunId?: string;
    limit?: number;
  }
): Promise<SyncLogRecord[]> {
  let query = supabase
    .from("integration_sync_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.provider) {
    query = query.eq("provider", options.provider);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.syncRunId) {
    query = query.eq("sync_run_id", options.syncRunId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SyncLogRecord[];
}
