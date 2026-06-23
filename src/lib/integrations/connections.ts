import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationProvider,
} from "@/src/types/fleet";

export async function listIntegrationConnections(
  supabase: SupabaseClient,
  tenantId: string
): Promise<IntegrationConnection[]> {
  const { data, error } = await supabase
    .from("integration_connections")
    .select(
      "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
    )
    .eq("tenant_id", tenantId)
    .order("provider");

  if (error) throw new Error(error.message);
  return (data ?? []) as IntegrationConnection[];
}

export async function getOrCreateCsvManualConnection(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string | null
): Promise<IntegrationConnection> {
  const { data: existing } = await supabase
    .from("integration_connections")
    .select(
      "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
    )
    .eq("tenant_id", tenantId)
    .eq("provider", "csv_manual")
    .neq("status", "disabled")
    .maybeSingle();

  if (existing) return existing as IntegrationConnection;

  const { data, error } = await supabase
    .from("integration_connections")
    .insert({
      tenant_id: tenantId,
      provider: "csv_manual" satisfies IntegrationProvider,
      display_name: "CSV Import",
      status: "active" satisfies IntegrationConnectionStatus,
      created_by: userId,
    })
    .select(
      "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
    )
    .single();

  if (error) throw new Error(error.message);
  return data as IntegrationConnection;
}

export async function upsertIntegrationConnection(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    provider: IntegrationProvider;
    displayName?: string | null;
    status?: IntegrationConnectionStatus;
    config?: Record<string, unknown>;
    credentialsRef?: string | null;
    userId?: string | null;
    connectionId?: string | null;
  }
): Promise<IntegrationConnection> {
  const payload = {
    tenant_id: input.tenantId,
    provider: input.provider,
    display_name: input.displayName ?? null,
    status: input.status ?? "pending",
    config: input.config ?? {},
    credentials_ref: input.credentialsRef ?? null,
    created_by: input.userId ?? null,
  };

  if (input.connectionId) {
    const { data, error } = await supabase
      .from("integration_connections")
      .update(payload)
      .eq("id", input.connectionId)
      .eq("tenant_id", input.tenantId)
      .select(
        "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
      )
      .single();
    if (error) throw new Error(error.message);
    return data as IntegrationConnection;
  }

  const { data, error } = await supabase
    .from("integration_connections")
    .insert(payload)
    .select(
      "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
    )
    .single();

  if (error) throw new Error(error.message);
  return data as IntegrationConnection;
}

export async function updateConnectionSyncStatus(
  supabase: SupabaseClient,
  connectionId: string,
  tenantId: string,
  update: {
    lastSyncAt?: string;
    lastError?: string | null;
    status?: IntegrationConnectionStatus;
  }
): Promise<void> {
  const { error } = await supabase
    .from("integration_connections")
    .update({
      last_sync_at: update.lastSyncAt ?? undefined,
      last_error: update.lastError ?? undefined,
      status: update.status ?? undefined,
    })
    .eq("id", connectionId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(error.message);
}
