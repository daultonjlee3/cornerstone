import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import {
  disconnectConnector,
  getConnectorStatus,
  updateConnectorConfig,
} from "@/src/lib/integrations/connector-service";
import type { ConnectorKey } from "@/src/lib/integrations/connector-catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const { key } = await params;
  const connector = await getConnectorStatus(
    context.supabase,
    context.auth.tenantId,
    key as ConnectorKey
  );
  if (!connector) {
    return NextResponse.json({ error: "Connector not found" }, { status: 404 });
  }
  return NextResponse.json({ connector });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const { key } = await params;
  const connector = await getConnectorStatus(
    context.supabase,
    context.auth.tenantId,
    key as ConnectorKey
  );
  if (!connector?.connection) {
    return NextResponse.json({ error: "Connector connection not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const updated = await updateConnectorConfig(context.supabase, {
    tenantId: context.auth.tenantId,
    connectorId: connector.connection.id,
    config: (body.config as Record<string, unknown>) ?? {},
    displayName: body.display_name != null ? String(body.display_name) : null,
  });

  return NextResponse.json({ connection: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const { key } = await params;
  const connector = await getConnectorStatus(
    context.supabase,
    context.auth.tenantId,
    key as ConnectorKey
  );
  if (!connector?.connection) {
    return NextResponse.json({ error: "Connector connection not found" }, { status: 404 });
  }

  await disconnectConnector(context.supabase, context.auth.tenantId, connector.connection.id);
  return NextResponse.json({ ok: true });
}
