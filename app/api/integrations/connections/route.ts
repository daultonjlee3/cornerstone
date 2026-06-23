import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { listIntegrationConnections } from "@/src/lib/integrations/connections";

export async function GET() {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ connections: [] }, { status: 401 });
  }

  const allowed =
    (await can("integrations.manage")) || (await can("fleet.view"));
  if (!allowed) {
    return NextResponse.json({ connections: [] }, { status: 403 });
  }

  if (!auth.tenantId) {
    return NextResponse.json({ connections: [] });
  }

  const connections = await listIntegrationConnections(supabase, auth.tenantId);
  return NextResponse.json({ connections });
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
  const provider = String(body.provider ?? "").trim();
  const displayName = body.display_name != null ? String(body.display_name) : null;
  const status = body.status != null ? String(body.status) : "pending";
  const connectionId = body.id != null ? String(body.id) : null;

  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const { upsertIntegrationConnection } = await import("@/src/lib/integrations/connections");
  const connection = await upsertIntegrationConnection(supabase, {
    tenantId: auth.tenantId,
    provider: provider as "csv_manual" | "samsara" | "webhook_jobs" | "webhook_telematics",
    displayName,
    status: status as "pending" | "active" | "error" | "disabled",
    userId: auth.userId,
    connectionId,
  });

  return NextResponse.json({ connection });
}
