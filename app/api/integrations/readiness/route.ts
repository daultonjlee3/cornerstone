import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { loadReadinessSnapshot } from "@/src/lib/integrations/readiness-service";

export async function GET() {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const snapshot = await loadReadinessSnapshot(context.supabase, context.auth.tenantId);
  return NextResponse.json(snapshot);
}
