import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { listSyncRuns, startSyncRun, finishSyncRun } from "@/src/lib/integrations/sync-runs";

export async function GET(request: Request) {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ runs: [] }, { status: 401 });
  }

  if (!(await can("integrations.manage"))) {
    return NextResponse.json({ runs: [] }, { status: 403 });
  }

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connection_id") ?? undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20);

  const runs = await listSyncRuns(supabase, auth.tenantId, {
    connectionId,
    limit,
  });

  return NextResponse.json({ runs });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await can("integrations.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "start");

  if (action === "start") {
    const connectionId = String(body.connection_id ?? "");
    if (!connectionId) {
      return NextResponse.json({ error: "connection_id required" }, { status: 400 });
    }
    const run = await startSyncRun(supabase, connectionId, auth.tenantId);
    return NextResponse.json({ run });
  }

  if (action === "finish") {
    const runId = String(body.run_id ?? "");
    if (!runId) {
      return NextResponse.json({ error: "run_id required" }, { status: 400 });
    }
    await finishSyncRun(supabase, runId, auth.tenantId, {
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
