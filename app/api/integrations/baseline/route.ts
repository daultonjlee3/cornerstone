import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { loadBaselineSnapshot } from "@/src/lib/integrations/baseline-service";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const url = new URL(request.url);
  const windowDays = Number(url.searchParams.get("window_days") ?? "90");
  const baseline = await loadBaselineSnapshot(context.supabase, context.auth.tenantId, windowDays);
  return NextResponse.json(baseline);
}
