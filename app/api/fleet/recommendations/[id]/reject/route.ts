import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { applyRecommendationOutcome } from "@/src/lib/fleet-recommendation-engine/service";

type Params = {
  id: string;
};

/** Semantic alias for dismiss — records a rejected recommendation decision. */
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

  if (!auth.tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { notes?: string; date?: string };

  try {
    const recommendation = await applyRecommendationOutcome(supabase, auth.tenantId, {
      recommendationId: id,
      action: "dismissed",
      actedBy: auth.userId ?? null,
      notes: body.notes ?? null,
      boardDate: body.date ?? null,
    });
    return NextResponse.json({ recommendation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reject recommendation" },
      { status: 422 }
    );
  }
}
