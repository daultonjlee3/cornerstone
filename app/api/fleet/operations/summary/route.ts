import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { loadFleetOperationsSummary } from "@/src/lib/fleet/operations/load-summary";

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
  const skipCache = request.nextUrl.searchParams.get("refresh") === "true";

  try {
    const data = await loadFleetOperationsSummary(supabase, auth.tenantId, {
      date,
      skipCache,
    });
    const response = NextResponse.json(data);
    if (!skipCache) {
      response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    }
    return response;
  } catch (error) {
    console.error("[operations/summary]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Summary unavailable" },
      { status: 503 }
    );
  }
}
