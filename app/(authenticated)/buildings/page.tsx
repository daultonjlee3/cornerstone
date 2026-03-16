import { Landmark } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { BuildingsList } from "./components/buildings-list";
import { resolveMapboxPublicTokenFromEnv } from "@/src/lib/mapbox-token";
import { PageHeader } from "@/src/components/ui/page-header";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { resolveSearchParams, type SearchParams } from "@/src/lib/page-utils";

export const metadata = {
  title: "Buildings | Cornerstone Tech",
  description: "Manage buildings",
};


export default async function BuildingsPage({
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
    .select("id")
    .eq("tenant_id", tenantId);

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<Landmark className="size-5" />}
          title="Buildings"
          subtitle="Manage buildings at each property."
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a company and property first, then add buildings.</p>
        </div>
      </div>
    );
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, property_name")
    .in("company_id", companyIds)
    .order("name");

  const propertyIds = (properties ?? []).map((p) => p.id);
  if (propertyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<Landmark className="size-5" />}
          title="Buildings"
          subtitle="Manage buildings at each property."
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a property first, then add buildings.</p>
        </div>
      </div>
    );
  }

  const propertyOptions = (properties ?? []).map((p) => ({
    id: p.id,
    name: (p as { property_name?: string }).property_name ?? (p as { name?: string }).name ?? p.id,
  }));

  const params = await resolveSearchParams(searchParams);
  const page = Math.max(1, parseInt(typeof params?.page === "string" ? params.page : "", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(typeof params?.page_size === "string" ? params.page_size : "", 10) || 25));

  const baseQuery = supabase
    .from("buildings")
    .select("id, building_name, name, property_id, building_code, address, city, state, postal_code, country, latitude, longitude, status, year_built, floors, square_feet, notes, properties(name, property_name, company_id)", { count: "exact" })
    .in("property_id", propertyIds)
    .order("building_name")
    .order("name");

  const { data: buildings, error, count } = await baseQuery.range((page - 1) * pageSize, page * pageSize - 1);

  const normalized = (buildings ?? []).map((b) => {
    const raw = b as { properties?: { name?: string; property_name?: string; company_id?: string } | { name?: string; property_name?: string; company_id?: string }[] };
    const propData = Array.isArray(raw.properties) ? raw.properties[0] : raw.properties;
    return {
      ...b,
      property: propData
        ? { name: propData.property_name ?? propData.name ?? "—", company_id: propData.company_id }
        : null,
    };
  });

  const mapboxToken = resolveMapboxPublicTokenFromEnv();

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Landmark className="size-5" />}
        title="Buildings"
        subtitle="Manage buildings at each property."
      />
      <BuildingsList
        buildings={normalized}
        properties={propertyOptions}
        error={error?.message ?? null}
        mapboxToken={mapboxToken}
        totalCount={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
