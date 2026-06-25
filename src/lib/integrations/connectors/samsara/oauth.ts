import { createHmac, timingSafeEqual } from "crypto";

function resolveStateSecret(): string {
  const configuredSecret =
    process.env.SAMSARA_OAUTH_STATE_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (configuredSecret) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SAMSARA_OAUTH_STATE_SECRET is required in production.");
  }
  return "dev-oauth-state-secret";
}

const STATE_SECRET = resolveStateSecret();

export type SamsaraOAuthState = {
  tenantId: string;
  userId: string;
  connectionId?: string;
  ts: number;
};

export function signOAuthState(payload: SamsaraOAuthState): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", STATE_SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyOAuthState(state: string): SamsaraOAuthState | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = createHmac("sha256", STATE_SECRET).update(data).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SamsaraOAuthState;
    if (!payload.tenantId || !payload.userId) return null;
    if (Date.now() - payload.ts > 15 * 60 * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSamsaraOAuthConfig() {
  const clientId = process.env.SAMSARA_CLIENT_ID?.trim();
  const clientSecret = process.env.SAMSARA_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.SAMSARA_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"}/api/integrations/samsara/oauth/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function buildSamsaraAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getSamsaraOAuthConfig();
  if (!clientId) throw new Error("SAMSARA_CLIENT_ID is not configured.");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
  });

  return `https://api.samsara.com/oauth2/authorize?${params.toString()}`;
}

export type SamsaraTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeSamsaraCode(code: string): Promise<SamsaraTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getSamsaraOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Samsara OAuth credentials are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://api.samsara.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Samsara token exchange failed: ${text}`);
  }

  return (await res.json()) as SamsaraTokenResponse;
}

export async function refreshSamsaraToken(refreshToken: string): Promise<SamsaraTokenResponse> {
  const { clientId, clientSecret } = getSamsaraOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Samsara OAuth credentials are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch("https://api.samsara.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Samsara token refresh failed: ${text}`);
  }

  return (await res.json()) as SamsaraTokenResponse;
}

export type StoredSamsaraTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export function tokensFromOAuthResponse(res: SamsaraTokenResponse): StoredSamsaraTokens {
  const expiresIn = res.expires_in ?? 3600;
  return {
    access_token: res.access_token,
    refresh_token: res.refresh_token ?? "",
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export function readTokensFromConfig(config: Record<string, unknown>): StoredSamsaraTokens | null {
  const tokens = config._tokens as StoredSamsaraTokens | undefined;
  if (!tokens?.access_token) return null;
  return tokens;
}

export function mergeTokensIntoConfig(
  config: Record<string, unknown>,
  tokens: StoredSamsaraTokens
): Record<string, unknown> {
  return { ...config, _tokens: tokens };
}
