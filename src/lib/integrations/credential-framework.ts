import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationProvider } from "@/src/types/fleet";
import type { ConnectorAuthType } from "@/src/lib/integrations/connector-catalog";

export type CredentialMetadata = {
  authType: ConnectorAuthType;
  provider: IntegrationProvider;
  label?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
  lastRotatedAt?: string | null;
  hasSecret: boolean;
};

export type CredentialInput = {
  authType: ConnectorAuthType;
  provider: IntegrationProvider;
  label?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
  oauthAccessToken?: string | null;
  oauthRefreshToken?: string | null;
  apiKey?: string | null;
  bearerToken?: string | null;
  webhookSecret?: string | null;
};

export type CredentialStorageResult = {
  credentialsRef: string;
  metadata: CredentialMetadata;
  limitation?: string;
};

export function toClientSafeCredentialMetadata(metadata: CredentialMetadata): CredentialMetadata {
  return {
    authType: metadata.authType,
    provider: metadata.provider,
    label: metadata.label ?? null,
    expiresAt: metadata.expiresAt ?? null,
    scopes: metadata.scopes ?? [],
    lastRotatedAt: metadata.lastRotatedAt ?? null,
    hasSecret: metadata.hasSecret,
  };
}

export async function storeConnectorCredentials(
  supabase: SupabaseClient,
  input: {
    tenantId: string;
    connectionId: string;
    payload: CredentialInput;
  }
): Promise<CredentialStorageResult> {
  const metadata: CredentialMetadata = {
    authType: input.payload.authType,
    provider: input.payload.provider,
    label: input.payload.label ?? null,
    expiresAt: input.payload.expiresAt ?? null,
    scopes: input.payload.scopes ?? [],
    lastRotatedAt: new Date().toISOString(),
    hasSecret: hasSecretMaterial(input.payload),
  };

  const credentialsRef = buildCredentialsRef(input.tenantId, input.connectionId, input.payload);
  const { data: existing, error: existingError } = await supabase
    .from("integration_connections")
    .select("config")
    .eq("id", input.connectionId)
    .eq("tenant_id", input.tenantId)
    .single();
  if (existingError) throw new Error(existingError.message);

  const existingConfig = ((existing as { config?: Record<string, unknown> } | null)?.config ??
    {}) as Record<string, unknown>;
  const { error } = await supabase
    .from("integration_connections")
    .update({
      credentials_ref: credentialsRef,
      config: {
        ...existingConfig,
        credential_metadata: toClientSafeCredentialMetadata(metadata),
      },
    })
    .eq("id", input.connectionId)
    .eq("tenant_id", input.tenantId);

  if (error) throw new Error(error.message);

  return {
    credentialsRef,
    metadata,
    limitation:
      "Secrets are not persisted in a dedicated vault in this environment. Only hashed references and safe metadata are stored.",
  };
}

function hasSecretMaterial(payload: CredentialInput): boolean {
  return Boolean(
    payload.oauthAccessToken ||
      payload.oauthRefreshToken ||
      payload.apiKey ||
      payload.bearerToken ||
      payload.webhookSecret
  );
}

function buildCredentialsRef(
  tenantId: string,
  connectionId: string,
  payload: CredentialInput
): string {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        tenantId,
        connectionId,
        provider: payload.provider,
        authType: payload.authType,
        label: payload.label ?? null,
        expiresAt: payload.expiresAt ?? null,
      })
    )
    .digest("hex")
    .slice(0, 20);

  return `credentials:${payload.provider}:${payload.authType}:${fingerprint}`;
}
