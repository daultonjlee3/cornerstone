import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser, getProductProfileForTenant } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";

export const metadata = {
  title: "Connected Systems | Cornerstone Tech",
  description: "Connected systems registry for fleet operational intelligence",
};

export default async function IntegrationsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const productProfile = await getProductProfileForTenant(tenantId, supabase);
  if (productProfile === "cmms") redirect("/settings/company");

  const canManage = (await can("integrations.manage")) || (await can("fleet.view"));
  if (!canManage) redirect("/settings");

  redirect("/implementation/connections");
}
