import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
  IntegrationProvider,
  IntegrationSyncRun,
  IntegrationSyncRunStatus,
} from "@/src/types/fleet";
import {
  CONNECTOR_CATALOG,
  getConnectorDefinitionByKey,
  type ConnectorDefinition,
  type ConnectorKey,
} from "@/src/lib/integrations/connector-catalog";
import { computeConnectorHealth, type ConnectorHealthSummary } from "@/src/lib/integrations/health";
import {
  listIntegrationConnections,
  upsertIntegrationConnection,
  updateConnectionSyncStatus,
} from "@/src/lib/integrations/connections";
import { finishSyncRun, listSyncRuns, startSyncRun } from "@/src/lib/integrations/sync-runs";
import { appendSyncLog, listSyncLogs, type SyncLogRecord } from "@/src/lib/integrations/sync-log-service";
import {
  storeConnectorCredentials,
  toClientSafeCredentialMetadata,
  type CredentialInput,
} from "@/src/lib/integrations/credential-framework";

export type ConnectorSummary = {
  connector: ConnectorDefinition;
  connection: IntegrationConnection | null;
  connectionStatus: IntegrationConnectionStatus | "not_connected";
  health: ConnectorHealthSummary;
  lastSyncAt: string | null;
  syncStats: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    partialRuns: number;
    runningRuns: number;
  };
  errorState: string | null;
  tenantOwned: boolean;
  config: Record<string, unknown>;
  mappingMetadata: Record<string, unknown>;
  credentialMetadata: Record<string, unknown> | null;
};

export async function listConnectors(
  supabase: SupabaseClient,
  tenantId: string
): Promise<ConnectorSummary[]> {
  const connections = await listIntegrationConnections(supabase, tenantId);
  const runs = await listSyncRuns(supabase, tenantId, { limit: 250 });

  return CONNECTOR_CATALOG.map((definition) =>
    buildConnectorSummary(definition, resolveConnection(definition, connections), runs, tenantId)
  );
}

export async function getConnectorStatus(
  supabase: SupabaseClient,
  tenantId: string,
  key: ConnectorKey
): Promise<ConnectorSummary | null> {
  const definition = getConnectorDefinitionByKey(key);
  if (!definition) return null;

  const connections = await listIntegrationConnections(supabase, tenantId);
  const runs = await listSyncRuns(supabase, tenantId, { limit: 150 });
  return buildConnectorSummary(definition, resolveConnection(definition, connections), runs, tenantId);
}

export async function connectConnector(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    userId: string | null;
    key: ConnectorKey;
    displayName?: string | null;
    config?: Record<string, unknown>;
    credentials?: CredentialInput;
  }
): Promise<{ connection: IntegrationConnection; credentialMetadata: Record<string, unknown> | null }> {
  const definition = getConnectorDefinitionByKey(input.key);
  if (!definition) {
    throw new Error("Unsupported connector.");
  }

  const connection = await upsertIntegrationConnection(supabase, {
    tenantId: input.tenantId,
    provider: definition.provider,
    displayName: input.displayName ?? definition.displayName,
    status: "active",
    config: input.config ?? {},
    userId: input.userId,
  });

  if (!input.credentials) {
    return { connection, credentialMetadata: null };
  }

  const stored = await storeConnectorCredentials(supabase, {
    tenantId: input.tenantId,
    connectionId: connection.id,
    payload: input.credentials,
  });

  return {
    connection,
    credentialMetadata: toClientSafeCredentialMetadata(stored.metadata),
  };
}

export async function disconnectConnector(
  supabase: SupabaseClient,
  tenantId: string,
  connectorId: string
): Promise<void> {
  const { error } = await supabase
    .from("integration_connections")
    .update({
      status: "disabled",
      last_error: null,
    })
    .eq("tenant_id", tenantId)
    .eq("id", connectorId);

  if (error) throw new Error(error.message);
}

