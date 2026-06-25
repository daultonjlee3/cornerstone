import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { applyRecommendationOutcome } from "@/src/lib/fleet-recommendation-engine/service";
import { DEMO_READ_ONLY_ERROR, isDemoReadOnlyUser } from "@/src/lib/demo/readOnly";

type Params = {
  id: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> }
) {
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

  if (await isDemoReadOnlyUser(supabase)) {
    return NextResponse.json({ error: DEMO_READ_ONLY_ERROR }, { status: 403 });
  }

  if (!auth.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { notes?: string };

  try {
    const recommendation = await applyRecommendationOutcome(supabase, auth.tenantId, {
      recommendationId: id,
      action: "accepted",
      actedBy: auth.userId ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ recommendation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept recommendation" },
      { status: 422 }
    );
  }
}
