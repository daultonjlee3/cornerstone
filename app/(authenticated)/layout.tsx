import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "./components/shell";
import { isPlatformSuperAdmin, isDemoGuestUser } from "@/src/lib/auth-context";
import { getCompletedTourIds } from "./tours/actions";
import { getImpersonationStateFromCookie } from "@/src/lib/impersonation";
import { getImpersonationSession } from "@/src/lib/portal/access";
import { getActingTenantIdFromCookie } from "@/src/lib/acting-tenant";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Phase 1: Run cookie reads + super-admin check in parallel ──────────────
  // These are all independent of each other — no reason to serialize them.
  const [impersonationState, isSuperAdmin] = await Promise.all([
    getImpersonationStateFromCookie(),
    isPlatformSuperAdmin(supabase),
  ]);
  const effectiveUserId = impersonationState?.actingAsUserId ?? user.id;

  // ── Phase 2: Resolve tenant membership ────────────────────────────────────
  // Super admins may have an acting-tenant override; normal users get their own.
  let membership: { tenant_id: string; tenants: { name: string } | { name: string }[] | null } | null = null;

  if (isSuperAdmin) {
    const actingTenantId = await getActingTenantIdFromCookie();
    if (actingTenantId) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("id", actingTenantId)
        .maybeSingle();
      if (tenant?.id) {
        membership = {
          tenant_id: tenant.id,
          tenants: { name: (tenant as { name?: string }).name ?? "Tenant" },
        };
      }
    }
  }

  if (!membership) {
    membership = await supabase
      .from("tenant_memberships")
      .select("tenant_id, tenants(name)")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => r.data);
  }

  if (!membership) {
    if (isSuperAdmin) redirect("/platform/tenants?switch=1");
    redirect("/onboarding");
  }

  // ── Phase 3: All remaining queries are independent — run in parallel ──────
  // Previously these ran sequentially (6 separate awaits). Parallelizing them
  // removes ~5 round-trip latencies from every authenticated page render.
  const [
    profileResult,
    impersonationSession,
    membershipRolesResult,
    companyResult,
    completedTourIds,
    isDemoGuest,
    actingUserResult,
    displayUserResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("is_portal_only")
      .eq("id", user.id)
      .limit(1)
      .maybeSingle(),
    getImpersonationSession(),
    supabase.from("tenant_memberships").select("role").eq("user_id", user.id),
    supabase
      .from("companies")
      .select("name")
      .eq("tenant_id", membership.tenant_id)
      .limit(1)
      .maybeSingle(),
    getCompletedTourIds(),
    isDemoGuestUser(supabase, user.id),
    // Impersonation banner: name of user being acted as
    impersonationState?.actingAsUserId
      ? supabase
          .from("users")
          .select("full_name")
          .eq("id", impersonationState.actingAsUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Display user name in top bar (acting user: self or impersonated)
    supabase
      .from("users")
      .select("full_name")
      .eq("id", effectiveUserId)
      .maybeSingle(),
  ]);

  // ── Derive values from phase-3 results ────────────────────────────────────
  const profile = profileResult.data;
  const isPortalOnly = Boolean(
    (profile as { is_portal_only?: boolean | null } | null)?.is_portal_only
  );
  const isPortalImpersonating = impersonationSession?.admin_user_id === user.id;
  const { data: membershipRows } = membershipRolesResult;
  const isAdminOrOwner = (membershipRows ?? []).some(
    (r) => (r as { role?: string }).role === "owner" || (r as { role?: string }).role === "admin"
  );

  if (!isAdminOrOwner && (isPortalOnly || isPortalImpersonating)) {
    redirect("/portal");
  }

  const tenantData = (membership as { tenants?: { name: string }[] | { name: string } | null })
    ?.tenants;
  const tenantName =
    (Array.isArray(tenantData) ? tenantData[0]?.name : tenantData?.name) ?? "Organization";

  const companyName = companyResult.data?.name ?? "—";
  const displayUser = displayUserResult?.data as { full_name?: string | null } | null;
  const userName =
    (displayUser?.full_name?.trim() && displayUser.full_name) ||
    (user.email ?? "User");
  // isSuperAdmin already computed in phase 1 — reuse it, don't query again.
  const showPlatformAdmin = isSuperAdmin;
  // Super admins should never be treated as demo guests; they must see full nav (including Settings).
  const effectiveIsDemoGuest = isSuperAdmin ? false : isDemoGuest;

  let impersonationBanner: { actingAsName: string; companyName: string } | null = null;
  if (impersonationState?.actingAsUserId) {
    const actingUser = actingUserResult?.data;
    const actingAsName = (actingUser as { full_name?: string } | null)?.full_name ?? "User";
    impersonationBanner = { actingAsName, companyName };
  }

  return (
    <Shell
      tenantName={tenantName}
      companyName={companyName}
      userName={userName}
      showPlatformAdmin={showPlatformAdmin}
      impersonationBanner={impersonationBanner}
      completedTourIds={completedTourIds}
      isDemoGuest={effectiveIsDemoGuest}
    >
      {children}
    </Shell>
  );
}
