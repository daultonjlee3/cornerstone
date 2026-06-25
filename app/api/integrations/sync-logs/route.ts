import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { retrieveSyncLogs } from "@/src/lib/integrations/connector-service";

export async function GET(request: Request) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") ?? undefined;
  const status =
    (url.searchParams.get("status") as "info" | "success" | "warning" | "error" | null) ?? undefined;
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get("limit") ?? "100")));
  const logs = await retrieveSyncLogs(context.supabase, context.auth.tenantId, {
    provider,
    status,
    limit,
  });
  return NextResponse.json({ logs });
}
