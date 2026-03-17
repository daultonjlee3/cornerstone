import { MapPin } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { PropertiesList } from "./components/properties-list";
import { resolveMapboxPublicTokenFromEnv } from "@/src/lib/mapbox-token";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";

export const metadata = {
  title: "Properties | Cornerstone Tech",
  description: "Manage properties",
};


export default async function PropertiesPage({
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<MapPin className="size-5" />}
          title="Properties"
          subtitle="Manage properties for your organization."
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add properties.</p>
        </div>
      </div>
    );
  }

  const params = await resolveSearchParams(searchParams);
  const page = Math.max(1, parseInt(typeof params?.page === "string" ? params.page : "", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(typeof params?.page_size === "string" ? params.page_size : "", 10) || 25));

  const baseQuery = supabase
    .from("properties")
    .select("id, property_name, name, company_id, address_line1, address_line2, city, state, zip, country, latitude, longitude, status, companies(name)", { count: "exact" })
    .in("company_id", companyIds)
    .order("name");

  const { data: properties, error, count } = await baseQuery.range((page - 1) * pageSize, page * pageSize - 1);

  const normalized = (properties ?? []).map((p) => {
    const raw = p as { companies?: { name: string } | { name: string }[] };
    const companyData = Array.isArray(raw.companies) ? raw.companies[0] : raw.companies;
    return {
      ...p,
      company: companyData ? { name: companyData.name } : null,
    };
  });

  const mapboxToken = resolveMapboxPublicTokenFromEnv();

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<MapPin className="size-5" />}
        title="Properties"
        subtitle="Manage properties for your organization."
      />
      <PropertiesList
        properties={normalized}
        companies={companies ?? []}
        error={error?.message ?? null}
        mapboxToken={mapboxToken}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
