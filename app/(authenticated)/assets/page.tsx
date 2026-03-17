import Link from "next/link";
import { Factory } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { saveAsset } from "./actions";
import { ASSET_TYPE_OPTIONS } from "./constants";
import { AssetsList, type AssetRow } from "./components/assets-list";
import { saveWorkOrder } from "../work-orders/actions";
import { savePreventiveMaintenancePlan } from "../preventive-maintenance/actions";
import { PageHeader } from "@/src/components/ui/page-header";

export const metadata = {
  title: "Assets | Cornerstone Tech",
  description: "Manage assets",
};

import { resolveSearchParams, getStringParam, type SearchParams } from "@/src/lib/page-utils";

type HealthStatusFilter = "excellent" | "good" | "warning" | "poor" | "critical";
type HierarchyFilter = "parents" | "sub_assets";
const VALID_HEALTH_FILTERS = new Set<HealthStatusFilter>([
  "excellent",
  "good",
  "warning",
  "poor",
  "critical",
]);
const VALID_HIERARCHY_FILTERS = new Set<HierarchyFilter>(["parents", "sub_assets"]);

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

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const params = await resolveSearchParams(searchParams);

  const q = getStringParam(params ?? {}, "q");
  const companyId = getStringParam(params ?? {}, "company_id");
  const propertyId = getStringParam(params ?? {}, "property_id");
  const typeFilter = getStringParam(params ?? {}, "type");
  const conditionFilter = getStringParam(params ?? {}, "condition");
  const statusFilter = getStringParam(params ?? {}, "status");
  const rawHealthStatus = getStringParam(params ?? {}, "health_status");
  const rawHierarchy = getStringParam(params ?? {}, "hierarchy");
  const pageParam = getStringParam(params ?? {}, "page");
  const pageSizeParam = getStringParam(params ?? {}, "page_size");
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeParam ?? "25", 10) || 25));
  const healthStatusFilter =
    rawHealthStatus && VALID_HEALTH_FILTERS.has(rawHealthStatus as HealthStatusFilter)
      ? (rawHealthStatus as HealthStatusFilter)
      : null;
  const hierarchyFilter =
    rawHierarchy && VALID_HIERARCHY_FILTERS.has(rawHierarchy as HierarchyFilter)
      ? (rawHierarchy as HierarchyFilter)
      : null;

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<Factory className="size-5" />}
          title="Assets"
          subtitle="Track equipment and assets by location."
        />
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
    .select("id, technician_name, name, company_id")
    .in("company_id", companyIds)
    .eq("status", "active")
    .order("technician_name")
    .order("name");

  const { data: crewsData } = await supabase
    .from("crews")
    .select("id, name, company_id")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");

  const { data: customersData } = await supabase
    .from("customers")
    .select("id, name, company_id")
    .in("company_id", companyIds)
    .order("name");
  const { data: vendorsData } = await supabase
    .from("vendors")
    .select("id, name, company_id, service_type")
    .in("company_id", companyIds)
    .order("name");
  const { data: hierarchyRowsRaw } = await supabase
    .from("assets")
    .select("id, company_id, parent_asset_id, asset_name, name, property_id, building_id, unit_id")
    .in("company_id", companyIds);

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
  const propertyNameById = new Map(propertyOptions.map((option) => [option.id, option.name]));
  const buildingNameById = new Map(buildingOptions.map((option) => [option.id, option.name]));
  const unitNameById = new Map(unitOptions.map((option) => [option.id, option.name]));
  const hierarchyRows = (hierarchyRowsRaw ?? []) as Array<{
    id: string;
    company_id: string;
    parent_asset_id: string | null;
    asset_name: string | null;
    name: string | null;
    property_id: string | null;
    building_id: string | null;
    unit_id: string | null;
  }>;
  const hierarchyById = new Map(hierarchyRows.map((row) => [row.id, row]));
  const assetNameById = new Map(
    hierarchyRows.map((row) => [row.id, row.asset_name ?? row.name ?? row.id])
  );
  const parentAssetIds = Array.from(
    new Set(
      hierarchyRows
        .map((row) => row.parent_asset_id)
        .filter((value): value is string => Boolean(value))
    )
  );
  const childCountByParent = new Map<string, number>();
  for (const row of hierarchyRows) {
    if (!row.parent_asset_id) continue;
    childCountByParent.set(
      row.parent_asset_id,
      (childCountByParent.get(row.parent_asset_id) ?? 0) + 1
    );
  }
  const effectiveLocationByAssetId = new Map<
    string,
    { property_id: string | null; building_id: string | null; unit_id: string | null }
  >();
  const resolveEffectiveLocation = (
    assetId: string,
    visited: Set<string> = new Set()
  ): { property_id: string | null; building_id: string | null; unit_id: string | null } => {
    const cached = effectiveLocationByAssetId.get(assetId);
    if (cached) return cached;
    const row = hierarchyById.get(assetId);
    if (!row) {
      return { property_id: null, building_id: null, unit_id: null };
    }
    if (visited.has(assetId)) {
      const fallback = {
        property_id: row.property_id,
        building_id: row.building_id,
        unit_id: row.unit_id,
      };
      effectiveLocationByAssetId.set(assetId, fallback);
      return fallback;
    }
    visited.add(assetId);
    const parentLocation = row.parent_asset_id
      ? resolveEffectiveLocation(row.parent_asset_id, visited)
      : { property_id: null, building_id: null, unit_id: null };
    const resolved = {
      property_id: row.property_id ?? parentLocation.property_id ?? null,
      building_id: row.building_id ?? parentLocation.building_id ?? null,
      unit_id: row.unit_id ?? parentLocation.unit_id ?? null,
    };
    effectiveLocationByAssetId.set(assetId, resolved);
    return resolved;
  };
  for (const row of hierarchyRows) {
    resolveEffectiveLocation(row.id);
  }
  const assetOptionsForWO = [...hierarchyRows]
    .sort((left, right) =>
      (left.asset_name ?? left.name ?? "").localeCompare(right.asset_name ?? right.name ?? "")
    )
    .map((row) => {
      const effectiveLocation = effectiveLocationByAssetId.get(row.id) ?? {
        property_id: null,
        building_id: null,
        unit_id: null,
      };
      return {
        id: row.id,
        name: row.asset_name ?? row.name ?? row.id,
        company_id: row.company_id,
        property_id: effectiveLocation.property_id,
        building_id: effectiveLocation.building_id,
        unit_id: effectiveLocation.unit_id,
      };
    });
  const parentCandidates = hierarchyRows.map((row) => {
    const effectiveLocation = effectiveLocationByAssetId.get(row.id) ?? {
      property_id: null,
      building_id: null,
      unit_id: null,
    };
    return {
      id: row.id,
      name: row.asset_name ?? row.name ?? row.id,
      company_id: row.company_id,
      parent_asset_id: row.parent_asset_id ?? null,
      property_id: effectiveLocation.property_id ?? row.property_id ?? null,
      building_id: effectiveLocation.building_id ?? row.building_id ?? null,
      unit_id: effectiveLocation.unit_id ?? row.unit_id ?? null,
    };
  });

  let assetsQuery = supabase
    .from("assets")
    .select(
      `
      id, asset_name, name, company_id, parent_asset_id, property_id, building_id, unit_id,
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
  if (hierarchyFilter === "sub_assets") {
    assetsQuery = assetsQuery.not("parent_asset_id", "is", null);
  } else if (hierarchyFilter === "parents" && parentAssetIds.length > 0) {
    assetsQuery = assetsQuery.in("id", parentAssetIds);
  }
  if (healthStatusFilter === "excellent") {
    assetsQuery = assetsQuery.gte("health_score", 90);
  } else if (healthStatusFilter === "good") {
    assetsQuery = assetsQuery.gte("health_score", 70).lt("health_score", 90);
  } else if (healthStatusFilter === "warning") {
    assetsQuery = assetsQuery.gte("health_score", 50).lt("health_score", 70);
  } else if (healthStatusFilter === "poor") {
    assetsQuery = assetsQuery.gte("health_score", 30).lt("health_score", 50);
  } else if (healthStatusFilter === "critical") {
    assetsQuery = assetsQuery.lt("health_score", 30);
  }

  if (q && q.trim()) {
    const term = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
    assetsQuery = assetsQuery.or(
      `asset_name.ilike.%${term}%,name.ilike.%${term}%,asset_tag.ilike.%${term}%,model.ilike.%${term}%,serial_number.ilike.%${term}%`
    );
  }

  // Separate count query so .select("id", { count: "exact", head: true }) is the first select (valid Supabase typing).
  let totalCount = 0;
  if (!(hierarchyFilter === "parents" && parentAssetIds.length === 0)) {
    let countQuery = supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds);
    if (companyId) countQuery = countQuery.eq("company_id", companyId);
    if (propertyId) countQuery = countQuery.eq("property_id", propertyId);
    if (typeFilter) countQuery = countQuery.eq("asset_type", typeFilter);
    if (conditionFilter) countQuery = countQuery.eq("condition", conditionFilter);
    if (statusFilter) countQuery = countQuery.eq("status", statusFilter);
    if (hierarchyFilter === "sub_assets") {
      countQuery = countQuery.not("parent_asset_id", "is", null);
    } else if (hierarchyFilter === "parents" && parentAssetIds.length > 0) {
      countQuery = countQuery.in("id", parentAssetIds);
    }
    if (healthStatusFilter === "excellent") countQuery = countQuery.gte("health_score", 90);
    else if (healthStatusFilter === "good") countQuery = countQuery.gte("health_score", 70).lt("health_score", 90);
    else if (healthStatusFilter === "warning") countQuery = countQuery.gte("health_score", 50).lt("health_score", 70);
    else if (healthStatusFilter === "poor") countQuery = countQuery.gte("health_score", 30).lt("health_score", 50);
    else if (healthStatusFilter === "critical") countQuery = countQuery.lt("health_score", 30);
    if (q && q.trim()) {
      const term = q.trim().replace(/%/g, "\\%").replace(/_/g, "\\_");
      countQuery = countQuery.or(
        `asset_name.ilike.%${term}%,name.ilike.%${term}%,asset_tag.ilike.%${term}%,model.ilike.%${term}%,serial_number.ilike.%${term}%`
      );
    }
    const { count } = await countQuery;
    totalCount = count ?? 0;
  }

  const assetsResponse =
    hierarchyFilter === "parents" && parentAssetIds.length === 0
      ? { data: [] as unknown[], error: null as { message?: string } | null }
      : await assetsQuery
          .order("asset_name", { ascending: true, nullsFirst: false })
          .order("name")
          .range((page - 1) * pageSize, page * pageSize - 1);
  const assetsRaw = assetsResponse.data;
  const error = assetsResponse.error;

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
    const assetId = row.id as string;
    const parentAssetId = (row.parent_asset_id as string | null) ?? null;
    const effectiveLocation = effectiveLocationByAssetId.get(assetId) ?? {
      property_id: null,
      building_id: null,
      unit_id: null,
    };
    const inheritedPropertyName =
      effectiveLocation.property_id ? propertyNameById.get(effectiveLocation.property_id) ?? null : null;
    const inheritedBuildingName =
      effectiveLocation.building_id ? buildingNameById.get(effectiveLocation.building_id) ?? null : null;
    const inheritedUnitName =
      effectiveLocation.unit_id ? unitNameById.get(effectiveLocation.unit_id) ?? null : null;
    return {
      ...row,
      property_name: property_name ?? inheritedPropertyName ?? undefined,
      building_name: building_name ?? inheritedBuildingName ?? undefined,
      unit_name: unit_name ?? inheritedUnitName ?? undefined,
      company_name: company_name ?? undefined,
      parent_asset_id: parentAssetId,
      parent_asset_name: parentAssetId ? assetNameById.get(parentAssetId) ?? null : null,
      is_parent_asset: childCountByParent.has(assetId),
      child_count: childCountByParent.get(assetId) ?? 0,
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
  const pmTechnicians = (techniciansData ?? []).map((t) => ({
    id: (t as { id: string }).id,
    name: (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? (t as { id: string }).id,
    company_id: (t as { company_id: string }).company_id,
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
  const vendorOptions = (vendorsData ?? []).map((vendor) => ({
    id: (vendor as { id: string }).id,
    name: (vendor as { name: string }).name,
    company_id: (vendor as { company_id: string }).company_id,
    service_type: (vendor as { service_type?: string | null }).service_type ?? null,
  }));
  const { count: pmPlanCount } = await supabase
    .from("preventive_maintenance_plans")
    .select("id", { count: "exact", head: true })
    .in("company_id", companyIds);

  return (
    <div className="space-y-8" data-tour="assets:asset-list">
      <div data-tour="demo-guided:asset-history" className="space-y-8">
      <PageHeader
        icon={<Factory className="size-5" />}
        title="Assets"
        subtitle="Track equipment and assets by location."
        actions={
          <Link
            href="/assets/intelligence"
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/80"
          >
            Open Asset Intelligence
          </Link>
        }
      />
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
          health_status: healthStatusFilter ?? "",
          hierarchy: hierarchyFilter ?? "",
        }}
        totalCount={totalCount ?? 0}
        page={page}
        pageSize={pageSize}
        error={error?.message ?? null}
        saveAction={saveAsset}
        pmPlanCount={pmPlanCount ?? 0}
        pmModalData={{
          companies: companyOptions,
          assets: assetOptionsForWO,
          technicians: pmTechnicians,
          saveAction: savePreventiveMaintenancePlan,
        }}
        workOrderFormData={{
          companies: companyOptions,
          customers: customerOptions,
          properties: propertyOptions,
          buildings: buildingOptions,
          units: unitOptions,
          assets: assetOptionsForWO,
          technicians: technicianOptions,
          crews: crewOptions,
          vendors: vendorOptions,
          saveWorkOrder,
        }}
        parentCandidates={parentCandidates}
      />
      </div>
    </div>
  );
}
