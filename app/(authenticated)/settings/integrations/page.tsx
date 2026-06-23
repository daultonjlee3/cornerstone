import { Plug } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser, getProductProfileForTenant } from "@/src/lib/auth-context";
import { can } from "@/src/lib/permissions";
import { IntegrationsClient } from "./integrations-client";

export const metadata = {
  title: "Integrations | Cornerstone Tech",
  description: "Integration control plane for fleet data sources",
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

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Plug className="size-5" />}
        title="Integration Control Plane"
        subtitle="Monitor connections, sync runs, and fleet data imports."
      />
      <IntegrationsClient />
    </div>
  );
}
