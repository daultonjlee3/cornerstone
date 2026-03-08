import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssetsList } from "./components/assets-list";

export const metadata = {
  title: "Assets | Cornerstone Tech",
  description: "Manage assets",
};

export default async function AssetsPage() {
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
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Assets
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Track equipment and assets by location.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add assets.</p>
        </div>
      </div>
    );
  }

  const { data: properties } = await supabase
    .from("properties")
    .select("id, property_name, name")
    .in("company_id", companyIds)
    .order("property_name")
    .order("name");

  const propertyIds = (properties ?? []).map((p) => p.id);
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("id, building_name, name")
    .in("property_id", propertyIds)
    .order("building_name")
    .order("name");

  const buildingIds = (buildingsData ?? []).map((b) => b.id);
  const { data: unitsData } = await supabase
    .from("units")
    .select("id, unit_name, name_or_number")
    .in("building_id", buildingIds)
    .order("unit_name")
    .order("name_or_number");

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));
  const propertyOptions = (properties ?? []).map((p) => ({
    id: p.id,
    name: (p as { property_name?: string }).property_name ?? (p as { name?: string }).name ?? p.id,
  }));
  const buildingOptions = (buildingsData ?? []).map((b) => ({
    id: b.id,
    name: (b as { building_name?: string }).building_name ?? (b as { name?: string }).name ?? b.id,
  }));
  const unitOptions = (unitsData ?? []).map((u) => ({
    id: u.id,
    name: (u as { unit_name?: string }).unit_name ?? (u as { name_or_number?: string }).name_or_number ?? u.id,
  }));

  const { data: assetsRaw, error } = await supabase
    .from("assets")
    .select(`
      id, asset_name, name, company_id, property_id, building_id, unit_id,
      asset_tag, category, manufacturer, model, serial_number, install_date, status, notes,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number)
    `)
    .in("company_id", companyIds)
    .order("asset_name")
    .order("name");

  const assets = (assetsRaw ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
    const unit = Array.isArray(row.units) ? row.units[0] : row.units;
    const property_name = prop && typeof prop === "object" && "property_name" in prop
      ? (prop as { property_name?: string }).property_name ?? (prop as { name?: string }).name
      : null;
    const building_name = building && typeof building === "object" && "building_name" in building
      ? (building as { building_name?: string }).building_name ?? (building as { name?: string }).name
      : null;
    const unit_name = unit && typeof unit === "object" && "unit_name" in unit
      ? (unit as { unit_name?: string }).unit_name ?? (unit as { name_or_number?: string }).name_or_number
      : null;
    return {
      ...a,
      property_name: property_name ?? undefined,
      building_name: building_name ?? undefined,
      unit_name: unit_name ?? undefined,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Assets
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Track equipment and assets by location.
        </p>
      </div>
      <AssetsList
        assets={assets}
        companies={companyOptions}
        properties={propertyOptions}
        buildings={buildingOptions}
        units={unitOptions}
        error={error?.message ?? null}
      />
    </div>
  );
}
