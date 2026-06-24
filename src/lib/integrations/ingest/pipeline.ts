import type { SupabaseClient } from "@supabase/supabase-js";
import { createNotification } from "@/src/lib/notifications/service";
import { updateConnectionSyncStatus } from "@/src/lib/integrations/connections";
import type { IntegrationSyncRunStatus } from "@/src/types/fleet";

export async function notifyIntegrationSyncFailed(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    provider: string;
    errorSummary: string;
  }
): Promise<void> {
  const { data: admins } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", input.tenantId)
    .in("role", ["owner", "admin"]);

  const userIds = (admins ?? []).map((r) => (r as { user_id: string }).user_id);
  const title = "Integration sync failed";
  const message = `${input.provider}: ${input.errorSummary}`;

  for (const userId of userIds) {
    await createNotification(supabase, {
      userId,
      eventType: "integration.sync_failed",
      title,
      message,
      entityType: "integration_connection",
      entityId: input.connectionId,
      metadata: { provider: input.provider },
    });
  }
}

export async function finalizeIngestRun(
  supabase: SupabaseClient,
  input: {
    runId: string;
    tenantId: string;
    connectionId: string;
    provider: string;
    processed: number;
    failed: number;
    errors?: Array<Record<string, unknown>>;
    errorSummary?: string | null;
    affectedDates?: string[];
  }
): Promise<IntegrationSyncRunStatus> {
  const { finishSyncRun } = await import("@/src/lib/integrations/sync-runs");

  const status: IntegrationSyncRunStatus =
    input.failed > 0 && input.processed > 0
      ? "partial"
      : input.failed > 0
        ? "failed"
        : "success";

  await finishSyncRun(supabase, input.runId, input.tenantId, {
    status,
    recordsProcessed: input.processed,
    recordsFailed: input.failed,
    errorSummary: input.errorSummary ?? (input.failed > 0 ? `${input.failed} row(s) failed` : null),
    metadata: { errors: input.errors ?? [] },
  });

  if (status === "failed" || status === "partial") {
    await updateConnectionSyncStatus(supabase, input.connectionId, input.tenantId, {
      lastSyncAt: new Date().toISOString(),
      lastError: input.errorSummary ?? `${input.failed} failed`,
      status: status === "failed" ? "error" : "active",
    });

    if (status === "failed") {
      await notifyIntegrationSyncFailed(supabase, {
        tenantId: input.tenantId,
        connectionId: input.connectionId,
        provider: input.provider,
        errorSummary: input.errorSummary ?? "Sync failed",
      });
    }
  } else {
    await updateConnectionSyncStatus(supabase, input.connectionId, input.tenantId, {
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      status: "active",
    });
  }

  if (status === "success" || status === "partial") {
    const { triggerMartRefreshAfterIngest } = await import(
      "@/src/lib/fleet/marts/refresh-utilization-daily"
    );
    void triggerMartRefreshAfterIngest(
      supabase,
      input.tenantId,
      input.affectedDates
    );
  }

  return status;
}
