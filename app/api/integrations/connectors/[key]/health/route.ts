import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import {
  getConnectorStatus,
  recordConnectorHealth,
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

  if (connector.connection) {
    const normalized =
      connector.health.status === "not_connected"
        ? "warning"
        : connector.health.status === "healthy"
          ? "healthy"
          : connector.health.status;
    await recordConnectorHealth(context.supabase, {
      tenantId: context.auth.tenantId,
      connectorId: connector.connection.id,
      health: normalized,
      code: `connector_health_${connector.connector.key}`,
      title: `${connector.connector.displayName} health`,
      description: connector.health.reason ?? connector.health.label,
      metadata: {
        status: connector.health.status,
        last_sync_at: connector.lastSyncAt,
      },
    });
  }

  return NextResponse.json({
    connector: connector.connector,
    health: connector.health,
    status: connector.connectionStatus,
    sync_stats: connector.syncStats,
  });
}
