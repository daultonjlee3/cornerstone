import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { createDispatchPerfTimer } from "@/src/lib/fleet/dispatch/perf";
import {
  getCachedDispatchBoard,
  setCachedDispatchBoard,
} from "@/src/lib/fleet/dispatch/board-cache";

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
  const date =
    url.searchParams.get("date")?.trim() || new Date().toISOString().slice(0, 10);
  const branchId = url.searchParams.get("branch_id")?.trim() || null;
  const skipCache = url.searchParams.get("refresh") === "true";

  if (!skipCache) {
    const cached = getCachedDispatchBoard(auth.tenantId, date, branchId);
    if (cached) {
      return NextResponse.json(cached);
    }
  }

  const perf = createDispatchPerfTimer("api-dispatch-board");
  const data = await loadFleetDispatchBoardData(supabase, auth.tenantId, date, branchId);
  setCachedDispatchBoard(auth.tenantId, date, branchId, data);
  perf.finish();
  return NextResponse.json(data);
}
