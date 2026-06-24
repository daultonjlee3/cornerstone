import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { getFleetRecommendations } from "@/src/lib/fleet-recommendation-engine/service";

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
  const date = url.searchParams.get("date")?.trim() || undefined;
  const forceRefresh =
    (url.searchParams.get("refresh")?.trim() ?? "").toLowerCase() === "true";

  const data = await getFleetRecommendations(supabase, auth.tenantId, {
    branchId,
    date,
    forceRefresh,
  });

  return NextResponse.json(data);
}
