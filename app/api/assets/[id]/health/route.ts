import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAssetHealthBreakdown } from "@/src/lib/assets/assetHealthService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const health = await getAssetHealthBreakdown(id);
    return NextResponse.json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load asset health.";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
