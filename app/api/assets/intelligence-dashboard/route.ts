import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getAssetIntelligenceDashboard } from "@/src/lib/assets/assetIntelligenceService";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id");

  try {
    const data = await getAssetIntelligenceDashboard({
      companyId,
      supabase: supabase as unknown as SupabaseClient,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load intelligence dashboard.";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
