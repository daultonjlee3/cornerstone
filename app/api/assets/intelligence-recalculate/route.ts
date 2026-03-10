import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { recalculateAssetIntelligenceForScope } from "@/src/lib/assets/assetIntelligenceService";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    company_id?: string | null;
    max_assets?: number;
    stale_hours?: number;
  };

  try {
    const result = await recalculateAssetIntelligenceForScope({
      companyId: body.company_id ?? null,
      maxAssets: body.max_assets ?? 200,
      staleHours: body.stale_hours ?? 12,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to recalculate asset intelligence.";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
