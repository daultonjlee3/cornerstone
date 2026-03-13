import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "./components/shell";
import { isPlatformSuperAdmin } from "@/src/lib/auth-context";
import { getImpersonationStateFromCookie } from "@/src/lib/impersonation";
import { getImpersonationSession } from "@/src/lib/portal/access";

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

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, tenants(name)")
    .eq("user_id", effectiveUserId)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

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

  return (
    <Shell
      tenantName={tenantName}
      companyName={companyName}
      showPlatformAdmin={showPlatformAdmin}
      impersonationBanner={impersonationBanner}
    >
      {children}
    </Shell>
  );
}
