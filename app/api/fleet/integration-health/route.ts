import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { buildIntegrationHealthFromConnections } from "@/src/lib/fleet/queries/today-view";
import type { IntegrationConnection } from "@/src/types/fleet";

export async function GET() {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await can("fleet.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("integration_connections")
    .select("id, provider, display_name, status, config, last_sync_at, last_error")
    .eq("tenant_id", auth.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const connections = (data ?? []) as IntegrationConnection[];
  return NextResponse.json({
    integrationHealth: buildIntegrationHealthFromConnections(connections),
  });
}
