import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAssetTimeline } from "@/src/lib/assets/assetIntelligenceService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  try {
    const result = await getAssetTimeline(id, { limit, offset });
    return NextResponse.json({
      assetId: id,
      events: result.events,
      hasMore: result.hasMore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load timeline.";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
