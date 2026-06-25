import { MapPin } from "lucide-react";
import { SitesList } from "./components/sites-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";
import { requireFleetModuleAccess } from "../_lib/access";

export const metadata = {
  title: "Customer Sites | Cornerstone Tech",
  description: "Manage customer sites for fleet jobs",
};

export default async function SitesPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const { supabase, auth } = await requireFleetModuleAccess();
  const tenantId = auth.tenantId;

  const params = await resolveSearchParams(searchParams);
  const page = Math.max(1, parseInt(typeof params?.page === "string" ? params.page : "", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(typeof params?.page_size === "string" ? params.page_size : "", 10) || 25)
  );

  const [{ data: sites, error, count }, { data: companies }] = await Promise.all([
    supabase
      .from("customer_sites")
      .select(
        "id, company_id, name, address_line1, city, state, postal_code, country, latitude, longitude, customer_id, companies(name)",
        { count: "exact" }
      )
      .eq("tenant_id", tenantId)
      .order("name")
      .range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from("companies").select("id, name").eq("tenant_id", tenantId).order("name"),
  ]);

  const siteRows = (sites ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const companiesRaw = record.companies;
    const companyRecord = Array.isArray(companiesRaw)
      ? (companiesRaw[0] as { name?: string } | undefined)
      : (companiesRaw as { name?: string } | null);
    return {
      id: String(record.id),
      company_id: String(record.company_id),
      name: String(record.name),
      address_line1: record.address_line1 == null ? null : String(record.address_line1),
      city: record.city == null ? null : String(record.city),
      state: record.state == null ? null : String(record.state),
      postal_code: record.postal_code == null ? null : String(record.postal_code),
      country: record.country == null ? null : String(record.country),
      latitude: record.latitude == null ? null : Number(record.latitude),
      longitude: record.longitude == null ? null : Number(record.longitude),
      customer_id: record.customer_id == null ? null : String(record.customer_id),
      company_name: companyRecord?.name ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<MapPin className="size-5" />}
        title="Customer Sites"
        subtitle="Manage job locations and customer site coordinates."
        variant="surface"
      />
      <SitesList
        sites={siteRows}
        companies={(companies ?? []) as { id: string; name: string }[]}
        error={error?.message ?? null}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
