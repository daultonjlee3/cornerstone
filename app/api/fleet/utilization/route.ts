import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { loadFleetUtilizationReport } from "@/src/lib/fleet/queries/utilization-report";

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
  const from = url.searchParams.get("from")?.trim() || undefined;
  const to = url.searchParams.get("to")?.trim() || undefined;
  const branchId = url.searchParams.get("branch_id")?.trim() || null;
  const truckId = url.searchParams.get("truck_id")?.trim() || null;

  const data = await loadFleetUtilizationReport(supabase, auth.tenantId, {
    from,
    to,
    branchId,
    truckId,
  });

  return NextResponse.json(data);
}
