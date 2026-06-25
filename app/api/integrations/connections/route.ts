import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { listIntegrationConnections } from "@/src/lib/integrations/connections";
import type { IntegrationConnectionStatus, IntegrationProvider } from "@/src/types/fleet";
import { sanitizeIntegrationConnectionForClient } from "@/src/lib/integrations/connections";

export async function GET() {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;
  const connections = await listIntegrationConnections(context.supabase, context.auth.tenantId);
  return NextResponse.json({
    connections: connections.map((connection) => sanitizeIntegrationConnectionForClient(connection)),
  });
}

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "upsert").trim();

  if (action === "create_webhook") {
    const provider = String(body.provider ?? "").trim();
    if (provider !== "webhook_jobs" && provider !== "webhook_telematics") {
      return NextResponse.json({ error: "Invalid webhook provider" }, { status: 400 });
    }
    const { createWebhookConnection } = await import("@/src/lib/integrations/connections");
    const { connection, webhookSecret } = await createWebhookConnection(context.supabase, {
      tenantId: context.auth.tenantId,
      provider,
      displayName: body.display_name != null ? String(body.display_name) : null,
      config: (body.config as Record<string, unknown>) ?? {},
      userId: context.auth.userId,
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
    const webhookPath =
      provider === "webhook_jobs"
        ? "/api/integrations/webhooks/jobs"
        : "/api/integrations/webhooks/telematics";
    return NextResponse.json({
      connection: sanitizeIntegrationConnectionForClient(connection),
      webhook_secret: webhookSecret,
      webhook_url: `${baseUrl}${webhookPath}?connection=${connection.id}`,
    });
  }

  const provider = String(body.provider ?? "").trim();
  const displayName = body.display_name != null ? String(body.display_name) : null;
  const status = body.status != null ? String(body.status) : "pending";
  const connectionId = body.id != null ? String(body.id) : null;

  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 });
  }

  const { upsertIntegrationConnection } = await import("@/src/lib/integrations/connections");
  const connection = await upsertIntegrationConnection(context.supabase, {
    tenantId: context.auth.tenantId,
    provider: provider as IntegrationProvider,
    displayName,
    status: status as IntegrationConnectionStatus,
    userId: context.auth.userId,
    connectionId,
  });

  return NextResponse.json({ connection: sanitizeIntegrationConnectionForClient(connection) });
}
