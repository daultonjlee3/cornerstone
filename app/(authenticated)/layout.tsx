import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { Shell } from "./components/shell";
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

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, tenants(name)")
    .eq("user_id", user.id)
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
  const impersonation = await getImpersonationSession();
  const isImpersonating = impersonation?.admin_user_id === user.id;
  if (isPortalOnly || isImpersonating) {
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

  return (
    <Shell tenantName={tenantName} companyName={companyName}>
      {children}
    </Shell>
  );
}
