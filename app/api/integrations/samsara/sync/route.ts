import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { runSamsaraFullSync } from "@/src/lib/integrations/connectors/samsara/run-sync";

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

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const connectionId = String(body.connection_id ?? "").trim();

  if (!connectionId) {
    return NextResponse.json({ error: "connection_id required" }, { status: 400 });
  }

  const { data: connection } = await supabase
    .from("integration_connections")
    .select("id, provider")
    .eq("id", connectionId)
    .eq("tenant_id", auth.tenantId)
    .eq("provider", "samsara")
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "Samsara connection not found" }, { status: 404 });
  }

  try {
    await runSamsaraFullSync(connectionId, auth.tenantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
