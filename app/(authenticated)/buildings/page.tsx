import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { BuildingsList } from "./components/buildings-list";

export const metadata = {
  title: "Buildings | Cornerstone Tech",
  description: "Manage buildings",
};

export default async function BuildingsPage() {
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

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", membership.tenant_id);

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Buildings
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Manage buildings at each property.
          </p>
        </div>
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Buildings
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Manage buildings at each property.
          </p>
        </div>
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

  const { data: buildings, error } = await supabase
    .from("buildings")
    .select("id, building_name, name, property_id, building_code, address, city, state, postal_code, country, latitude, longitude, status, year_built, floors, square_feet, notes, properties(name, property_name, company_id)")
    .in("property_id", propertyIds)
    .order("building_name")
    .order("name");

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

  const mapboxToken =
    (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim() || null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Buildings
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Manage buildings at each property.
        </p>
      </div>
      <BuildingsList
        buildings={normalized}
        properties={propertyOptions}
        error={error?.message ?? null}
        mapboxToken={mapboxToken}
      />
    </div>
  );
}
