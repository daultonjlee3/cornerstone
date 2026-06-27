import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { loadFleetOperationsEnrichment } from "@/src/lib/fleet/operations/load-enrichment";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
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

  const dateParam = request.nextUrl.searchParams.get("date")?.trim();
  const date =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;

  const data = await loadFleetOperationsEnrichment(supabase, auth.tenantId, { date });
  return NextResponse.json(data);
}
