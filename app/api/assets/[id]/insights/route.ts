import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getAssetInsights } from "@/src/lib/assets/assetIntelligenceService";
import { calculateFailureRisk } from "@/src/lib/assets/assetHealthService";

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
    const [insights, risk] = await Promise.all([
      getAssetInsights(id),
      calculateFailureRisk(id),
    ]);
    return NextResponse.json({ assetId: id, failureRisk: risk, insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load asset insights.";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
