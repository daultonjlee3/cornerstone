import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { parseOperationsListQuery } from "@/src/lib/fleet/operations/pagination-types";
import { loadPaginatedPendingRecommendations } from "@/src/lib/fleet/operations/load-recommendations-page";

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

  const query = parseOperationsListQuery(request.nextUrl.searchParams, { pageSize: 10, skip: 1 });
  const data = await loadPaginatedPendingRecommendations(supabase, auth.tenantId, query);
  return NextResponse.json(data);
}
