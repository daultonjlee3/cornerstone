import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { retrieveSyncHistory } from "@/src/lib/integrations/connector-service";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connection_id") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "50")));
  const runs = await retrieveSyncHistory(context.supabase, context.auth.tenantId, {
    connectionId,
    limit,
  });
  return NextResponse.json({ runs });
}
