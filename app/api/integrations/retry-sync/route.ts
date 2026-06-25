import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import {
  getConnectorStatus,
  retryFailedSync,
} from "@/src/lib/integrations/connector-service";
import type { ConnectorKey } from "@/src/lib/integrations/connector-catalog";

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const key = String(body.key ?? "").trim();
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const connector = await getConnectorStatus(
    context.supabase,
    context.auth.tenantId,
    key as ConnectorKey
  );
  if (!connector?.connection) {
    return NextResponse.json({ error: "Connector connection not found" }, { status: 404 });
  }

  const result = await retryFailedSync(context.supabase, {
    tenantId: context.auth.tenantId,
    connectorId: connector.connection.id,
    provider: connector.connection.provider,
  });
  return NextResponse.json(result);
}