export async function updateConnectorConfig(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectorId: string;
    config: Record<string, unknown>;
    displayName?: string | null;
  }
): Promise<IntegrationConnection> {
  const { data: existing, error: readError } = await supabase
    .from("integration_connections")
    .select(
      "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
    )
    .eq("tenant_id", input.tenantId)
    .eq("id", input.connectorId)
    .single();

  if (readError) throw new Error(readError.message);

  const existingConfig = (existing.config as Record<string, unknown>) ?? {};
  const mergedConfig = { ...existingConfig, ...input.config };
  const { data, error } = await supabase
    .from("integration_connections")
    .update({
      config: mergedConfig,
      display_name: input.displayName ?? existing.display_name,
    })
    .eq("tenant_id", input.tenantId)
    .eq("id", input.connectorId)
    .select(
      "id, tenant_id, provider, display_name, status, config, credentials_ref, last_sync_at, last_error, created_at, updated_at"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as IntegrationConnection;
}

export async function recordSyncStart(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectorId: string;
    provider: IntegrationProvider;
    operation: string;
  }
): Promise<IntegrationSyncRun> {
  const run = await startSyncRun(supabase, input.connectorId, input.tenantId);
  await appendSyncLog(supabase, {
    tenantId: input.tenantId,
    connectionId: input.connectorId,
    syncRunId: run.id,
    provider: input.provider,
    operation: input.operation,
    status: "info",
    payloadSummary: { phase: "start" },
  });
  return run;
}

export async function recordSyncSuccess(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectorId: string;
    provider: IntegrationProvider;
    runId: string;
    operation: string;
    recordsProcessed: number;
    recordsFailed?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const failed = input.recordsFailed ?? 0;
  const status: IntegrationSyncRunStatus = failed > 0 ? "partial" : "success";
  await finishSyncRun(supabase, input.runId, input.tenantId, {
    status,
    recordsProcessed: input.recordsProcessed,
    recordsFailed: failed,
    errorSummary: failed > 0 ? `${failed} record(s) failed` : null,
    metadata: input.metadata ?? {},
  });
  await updateConnectionSyncStatus(supabase, input.connectorId, input.tenantId, {
    status: "active",
    lastSyncAt: new Date().toISOString(),
    lastError: failed > 0 ? `${failed} record(s) failed` : null,
  });
  await appendSyncLog(supabase, {
    tenantId: input.tenantId,
    connectionId: input.connectorId,
    syncRunId: input.runId,
    provider: input.provider,
    operation: input.operation,
    status: failed > 0 ? "warning" : "success",
    payloadSummary: {
      recordsProcessed: input.recordsProcessed,
      recordsFailed: failed,
    },
    errorMessage: failed > 0 ? `${failed} record(s) failed` : null,
    retryable: failed > 0,
  });
}

export async function recordSyncFailure(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectorId: string;
    provider: IntegrationProvider;
    runId: string;
    operation: string;
    recordsProcessed?: number;
    recordsFailed?: number;
    errorSummary: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await finishSyncRun(supabase, input.runId, input.tenantId, {
    status: "failed",
    recordsProcessed: input.recordsProcessed ?? 0,
    recordsFailed: input.recordsFailed ?? 0,
    errorSummary: input.errorSummary,
    metadata: input.metadata ?? {},
  });
  await updateConnectionSyncStatus(supabase, input.connectorId, input.tenantId, {
    status: "error",
    lastSyncAt: new Date().toISOString(),
    lastError: input.errorSummary,
  });
  await appendSyncLog(supabase, {
    tenantId: input.tenantId,
    connectionId: input.connectorId,
    syncRunId: input.runId,
    provider: input.provider,
    operation: input.operation,
    status: "error",
    errorMessage: input.errorSummary,
    retryable: true,
  });
}

