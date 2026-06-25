import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { listImportHistory } from "@/src/lib/integrations/import-service";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const batches = await listImportHistory(context.supabase, context.auth.tenantId, limit);
  return NextResponse.json({ batches });
}
