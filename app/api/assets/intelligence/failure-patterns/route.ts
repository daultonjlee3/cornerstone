import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import { getPortfolioFailurePatterns } from "@/src/lib/assets/assetIntelligenceInsightsService";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id) {
    return NextResponse.json({ error: "Tenant membership not found." }, { status: 403 });
  }

  const url = new URL(request.url);
  const companyId = url.searchParams.get("company_id"); // Validated inside getPortfolioFailurePatterns against tenant scope
  const limitRaw = Number(url.searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 25)) : 10;

  try {
    const failurePatterns = await getPortfolioFailurePatterns(membership.tenant_id, {
      companyId,
      limit,
      supabase: supabase as unknown as SupabaseClient,
    });
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      count: failurePatterns.length,
      failurePatterns,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load asset failure patterns.";
    const status = message.toLowerCase().includes("unauthorized") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