export async function recordConnectorHealth(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectorId: string;
    health: "healthy" | "warning" | "error";
    code: string;
    title: string;
    description?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  if (input.health === "healthy") {
    await supabase
      .from("integration_readiness_issues")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        last_detected_at: new Date().toISOString(),
      })
      .eq("tenant_id", input.tenantId)
      .eq("code", input.code)
      .eq("status", "open");
    return;
  }

  const severity = input.health === "error" ? "critical" : "warning";
  const { data: existing } = await supabase
    .from("integration_readiness_issues")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("code", input.code)
    .eq("status", "open")
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("integration_readiness_issues")
      .update({
        severity,
        title: input.title,
        description: input.description ?? null,
        metadata: {
          ...(input.metadata ?? {}),
          connector_id: input.connectorId,
        },
        last_detected_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("tenant_id", input.tenantId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("integration_readiness_issues").insert({
    tenant_id: input.tenantId,
    code: input.code,
    severity,
    status: "open",
    title: input.title,
    description: input.description ?? null,
    metadata: {
      ...(input.metadata ?? {}),
      connector_id: input.connectorId,
    },
  });
  if (error) throw new Error(error.message);
}

export async function retrieveSyncHistory(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { connectionId?: string; limit?: number }
): Promise<IntegrationSyncRun[]> {
  return listSyncRuns(supabase, tenantId, options);
}

export async function retrieveSyncLogs(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { provider?: string; status?: "info" | "success" | "warning" | "error"; limit?: number }
): Promise<SyncLogRecord[]> {
  return listSyncLogs(supabase, tenantId, options);
}

export async function retryFailedSync(
  _supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectorId: string;
    provider: IntegrationProvider;
  }
): Promise<{ started: boolean; message: string }> {
  if (input.provider === "samsara") {
    const { runSamsaraFullSync } = await import("@/src/lib/integrations/connectors/samsara/run-sync");
    await runSamsaraFullSync(input.connectorId, input.tenantId);
    return {
      started: true,
      message: "Samsara sync retry has been triggered.",
    };
  }

  return {
    started: false,
    message: "Retry orchestration is framework-ready. Provider-specific retry worker not yet configured.",
  };
}

function resolveConnection(
  definition: ConnectorDefinition,
  connections: IntegrationConnection[]
): IntegrationConnection | null {
  if (definition.key === "webhook") {
    const webhookConnection = connections.find((conn) =>
      conn.provider === "webhook" ||
      conn.provider === "webhook_jobs" ||
      conn.provider === "webhook_telematics"
    );
    return webhookConnection ?? null;
  }
  return connections.find((conn) => conn.provider === definition.provider) ?? null;
}

function buildConnectorSummary(
  definition: ConnectorDefinition,
  connection: IntegrationConnection | null,
  runs: IntegrationSyncRun[],
  tenantId: string
): ConnectorSummary {
  const health = computeConnectorHealth(connection);
  const connectionRuns = connection ? runs.filter((run) => run.connection_id === connection.id) : [];
  const syncStats = {
    totalRuns: connectionRuns.length,
    successfulRuns: connectionRuns.filter((run) => run.status === "success").length,
    failedRuns: connectionRuns.filter((run) => run.status === "failed").length,
    partialRuns: connectionRuns.filter((run) => run.status === "partial").length,
    runningRuns: connectionRuns.filter((run) => run.status === "running").length,
  };

  return {
    connector: definition,
    connection,
    connectionStatus: connection?.status ?? "not_connected",
    health,
    lastSyncAt: connection?.last_sync_at ?? null,
    syncStats,
    errorState: connection?.last_error ?? null,
    tenantOwned: connection?.tenant_id === tenantId,
    config: (connection?.config as Record<string, unknown>) ?? {},
    mappingMetadata: (((connection?.config as Record<string, unknown>) ?? {}).mapping_metadata ??
      {}) as Record<string, unknown>,
    credentialMetadata: (((connection?.config as Record<string, unknown>) ?? {}).credential_metadata ??
      null) as Record<string, unknown> | null,
  };
}
