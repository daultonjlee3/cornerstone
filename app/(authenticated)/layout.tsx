import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "./components/shell";
import { isPlatformSuperAdmin } from "@/src/lib/auth-context";
import { getImpersonationStateFromCookie } from "@/src/lib/impersonation";

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

  const impersonation = await getImpersonationStateFromCookie();
  const effectiveUserId = impersonation?.actingAsUserId ?? user.id;

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, tenants(name)")
    .eq("user_id", effectiveUserId)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

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
  if (impersonation?.actingAsUserId) {
    const { data: actingUser } = await supabase
      .from("users")
      .select("full_name")
      .eq("id", impersonation.actingAsUserId)
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
