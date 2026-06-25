import { NextResponse } from "next/server";
import {
  createAdminClient,
  isAdminClientConfigError,
} from "@/src/lib/supabase/admin";
import {
  extractWebhookSecret,
  resolveWebhookConnection,
} from "@/src/lib/integrations/ingest/auth";
import {
  normalizeJobWebhookBody,
  upsertJobsBatch,
} from "@/src/lib/integrations/ingest/job-upsert";
import { startSyncRun } from "@/src/lib/integrations/sync-runs";
import { finalizeIngestRun } from "@/src/lib/integrations/ingest/pipeline";
import {
  completeWebhookEvent,
  logWebhookEvent,
  recordWebhookDeliveryAttempt,
} from "@/src/lib/integrations/webhook-framework";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connection")?.trim() ?? "";
  const secret = extractWebhookSecret(request);

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    if (isAdminClientConfigError(error)) {
      console.error("[fleet-webhook-jobs] admin client misconfigured");
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 }
      );
    }
    throw error;
  }
  const connection = await resolveWebhookConnection(admin, connectionId, secret);

  if (!connection || connection.provider !== "webhook_jobs") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  let rawPayload = "";
  try {
    rawPayload = await request.text();
    body = JSON.parse(rawPayload) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const eventKey =
    request.headers.get("x-event-id")?.trim() ||
    (typeof body.event_id === "string" ? body.event_id : null);
  const webhookEvent = await logWebhookEvent(admin, {
    tenantId: connection.tenant_id,
    connectionId: connection.id,
    provider: connection.provider,
    eventKey,
    eventHash: null,
    payloadSummary: {
      provider: connection.provider,
      payload_size: rawPayload.length,
      item_count: Array.isArray(body.jobs) ? body.jobs.length : 1,
    },
    status: "received",
  });
  if (webhookEvent.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const jobs = normalizeJobWebhookBody(body);
  if (jobs.length === 0) {
    await completeWebhookEvent(admin, {
      tenantId: connection.tenant_id,
      webhookEventId: webhookEvent.id,
      status: "failed",
      errorMessage: "No jobs in payload",
    });
    return NextResponse.json({ error: "No jobs in payload" }, { status: 422 });
  }

  await recordWebhookDeliveryAttempt(admin, {
    tenantId: connection.tenant_id,
    webhookEventId: webhookEvent.id,
    attemptNo: 1,
    status: "processing",
  });

  const startedAt = Date.now();
  const run = await startSyncRun(admin, connection.id, connection.tenant_id);

  const result = await upsertJobsBatch(admin, {
    tenantId: connection.tenant_id,
    connectionId: connection.id,
    connectionConfig: connection.config ?? {},
    jobs,
  });

  const status = await finalizeIngestRun(admin, {
    runId: run.id,
    tenantId: connection.tenant_id,
    connectionId: connection.id,
    provider: connection.provider,
    processed: result.processed,
    failed: result.failed,
    errors: result.errors,
    affectedDates: result.affectedDates,
  });

  const httpStatus = status === "failed" ? 422 : 200;

  await recordWebhookDeliveryAttempt(admin, {
    tenantId: connection.tenant_id,
    webhookEventId: webhookEvent.id,
    syncRunId: run.id,
    attemptNo: 2,
    status: status === "failed" ? "failed" : "success",
    durationMs: Date.now() - startedAt,
    errorMessage: status === "failed" ? `${result.failed} row(s) failed` : null,
  });
  await completeWebhookEvent(admin, {
    tenantId: connection.tenant_id,
    webhookEventId: webhookEvent.id,
    syncRunId: run.id,
    status: status === "failed" ? "failed" : status === "partial" ? "partial" : "processed",
    errorMessage: status === "failed" ? `${result.failed} row(s) failed` : null,
  });

  return NextResponse.json(
    {
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
    },
    { status: httpStatus }
  );
}
