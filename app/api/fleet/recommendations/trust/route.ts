import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { loadRecommendationTrustDashboard } from "@/src/lib/fleet-recommendation-engine/trust-dashboard";

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
  const branchId = url.searchParams.get("branch_id")?.trim() || null;
  const from = url.searchParams.get("from")?.trim() || undefined;
  const to = url.searchParams.get("to")?.trim() || undefined;
  const skipRefresh =
    (url.searchParams.get("skip_refresh")?.trim() ?? "").toLowerCase() === "true";

  const dashboard = await loadRecommendationTrustDashboard(supabase, auth.tenantId, {
    branchId,
    from,
    to,
    refreshOutcomes: !skipRefresh,
  });

  return NextResponse.json(dashboard);
}
