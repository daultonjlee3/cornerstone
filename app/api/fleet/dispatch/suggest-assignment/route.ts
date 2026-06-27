import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import {
  loadAssignmentContext,
  suggestAssignmentForJob,
  suggestAssignmentForTruck,
} from "@/src/lib/fleet/dispatch/assignment-service";

type Body = {
  jobId?: string;
  truckId?: string;
  date?: string;
  branchId?: string | null;
};

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as Body;
  const date = body.date?.trim() || new Date().toISOString().slice(0, 10);
  const branchId = body.branchId?.trim() || null;

  if (body.jobId?.trim()) {
    const result = await suggestAssignmentForJob({
      supabase,
      tenantId: auth.tenantId,
      jobId: body.jobId.trim(),
      date,
      branchId,
    });
    return NextResponse.json(result);
  }

  if (body.truckId?.trim()) {
    const result = await suggestAssignmentForTruck({
      supabase,
      tenantId: auth.tenantId,
      truckId: body.truckId.trim(),
      date,
      branchId,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "jobId or truckId is required." }, { status: 400 });
}
