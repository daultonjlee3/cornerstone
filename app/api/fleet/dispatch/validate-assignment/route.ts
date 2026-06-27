import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import {
  loadAssignmentContext,
  validateFleetAssignmentPair,
} from "@/src/lib/fleet/dispatch/assignment-service";

type Body = {
  truckId?: string;
  jobId?: string;
  date?: string;
  branchId?: string | null;
  snapshotId?: string;
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
  const truckId = body.truckId?.trim();
  const jobId = body.jobId?.trim();
  const date = body.date?.trim() || new Date().toISOString().slice(0, 10);
  const branchId = body.branchId?.trim() || null;

  if (!truckId || !jobId) {
    return NextResponse.json({ error: "truckId and jobId are required." }, { status: 400 });
  }

  const { board, profitCtx, snapshotId } = await loadAssignmentContext(
    supabase,
    auth.tenantId,
    date,
    branchId
  );

  if (body.snapshotId?.trim() && body.snapshotId.trim() !== snapshotId) {
    return NextResponse.json(
      {
        valid: false,
        snapshotId,
        blockingReasons: [
          {
            code: "snapshot_hash_mismatch",
            message: "Operational snapshot changed since validation started.",
          },
        ],
      },
      { status: 409 }
    );
  }

  const job = board.jobs.find((j) => j.id === jobId);
  const lane = board.truckLanes.find((l) => l.truck_id === truckId);

  if (!job || !lane) {
    return NextResponse.json(
      {
        valid: false,
        snapshotId,
        blockingReasons: [
          {
            code: job ? "truck_not_found" : "job_not_found",
            message: job ? "Truck is not on the dispatch board." : "Job is not on the dispatch board.",
          },
        ],
      },
      { status: 404 }
    );
  }

  const validation = validateFleetAssignmentPair({ job, lane, board, profitCtx });
  return NextResponse.json(validation);
}
