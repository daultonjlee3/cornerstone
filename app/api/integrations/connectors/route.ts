import { NextResponse } from "next/server";
import { getIntegrationApiContext } from "@/app/api/integrations/_lib/access";
import { connectConnector, listConnectors } from "@/src/lib/integrations/connector-service";
import type { ConnectorKey } from "@/src/lib/integrations/connector-catalog";
import type { CredentialInput } from "@/src/lib/integrations/credential-framework";

export async function GET() {
  const context = await getIntegrationApiContext("read");
  if (context.response) return context.response;

  const connectors = await listConnectors(context.supabase, context.auth.tenantId);
  return NextResponse.json({ connectors });
}

export async function POST(request: Request) {
  const context = await getIntegrationApiContext("manage");
  if (context.response) return context.response;

  const body = (await request.json()) as Record<string, unknown>;
  const key = String(body.key ?? "").trim() as ConnectorKey;
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  const credentials = (body.credentials ?? null) as CredentialInput | null;
  const { connection, credentialMetadata } = await connectConnector(context.supabase, {
    tenantId: context.auth.tenantId,
    userId: context.auth.userId,
    key,
    displayName: body.display_name != null ? String(body.display_name) : null,
    config: (body.config as Record<string, unknown>) ?? {},
    credentials: credentials ?? undefined,
  });

  return NextResponse.json({
    connection,
    credential_metadata: credentialMetadata,
  });
}
