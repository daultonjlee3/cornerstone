import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { loadFleetKpiInsight } from "@/src/lib/fleet/insights/load-kpi-insight";
import { parseFleetKpiId } from "@/src/lib/fleet/insights/kpi-registry";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const kpiId = parseFleetKpiId(url.searchParams.get("kpi")?.trim());
  if (!kpiId) {
    return NextResponse.json({ error: "Invalid or missing kpi parameter" }, { status: 400 });
  }

  const dateParam = url.searchParams.get("date")?.trim();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : undefined;

  const data = await loadFleetKpiInsight(supabase, auth.tenantId, kpiId, date);
  return NextResponse.json(data);
}
