import { Building } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompaniesList } from "./components/companies-list";
import { PageHeader } from "@/src/components/ui/page-header";

export const metadata = {
  title: "Companies | Cornerstone Tech",
  description: "Manage companies",
};

export default async function CompaniesPage() {
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

  if (!membership) redirect("/onboarding");

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, legal_name, company_code, status, primary_contact_name, primary_contact_email, phone")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Building className="size-5" />}
        title="Companies"
        subtitle="Manage companies for your organization."
      />
      <CompaniesList
        companies={companies ?? []}
        error={error?.message ?? null}
      />
    </div>
  );
}
