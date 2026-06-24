import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase/admin";
import {
  extractWebhookSecret,
  resolveWebhookConnection,
} from "@/src/lib/integrations/ingest/auth";
import {
  insertTelematicsBatch,
  normalizeTelematicsWebhookBody,
} from "@/src/lib/integrations/ingest/telematics-insert";
import { startSyncRun } from "@/src/lib/integrations/sync-runs";
import { finalizeIngestRun } from "@/src/lib/integrations/ingest/pipeline";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connection")?.trim() ?? "";
  const secret = extractWebhookSecret(request);

  const admin = createAdminClient();
  const connection = await resolveWebhookConnection(admin, connectionId, secret);

  if (!connection || connection.provider !== "webhook_telematics") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 422 });
  }

  const events = normalizeTelematicsWebhookBody(body);
  if (events.length === 0) {
    return NextResponse.json({ error: "No events in payload" }, { status: 422 });
  }

  const batchMax =
    typeof connection.config?.batch_max === "number" ? connection.config.batch_max : 100;

  const run = await startSyncRun(admin, connection.id, connection.tenant_id);

  const result = await insertTelematicsBatch(admin, {
    tenantId: connection.tenant_id,
    connectionId: connection.id,
    source: "webhook_telematics",
    events,
    maxBatch: batchMax,
  });

  const status = await finalizeIngestRun(admin, {
    runId: run.id,
    tenantId: connection.tenant_id,
    connectionId: connection.id,
    provider: connection.provider,
    processed: result.processed,
    failed: result.failed,
    errors: result.errors,
  });

  const httpStatus = status === "failed" ? 422 : 200;

  return NextResponse.json(
    {
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
    },
    { status: httpStatus }
  );
}
