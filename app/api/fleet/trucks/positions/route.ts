import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { listTruckLatestPositions } from "@/src/lib/fleet/queries";

export async function GET() {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ positions: [] }, { status: 401 });
  }

  if (!(await can("fleet.view"))) {
    return NextResponse.json({ positions: [] }, { status: 403 });
  }

  if (!auth.tenantId) {
    return NextResponse.json({ positions: [] });
  }

  const positions = await listTruckLatestPositions(supabase, auth.tenantId);
  return NextResponse.json({ positions });
}
