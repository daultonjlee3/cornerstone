import { Building } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompaniesList } from "./components/companies-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export const metadata = {
  title: "Companies | Cornerstone Tech",
  description: "Manage companies",
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const params = typeof (searchParams as Promise<SearchParams>)?.then === "function"
    ? await (searchParams as Promise<SearchParams>)
    : (searchParams as SearchParams);
  const pageParam = params?.page;
  const pageSizeParam = params?.page_size;
  const page = Math.max(1, parseInt(typeof pageParam === "string" ? pageParam : "", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(typeof pageSizeParam === "string" ? pageSizeParam : "", 10) || 25));

  const baseQuery = supabase
    .from("companies")
    .select("id, name, legal_name, company_code, status, primary_contact_name, primary_contact_email, phone", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("name");

  const { data: companies, error, count } = await baseQuery.range((page - 1) * pageSize, page * pageSize - 1);

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
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
