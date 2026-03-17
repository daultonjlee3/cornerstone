import jwt from "jsonwebtoken";

const EMBED_EXPIRATION_MINUTES = 10;

export type MetabaseEmbedParams = {
  /** Company IDs for the current tenant (used for locked filters in Metabase). */
  company_ids?: string[];
  /** Tenant ID (optional; use if your Metabase dashboard filters by tenant). */
  tenant_id?: string;
  /** Any additional locked parameter names and values for the dashboard. */
  [key: string]: string | string[] | undefined;
};

export type MetabaseEmbedResult =
  | { ok: true; embedUrl: string; siteUrl: string }
  | { ok: false; error: string };

/**
 * Strip surrounding quotes from .env values (e.g. METABASE_SECRET_KEY="key").
 * Prevents signature mismatch when Metabase has the key without quotes.
 */
function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Builds Metabase env config from process. Only use server-side.
 * Do not expose METABASE_SECRET_KEY to the client.
 */
function getMetabaseEnv(): {
  siteUrl: string;
  secretKey: string;
  dashboardId: number;
} | null {
  const rawSiteUrl = process.env.METABASE_SITE_URL;
  const rawSecretKey = process.env.METABASE_SECRET_KEY;
  const rawId = process.env.METABASE_DASHBOARD_ID;
  if (rawSiteUrl == null || rawSecretKey == null || rawId == null) return null;
  const siteUrl = stripEnvQuotes(rawSiteUrl).replace(/\/$/, "");
  const secretKey = stripEnvQuotes(rawSecretKey);
  const dashboardId = parseInt(stripEnvQuotes(rawId), 10);
  if (!siteUrl || !secretKey || !Number.isFinite(dashboardId)) return null;
  return { siteUrl, secretKey, dashboardId };
}

/**
 * Converts MetabaseEmbedParams into the shape Metabase expects in the JWT payload.
 * Metabase locked params are a flat object; keys must match the parameter slugs
 * configured on the dashboard (e.g. company_id, tenant_id).
 */
function buildParamsPayload(params: MetabaseEmbedParams): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (params.company_ids?.length) out.company_id = params.company_ids;
  if (params.tenant_id) out.tenant_id = [params.tenant_id];
  for (const [key, value] of Object.entries(params)) {
    if (key === "company_ids" || key === "tenant_id") continue;
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value : [value];
  }
  return out;
}

/**
 * Generates a signed JWT for Metabase guest (static) embedding and returns
 * the full iframe embed URL. Call only on the server; never expose the secret key.
 *
 * Uses METABASE_SITE_URL, METABASE_SECRET_KEY, and METABASE_DASHBOARD_ID from env.
 * A full dev server restart is required after changing .env.local.
 * The app uses tenant_id as the primary scope; pass it so the dashboard can filter by current tenant.
 * Optionally pass company_ids for company-level locked filters.
 */
export function getMetabaseEmbedUrl(params: MetabaseEmbedParams = {}): MetabaseEmbedResult {
  const env = getMetabaseEnv();
  if (!env) {
    const missing: string[] = [];
    if (!process.env.METABASE_SITE_URL?.trim()) missing.push("METABASE_SITE_URL");
    if (!process.env.METABASE_SECRET_KEY?.trim()) missing.push("METABASE_SECRET_KEY");
    if (!process.env.METABASE_DASHBOARD_ID?.trim()) missing.push("METABASE_DASHBOARD_ID");
    return {
      ok: false,
      error: `Metabase embedding is not configured. Set ${missing.join(", ")} in .env.local.`,
    };
  }

  const exp = Math.round(Date.now() / 1000) + EMBED_EXPIRATION_MINUTES * 60;
  const paramsPayload = buildParamsPayload(params);
  const paramsEmpty = Object.keys(paramsPayload).length === 0;

  // Minimal payload required by Metabase: resource, params, exp only.
  const payload = {
    resource: { dashboard: env.dashboardId },
    params: paramsPayload,
    exp,
  };

  if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
    console.log("[Metabase embed]", {
      dashboardId: env.dashboardId,
      siteUrl: env.siteUrl,
      paramsEmpty,
      exp,
    });
  }

  let token: string;
  try {
    token = jwt.sign(payload, env.secretKey, { algorithm: "HS256" });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to sign Metabase JWT.",
    };
  }

  const embedPath = `/embed/dashboard/${token}`;
  const embedUrl = `${env.siteUrl}${embedPath}`;

  return { ok: true, embedUrl, siteUrl: env.siteUrl };
}
