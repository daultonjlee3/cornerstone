import { SITE_URL } from "@/lib/marketing-site";

/**
 * Resolves the base URL for Supabase `emailRedirectTo` (must match Dashboard → Auth → Redirect URLs).
 * Prefer the browser-reported origin (`auth_origin` hidden field) when allowlisted, else infer from
 * request headers. Falls back to NEXT_PUBLIC_SITE_URL / SITE_URL.
 *
 * Using only `SITE_URL` breaks local/dev when env defaults to production — Supabase may refuse to
 * send confirmation emails if the redirect URL is not allowed for the active project.
 */
export function isAllowedAuthRedirectOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.pathname && u.pathname !== "/") return false;
    const host = u.hostname;

    if (host === "localhost" || host === "127.0.0.1") return true;

    if (process.env.VERCEL === "1" && host.endsWith(".vercel.app")) return true;

    try {
      const siteHost = new URL(SITE_URL.replace(/\/$/, "")).hostname;
      if (host === siteHost) return true;
    } catch {
      /* ignore */
    }

    const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (envUrl) {
      try {
        if (host === new URL(envUrl).hostname) return true;
      } catch {
        /* ignore */
      }
    }

    const vercel = process.env.VERCEL_URL?.trim();
    if (vercel && host === vercel) return true;

    return false;
  } catch {
    return false;
  }
}

function originFromHeaders(headerList: Headers): string | null {
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return null;

  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    /^localhost:\d+$/.test(host) ||
    /^127\.0\.0\.1:\d+$/.test(host);

  const protoHeader = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto =
    isLocal && protoHeader !== "https"
      ? "http"
      : protoHeader === "http" || protoHeader === "https"
        ? protoHeader
        : isLocal
          ? "http"
          : "https";

  return `${proto}://${host}`.replace(/\/$/, "");
}

/**
 * @param clientOrigin - optional `window.location.origin` from a hidden form field (preferred when valid)
 */
export function resolveAuthRedirectOrigin(
  headerList: Headers,
  clientOrigin?: string | null
): string {
  const trimmed = clientOrigin?.trim();
  if (trimmed && isAllowedAuthRedirectOrigin(trimmed)) {
    return new URL(trimmed).origin;
  }

  const fromHeaders = originFromHeaders(headerList);
  if (fromHeaders && isAllowedAuthRedirectOrigin(fromHeaders)) {
    return fromHeaders;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const v = `https://${vercel}`.replace(/\/$/, "");
    if (isAllowedAuthRedirectOrigin(v)) return v;
  }

  const fallback = SITE_URL.replace(/\/$/, "");
  return fallback;
}

export function buildEmailRedirectTo(origin: string, nextPath: string): string {
  const base = origin.replace(/\/$/, "");
  const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
