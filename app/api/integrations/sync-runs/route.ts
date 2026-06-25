import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { listSyncRuns, startSyncRun, finishSyncRun } from "@/src/lib/integrations/sync-runs";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connection_id") ?? undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20);

  const runs = await listSyncRuns(context.supabase, context.auth.tenantId, {
    connectionId,
    limit,
  });

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "start");

  if (action === "start") {
    const connectionId = String(body.connection_id ?? "");
    if (!connectionId) {
      return NextResponse.json({ error: "connection_id required" }, { status: 400 });
    }
    const run = await startSyncRun(context.supabase, connectionId, context.auth.tenantId);
    return NextResponse.json({ run });
  }

  if (action === "finish") {
    const runId = String(body.run_id ?? "");
    if (!runId) {
      return NextResponse.json({ error: "run_id required" }, { status: 400 });
    }
    await finishSyncRun(context.supabase, runId, context.auth.tenantId, {
      status: (body.status as "success" | "partial" | "failed") ?? "success",
      recordsProcessed: Number(body.records_processed ?? 0),
      recordsFailed: Number(body.records_failed ?? 0),
      errorSummary: body.error_summary != null ? String(body.error_summary) : null,
      metadata: (body.metadata as Record<string, unknown>) ?? {},
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
