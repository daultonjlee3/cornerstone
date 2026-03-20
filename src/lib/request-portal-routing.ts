/**
 * Resolves where /request should route: tenant-aware for signed-in users,
 * global discovery for anonymous visitors (with deterministic ordering).
 */
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type RequestPortalIndexResult =
  | { type: "redirect"; slug: string }
  | { type: "pick"; portals: { slug: string; name: string }[] }
  | { type: "not_configured" };

function portalRowsToPortals(
  rows: { slug: string | null; name: string | null }[]
): { slug: string; name: string }[] {
  return rows
    .filter((r) => r.slug && String(r.slug).trim())
    .map((r) => ({
      slug: String(r.slug).trim(),
      name: String(r.name ?? r.slug).trim() || String(r.slug),
    }));
}

/**
 * Decide what to show at /request (no slug).
 * - Authenticated: scope to the current tenant (and super-admin acting-tenant cookie).
 * - Anonymous: all active portals the DB allows this client to read (typically public or via RLS).
 */
export async function resolveRequestPortalIndex(): Promise<RequestPortalIndexResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const tenantId = await getTenantIdForUser(supabase);
    if (!tenantId) {
      return { type: "not_configured" };
    }
    const { data } = await supabase
      .from("companies")
      .select("slug, name")
      .eq("tenant_id", tenantId)
      .eq("portal_enabled", true)
      .eq("allow_public_requests", true)
      .eq("status", "active")
      .not("slug", "is", null)
      .order("name", { ascending: true });
    const portals = portalRowsToPortals((data ?? []) as { slug: string | null; name: string | null }[]);
    if (portals.length === 0) return { type: "not_configured" };
    if (portals.length === 1) return { type: "redirect", slug: portals[0].slug };
    return { type: "pick", portals };
  }

  const { data } = await supabase
    .from("companies")
    .select("slug, name")
    .eq("portal_enabled", true)
    .eq("allow_public_requests", true)
    .eq("status", "active")
    .not("slug", "is", null)
    .order("name", { ascending: true });
  const portals = portalRowsToPortals((data ?? []) as { slug: string | null; name: string | null }[]);
  if (portals.length === 0) return { type: "not_configured" };
  if (portals.length === 1) return { type: "redirect", slug: portals[0].slug };
  return { type: "pick", portals };
}
