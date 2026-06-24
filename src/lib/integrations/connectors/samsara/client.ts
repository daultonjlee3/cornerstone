import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mergeTokensIntoConfig,
  readTokensFromConfig,
  refreshSamsaraToken,
  tokensFromOAuthResponse,
  type StoredSamsaraTokens,
} from "./oauth";

const SAMSARA_API_BASE = "https://api.samsara.com";

export class SamsaraApiClient {
  constructor(
    private accessToken: string
  ) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${SAMSARA_API_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Samsara API ${path} failed (${res.status}): ${text}`);
    }

    return (await res.json()) as T;
  }

  async listVehicles(): Promise<SamsaraVehicle[]> {
    const data = await this.request<{ data?: SamsaraVehicle[] }>("/fleet/vehicles");
    return data.data ?? [];
  }

  async listVehicleLocations(): Promise<SamsaraVehicleLocation[]> {
    const data = await this.request<{ data?: SamsaraVehicleLocation[] }>(
      "/fleet/vehicles/locations"
    );
    return data.data ?? [];
  }
}

export type SamsaraVehicle = {
  id: string;
  name?: string;
  externalIds?: Record<string, string>;
};

export type SamsaraVehicleLocation = {
  id: string;
  name?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    time?: string;
    speed?: number;
    heading?: number;
  };
  engineState?: { value?: string };
};

export async function getSamsaraClientForConnection(
  supabase: SupabaseClient,
  connectionId: string,
  tenantId: string
): Promise<SamsaraApiClient | null> {
  const { data } = await supabase
    .from("integration_connections")
    .select("id, tenant_id, config, provider")
    .eq("id", connectionId)
    .eq("tenant_id", tenantId)
    .eq("provider", "samsara")
    .maybeSingle();

  if (!data) return null;

  const config = ((data as { config?: Record<string, unknown> }).config ?? {}) as Record<
    string,
    unknown
  >;
  let tokens = readTokensFromConfig(config);
  if (!tokens) return null;

  if (tokens.expires_at && Date.parse(tokens.expires_at) < Date.now() + 60_000) {
    if (!tokens.refresh_token) return null;
    const refreshed = await refreshSamsaraToken(tokens.refresh_token);
    tokens = tokensFromOAuthResponse(refreshed);
    await supabase
      .from("integration_connections")
      .update({ config: mergeTokensIntoConfig(config, tokens) })
      .eq("id", connectionId)
      .eq("tenant_id", tenantId);
  }

  return new SamsaraApiClient(tokens.access_token);
}

export async function getValidAccessToken(
  config: Record<string, unknown>
): Promise<StoredSamsaraTokens | null> {
  const tokens = readTokensFromConfig(config);
  if (!tokens) return null;

  if (tokens.expires_at && Date.parse(tokens.expires_at) < Date.now() + 60_000) {
    if (!tokens.refresh_token) return null;
    const refreshed = await refreshSamsaraToken(tokens.refresh_token);
    return tokensFromOAuthResponse(refreshed);
  }

  return tokens;
}
