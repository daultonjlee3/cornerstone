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

  const impersonationState = await getImpersonationStateFromCookie();
  const effectiveUserId = impersonationState?.actingAsUserId ?? user.id;

  const isSuperAdmin = await isPlatformSuperAdmin(supabase);

  let membership: { tenant_id: string; tenants: { name: string } | { name: string }[] | null } | null = null;

  // Super admin "work in this tenant": prefer acting-tenant cookie when set (so you can leave your home tenant)
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

  const { data: profile } = await supabase
    .from("users")
    .select("is_portal_only")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();
  const isPortalOnly = Boolean(
    (profile as { is_portal_only?: boolean | null } | null)?.is_portal_only
  );
  const portalImpersonation = await getImpersonationSession();
  const isPortalImpersonating = portalImpersonation?.admin_user_id === user.id;
  const { data: membershipRows } = await supabase
    .from("tenant_memberships")
    .select("role")
    .eq("user_id", user.id);
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

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("tenant_id", membership.tenant_id)
    .limit(1)
    .maybeSingle();

  const companyName = company?.name ?? "—";
  const showPlatformAdmin = await isPlatformSuperAdmin(supabase);

  let impersonationBanner: { actingAsName: string; companyName: string } | null = null;
  if (impersonationState?.actingAsUserId) {
    const { data: actingUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", impersonationState.actingAsUserId)
      .maybeSingle();
    const actingAsName = (actingUser as { full_name?: string } | null)?.full_name ?? "User";
    impersonationBanner = { actingAsName, companyName };
  }

  const completedTourIds = await getCompletedTourIds();
  const isDemoGuest = await isDemoGuestUser(supabase, user.id);

  return (
    <Shell
      tenantName={tenantName}
      companyName={companyName}
      showPlatformAdmin={showPlatformAdmin}
      impersonationBanner={impersonationBanner}
      completedTourIds={completedTourIds}
      isDemoGuest={isDemoGuest}
    >
      {children}
    </Shell>
  );
}
