import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import {
  completeOnboardingWizardAction,
  generateDemoDataAction,
  importAssetSpreadsheetAction,
} from "./asset-first-actions";
import { OnboardingWizard } from "./components/OnboardingWizard";

export const metadata = {
  title: "Onboarding Wizard | Cornerstone Tech",
  description: "Multi-step customer onboarding wizard with CSV import",
};

export default async function OnboardingWizardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id) redirect("/onboarding");

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", membership.tenant_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!company?.id) redirect("/onboarding");

  const companyId = company.id;
  const [
    propertiesCount,
    buildingsCount,
    techniciansCount,
    productsCount,
    workOrdersCount,
    assetsCount,
    pmPlansCount,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("buildings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", membership.tenant_id),
    supabase
      .from("technicians")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
    supabase
      .from("preventive_maintenance_plans")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  const counts = {
    properties: propertiesCount.count ?? 0,
    buildings: buildingsCount.count ?? 0,
    technicians: techniciansCount.count ?? 0,
    products: productsCount.count ?? 0,
    workOrders: workOrdersCount.count ?? 0,
    assets: assetsCount.count ?? 0,
    pmPlans: pmPlansCount.count ?? 0,
  };

  return (
    <OnboardingWizard
      counts={counts}
      importAction={importAssetSpreadsheetAction}
      demoAction={generateDemoDataAction}
      completeAction={completeOnboardingWizardAction}
    />
  );
}
