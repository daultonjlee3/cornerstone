import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { saveAsset } from "./actions";
import { ASSET_TYPE_OPTIONS } from "./constants";
import { AssetsList, type AssetRow } from "./components/assets-list";
import { saveWorkOrder } from "../work-orders/actions";

export const metadata = {
  title: "Assets | Cornerstone Tech",
  description: "Manage assets",
};

type SearchParams = { [key: string]: string | string[] | undefined };

function getStringParam(
  params: SearchParams | null,
  key: string
): string | null {
  const v = params?.[key];
  if (v == null) return null;
  const s = typeof v === "string" ? v : Array.isArray(v) ? v[0] : null;
  return s?.trim() || null;
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
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

  const params =
    typeof (searchParams as Promise<SearchParams>)?.then === "function"
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams as SearchParams);

  const q = getStringParam(params ?? {}, "q");
  const companyId = getStringParam(params ?? {}, "company_id");
  const propertyId = getStringParam(params ?? {}, "property_id");
  const typeFilter = getStringParam(params ?? {}, "type");
  const conditionFilter = getStringParam(params ?? {}, "condition");
  const statusFilter = getStringParam(params ?? {}, "status");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);
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
    .select("id, property_name, name, company_id")
    .in("company_id", companyIds)
    .order("property_name")
    .order("name");

  const propertyIds = (properties ?? []).map((p) => (p as { id: string }).id);
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("id, building_name, name, property_id")
    .in("property_id", propertyIds)
    .order("building_name")
    .order("name");

  const buildingIds = (buildingsData ?? []).map((b) => (b as { id: string }).id);
  const { data: unitsData } = await supabase
    .from("units")
    .select("id, unit_name, name_or_number, building_id")
    .in("building_id", buildingIds)
    .order("unit_name")
    .order("name_or_number");

  const { data: distinctTypesRows } = await supabase
    .from("assets")
    .select("asset_type")
    .in("company_id", companyIds)
    .not("asset_type", "is", null);

  const distinctTypesFromTenant = Array.from(
    new Set(
      (distinctTypesRows ?? [])
        .map((r) => (r as { asset_type: string }).asset_type?.trim())
        .filter(Boolean) as string[]
    )
  );

  const { data: techniciansData } = await supabase
    .from("technicians")
    .select("id, technician_name, name")
    .in("company_id", companyIds)
    .eq("status", "active")
    .order("technician_name")
    .order("name");

  const { data: crewsData } = await supabase
    .from("crews")
    .select("id, name, company_id")
    .eq("tenant_id", membership.tenant_id)
    .eq("is_active", true)
    .order("name");

  const { data: customersData } = await supabase
    .from("customers")
    .select("id, name, company_id")
    .in("company_id", companyIds)
    .order("name");

  const { data: assetsForWO } = await supabase
    .from("assets")
    .select("id, asset_name, name, company_id, property_id, building_id, unit_id")
    .in("company_id", companyIds)
    .order("asset_name")
    .order("name");

  const companyOptions = (companies ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string }).name,
  }));
  const propertyOptions = (properties ?? []).map((p) => ({
    id: (p as { id: string }).id,
    name:
      (p as { property_name?: string }).property_name ??
      (p as { name?: string }).name ??
      (p as { id: string }).id,
    company_id: (p as { company_id: string }).company_id,
  }));
  const buildingOptions = (buildingsData ?? []).map((b) => ({
    id: (b as { id: string }).id,
    name:
      (b as { building_name?: string }).building_name ??
      (b as { name?: string }).name ??
      (b as { id: string }).id,
    property_id: (b as { property_id: string }).property_id,
  }));
  const unitOptions = (unitsData ?? []).map((u) => ({
    id: (u as { id: string }).id,
    name:
      (u as { unit_name?: string }).unit_name ??
      (u as { name_or_number?: string }).name_or_number ??
      (u as { id: string }).id,
    building_id: (u as { building_id: string }).building_id,
  }));

  let assetsQuery = supabase
    .from("assets")
    .select(
      `
      id, asset_name, name, company_id, property_id, building_id, unit_id,
      asset_tag, asset_type, category, manufacturer, model, serial_number,
      install_date, expected_life_years, replacement_cost, maintenance_cost_last_12_months,
      health_score, failure_risk, last_health_calculation,
      warranty_expires, status, condition, notes, description, location_notes,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      companies(name)
    `
    )
    .in("company_id", companyIds);

  if (companyId) assetsQuery = assetsQuery.eq("company_id", companyId);
  if (propertyId) assetsQuery = assetsQuery.eq("property_id", propertyId);
  if (typeFilter) assetsQuery = assetsQuery.eq("asset_type", typeFilter);
  if (conditionFilter) assetsQuery = assetsQuery.eq("condition", conditionFilter);
  if (statusFilter) assetsQuery = assetsQuery.eq("status", statusFilter);

  if (q && q.trim()) {
    const term = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    assetsQuery = assetsQuery.or(
      `asset_name.ilike.%${term}%,name.ilike.%${term}%,asset_tag.ilike.%${term}%,model.ilike.%${term}%,serial_number.ilike.%${term}%`
    );
  }

  const { data: assetsRaw, error } = await assetsQuery
    .order("asset_name", { ascending: true, nullsFirst: false })
    .order("name");

  const assets = (assetsRaw ?? []).map((a) => {
    const row = a as Record<string, unknown>;
    const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
    const unit = Array.isArray(row.units) ? row.units[0] : row.units;
    const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    const property_name =
      prop && typeof prop === "object" && "property_name" in prop
        ? (prop as { property_name?: string }).property_name ?? (prop as { name?: string }).name
        : null;
    const building_name =
      building && typeof building === "object" && "building_name" in building
        ? (building as { building_name?: string }).building_name ?? (building as { name?: string }).name
        : null;
    const unit_name =
      unit && typeof unit === "object" && "unit_name" in unit
        ? (unit as { unit_name?: string }).unit_name ?? (unit as { name_or_number?: string }).name_or_number
        : null;
    const company_name =
      comp && typeof comp === "object" && "name" in comp ? (comp as { name?: string }).name : null;
    return {
      ...row,
      property_name: property_name ?? undefined,
      building_name: building_name ?? undefined,
      unit_name: unit_name ?? undefined,
      company_name: company_name ?? undefined,
    };
  });

  const typeOptions = Array.from(
    new Set([...ASSET_TYPE_OPTIONS, ...distinctTypesFromTenant])
  ).sort();
  const conditionOptions = ["excellent", "good", "fair", "poor"] as const;
  const statusOptions = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "retired", label: "Retired" },
  ] as const;

  const technicianOptions = (techniciansData ?? []).map((t) => ({
    id: (t as { id: string }).id,
    name: (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? (t as { id: string }).id,
  }));
  const crewOptions = (crewsData ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string }).name,
    company_id: (c as { company_id?: string }).company_id ?? null,
  }));
  const customerOptions = (customersData ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string }).name,
    company_id: (c as { company_id: string }).company_id,
  }));
  const assetOptionsForWO = (assetsForWO ?? []).map((a) => ({
    id: (a as { id: string }).id,
    name: (a as { asset_name?: string }).asset_name ?? (a as { name?: string }).name ?? (a as { id: string }).id,
    company_id: (a as { company_id: string }).company_id,
    property_id: (a as { property_id?: string }).property_id ?? null,
    building_id: (a as { building_id?: string }).building_id ?? null,
    unit_id: (a as { unit_id?: string }).unit_id ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Assets
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Track equipment and assets by location.
        </p>
        </div>
        <Link
          href="/assets/intelligence"
          className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80"
        >
          Open Asset Intelligence
        </Link>
      </div>
      <AssetsList
        assets={assets as AssetRow[]}
        companies={companyOptions}
        properties={propertyOptions}
        buildings={buildingOptions}
        units={unitOptions}
        typeOptions={typeOptions}
        conditionOptions={conditionOptions}
        statusOptions={statusOptions}
        filterParams={{
          q: q ?? "",
          company_id: companyId ?? "",
          property_id: propertyId ?? "",
          type: typeFilter ?? "",
          condition: conditionFilter ?? "",
          status: statusFilter ?? "",
        }}
        error={error?.message ?? null}
        saveAction={saveAsset}
        workOrderFormData={{
          companies: companyOptions,
          customers: customerOptions,
          properties: propertyOptions,
          buildings: buildingOptions,
          units: unitOptions,
          assets: assetOptionsForWO,
          technicians: technicianOptions,
          crews: crewOptions,
          saveWorkOrder,
        }}
      />
    </div>
  );
}
