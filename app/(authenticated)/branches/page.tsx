import { Warehouse } from "lucide-react";
import { BranchesList } from "./components/branches-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";
import { requireFleetModuleAccess } from "@/app/(authenticated)/fleet/_lib/access";

export const metadata = {
  title: "Branches | Cornerstone Tech",
  description: "Manage fleet branches",
};

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
  const { supabase, auth } = await requireFleetModuleAccess();
  const tenantId = auth.tenantId;

  const params = await resolveSearchParams(searchParams);
  const pageParam = params?.page;
  const pageSizeParam = params?.page_size;
  const page = Math.max(1, parseInt(typeof pageParam === "string" ? pageParam : "", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(typeof pageSizeParam === "string" ? pageSizeParam : "", 10) || 25)
  );

  const [{ data: branches, error, count }, { data: companies }] = await Promise.all([
    supabase
      .from("branches")
      .select(
        "id, company_id, name, code, address_line1, city, state, postal_code, country, latitude, longitude, timezone, status, companies(name)",
        { count: "exact" }
      )
      .eq("tenant_id", tenantId)
      .order("name")
      .range((page - 1) * pageSize, page * pageSize - 1),
    supabase.from("companies").select("id, name").eq("tenant_id", tenantId).order("name"),
  ]);

  const branchRows = (branches ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const companiesRaw = record.companies;
    const companyRecord = Array.isArray(companiesRaw)
      ? (companiesRaw[0] as { name?: string } | undefined)
      : (companiesRaw as { name?: string } | null);
    return {
      id: String(record.id),
      company_id: String(record.company_id),
      name: String(record.name),
      code: record.code == null ? null : String(record.code),
      address_line1: record.address_line1 == null ? null : String(record.address_line1),
      city: record.city == null ? null : String(record.city),
      state: record.state == null ? null : String(record.state),
      postal_code: record.postal_code == null ? null : String(record.postal_code),
      country: record.country == null ? null : String(record.country),
      latitude: record.latitude == null ? null : Number(record.latitude),
      longitude: record.longitude == null ? null : Number(record.longitude),
      timezone: String(record.timezone ?? "UTC"),
      status: String(record.status ?? "active"),
      company_name: companyRecord?.name ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Warehouse className="size-5" />}
        title="Branches"
        subtitle="Manage depot and branch locations for your fleet."
        variant="surface"
      />
      <BranchesList
        branches={branchRows}
        companies={(companies ?? []) as { id: string; name: string }[]}
        error={error?.message ?? null}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
