import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { commitFleetAssignment } from "@/src/lib/fleet/dispatch/assignment-service";

type Body = {
  truckId?: string;
  jobId?: string;
  date?: string;
  branchId?: string | null;
  validationId?: string;
  snapshotId?: string;
  assignmentSource?: "manual_drag" | "ai_recommendation" | "map_click";
  recommendationId?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await can("fleet.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const truckId = body.truckId?.trim();
  const jobId = body.jobId?.trim();
  const validationId = body.validationId?.trim();
  const snapshotId = body.snapshotId?.trim();
  const date = body.date?.trim() || new Date().toISOString().slice(0, 10);
  const branchId = body.branchId?.trim() || null;
  const assignmentSource = body.assignmentSource ?? "manual_drag";

  if (!truckId || !jobId || !validationId || !snapshotId) {
    return NextResponse.json(
      { error: "truckId, jobId, validationId, and snapshotId are required." },
      { status: 400 }
    );
  }

  try {
    const result = await commitFleetAssignment(supabase, auth.tenantId, {
      truckId,
      jobId,
      date,
      branchId,
      validationId,
      snapshotId,
      assignmentSource,
      recommendationId: body.recommendationId ?? null,
      actedBy: auth.userId ?? null,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assignment failed." },
      { status: 422 }
    );
  }
}
