import { DoorOpen } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { UnitsList } from "./components/units-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { resolveSearchParams, getStringParam } from "@/src/lib/page-utils";

export const metadata = {
  title: "Units | Cornerstone Tech",
  description: "Manage units",
};

type SearchParams = { page?: string; page_size?: string };

export default async function UnitsPage({
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

  const params = await resolveSearchParams(searchParams);
  const page = Math.max(1, parseInt(getStringParam(params, "page") ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(getStringParam(params, "page_size") ?? "25", 10) || 25));

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<DoorOpen className="size-5" />}
          title="Units"
          subtitle="Manage spaces within buildings."
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a company, property, and building first, then add units.</p>
        </div>
      </div>
    );
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .in("company_id", companyIds);

  const propertyIds = (properties ?? []).map((p) => p.id);
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("id, building_name, name")
    .in("property_id", propertyIds)
    .order("building_name")
    .order("name");

  const buildingIds = (buildingsData ?? []).map((b) => b.id);
  const buildingOptions = (buildingsData ?? []).map((b) => ({
    id: b.id,
    name: (b as { building_name?: string }).building_name ?? (b as { name?: string }).name ?? b.id,
  }));

  if (buildingIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<DoorOpen className="size-5" />}
          title="Units"
          subtitle="Manage spaces within buildings."
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a building first, then add units.</p>
        </div>
      </div>
    );
  }

  const baseQuery = supabase
    .from("units")
    .select("id, unit_name, name_or_number, building_id, unit_code, floor, square_feet, square_footage, occupancy_type, status, notes, address, latitude, longitude, buildings(building_name, name, property_id, properties(company_id))", { count: "exact" })
    .in("building_id", buildingIds)
    .order("unit_name")
    .order("name_or_number");

  const { data: units, error, count } = await baseQuery.range((page - 1) * pageSize, page * pageSize - 1);

  const normalized = (units ?? []).map((u) => {
    const raw = u as {
      buildings?: { building_name?: string; name?: string; property_id?: string; properties?: { company_id?: string } | { company_id?: string }[] } | { building_name?: string; name?: string; property_id?: string; properties?: { company_id?: string } | { company_id?: string }[] }[];
    };
    const bData = Array.isArray(raw.buildings) ? raw.buildings[0] : raw.buildings;
    const propData = bData?.properties && (Array.isArray(bData.properties) ? bData.properties[0] : bData.properties);
    return {
      ...u,
      building: bData
        ? {
            ...bData,
            property_id: bData.property_id,
            company_id: propData && typeof propData === "object" && "company_id" in propData ? (propData as { company_id: string }).company_id : undefined,
          }
        : null,
    };
  });

return (
    <div className="space-y-8">
      <PageHeader
        icon={<DoorOpen className="size-5" />}
        title="Units"
        subtitle="Manage spaces within buildings."
      />
      <UnitsList
        units={normalized}
        buildings={buildingOptions}
        error={error?.message ?? null}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
