import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationProvider } from "@/src/types/fleet";
import { verifyWebhookSecret } from "@/src/lib/integrations/webhook-secret";

export type ResolvedWebhookConnection = {
  id: string;
  tenant_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  webhook_secret_hash: string | null;
};

export function extractWebhookSecret(request: Request): string | null {
  const header = request.headers.get("x-webhook-secret")?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function resolveWebhookConnection(
  supabase: SupabaseClient,
  connectionId: string,
  secret: string | null
): Promise<ResolvedWebhookConnection | null> {
  if (!connectionId || !secret) return null;

  const { data, error } = await supabase
    .from("integration_connections")
    .select("id, tenant_id, provider, config, webhook_secret_hash, status")
    .eq("id", connectionId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ResolvedWebhookConnection & { status: string };
  if (row.status === "disabled") return null;
  if (!verifyWebhookSecret(secret, row.webhook_secret_hash)) return null;

  if (row.provider !== "webhook_jobs" && row.provider !== "webhook_telematics") {
    return null;
  }

  return row;
}

export async function verifyConnectionBelongsToTenant(
  supabase: SupabaseClient,
  connectionId: string,
  tenantId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("integration_connections")
    .select("id")
    .eq("id", connectionId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return !!data;
}
