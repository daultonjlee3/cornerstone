import { Repeat } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { PreventiveMaintenancePlansList } from "./components/pm-plans-list";
import type { PreventiveMaintenanceTemplate } from "./components/pm-template-form-modal";
import type { PreventiveMaintenancePlan } from "./components/pm-plan-form-modal";
import { PageHeader } from "@/src/components/ui/page-header";

export const metadata = {
  title: "Preventive Maintenance | Cornerstone Tech",
  description: "Recurring service plans",
};

type SearchParams = { [key: string]: string | string[] | undefined };

function getStringParam(params: SearchParams | null, key: string): string | null {
  const value = params?.[key];
  if (value == null) return null;
  const output =
    typeof value === "string" ? value : Array.isArray(value) ? value[0] : null;
  return output?.trim() || null;
}

export default async function PreventiveMaintenancePage({
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

  const params =
    typeof (searchParams as Promise<SearchParams>)?.then === "function"
      ? await (searchParams as Promise<SearchParams>)
      : (searchParams as SearchParams);

  const q = getStringParam(params ?? {}, "q");
  const frequency = getStringParam(params ?? {}, "frequency");
  const status = getStringParam(params ?? {}, "status");
  const technicianId = getStringParam(params ?? {}, "technician_id");
  const shouldOpenNew = ["1", "true"].includes(
    (getStringParam(params ?? {}, "new") ?? "").toLowerCase()
  );
  const prefill = shouldOpenNew
    ? {
        company_id: getStringParam(params ?? {}, "company_id") ?? undefined,
        asset_id: getStringParam(params ?? {}, "asset_id") ?? undefined,
      }
    : null;

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const companyOptions = (companies ?? []).map((company) => ({
    id: (company as { id: string }).id,
    name: (company as { name: string }).name,
  }));
  const companyIds = companyOptions.map((company) => company.id);

  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<Repeat className="size-5" />}
          title="Preventive Maintenance"
          subtitle="Build recurring plans and auto-generate preventive work orders."
        />
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">
            Create a company first, then create preventive maintenance plans.
          </p>
        </div>
      </div>
    );
  }

  const { data: assetsData } = await supabase
    .from("assets")
    .select(
      "id, company_id, parent_asset_id, property_id, building_id, unit_id, asset_name, name, properties(property_name, name), buildings(building_name, name), units(unit_name, name_or_number)"
    )
    .in("company_id", companyIds)
    .order("asset_name")
    .order("name");
  const assetHierarchyRows = (assetsData ?? []).map((asset) => {
    const row = asset as Record<string, unknown>;
    const propertyData = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const buildingData = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
    const unitData = Array.isArray(row.units) ? row.units[0] : row.units;
    return {
      id: row.id as string,
      company_id: row.company_id as string,
      parent_asset_id: (row.parent_asset_id as string | null) ?? null,
      property_id: (row.property_id as string | null) ?? null,
      building_id: (row.building_id as string | null) ?? null,
      unit_id: (row.unit_id as string | null) ?? null,
      name:
        (row.asset_name as string | null) ??
        (row.name as string | null) ??
        (row.id as string),
      property_name:
        propertyData && typeof propertyData === "object"
          ? ((propertyData as { property_name?: string }).property_name ??
            (propertyData as { name?: string }).name ??
            null)
          : null,
      building_name:
        buildingData && typeof buildingData === "object"
          ? ((buildingData as { building_name?: string }).building_name ??
            (buildingData as { name?: string }).name ??
            null)
          : null,
      unit_name:
        unitData && typeof unitData === "object"
          ? ((unitData as { unit_name?: string }).unit_name ??
            (unitData as { name_or_number?: string }).name_or_number ??
            null)
          : null,
    };
  });
  const assetHierarchyById = new Map(assetHierarchyRows.map((row) => [row.id, row]));
  const propertyNameById = new Map(
    assetHierarchyRows
      .filter((row) => row.property_id && row.property_name)
      .map((row) => [row.property_id as string, row.property_name as string])
  );
  const buildingNameById = new Map(
    assetHierarchyRows
      .filter((row) => row.building_id && row.building_name)
      .map((row) => [row.building_id as string, row.building_name as string])
  );
  const unitNameById = new Map(
    assetHierarchyRows
      .filter((row) => row.unit_id && row.unit_name)
      .map((row) => [row.unit_id as string, row.unit_name as string])
  );
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
    const row = assetHierarchyById.get(assetId);
    if (!row) return { property_id: null, building_id: null, unit_id: null };
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
  for (const row of assetHierarchyRows) {
    resolveEffectiveLocation(row.id);
  }

  const assets = assetHierarchyRows.map((row) => {
    const effectiveLocation = effectiveLocationByAssetId.get(row.id) ?? {
      property_id: null,
      building_id: null,
      unit_id: null,
    };
    return {
      id: row.id,
      company_id: row.company_id,
      property_id: effectiveLocation.property_id,
      building_id: effectiveLocation.building_id,
      unit_id: effectiveLocation.unit_id,
      name: row.name,
      property_name:
        row.property_name ??
        (effectiveLocation.property_id
          ? propertyNameById.get(effectiveLocation.property_id) ?? null
          : null),
      building_name:
        row.building_name ??
        (effectiveLocation.building_id
          ? buildingNameById.get(effectiveLocation.building_id) ?? null
          : null),
      unit_name:
        row.unit_name ??
        (effectiveLocation.unit_id
          ? unitNameById.get(effectiveLocation.unit_id) ?? null
          : null),
    };
  });

  const { data: techniciansData } = await supabase
    .from("technicians")
    .select("id, company_id, technician_name, name")
    .in("company_id", companyIds)
    .eq("status", "active")
    .order("technician_name")
    .order("name");
  const technicians = (techniciansData ?? []).map((technician) => ({
    id: (technician as { id: string }).id,
    company_id: (technician as { company_id: string }).company_id,
    name:
      (technician as { technician_name?: string }).technician_name ??
      (technician as { name?: string }).name ??
      (technician as { id: string }).id,
  }));

  let plansQuery = supabase
    .from("preventive_maintenance_plans")
    .select(
      "id, company_id, asset_id, property_id, building_id, unit_id, name, description, frequency_type, frequency_interval, start_date, next_run_date, last_run_date, auto_create_work_order, priority, estimated_duration_minutes, assigned_technician_id, instructions, status, assets(asset_name, name), technicians!assigned_technician_id(technician_name, name)"
    )
    .in("company_id", companyIds);

  if (frequency) plansQuery = plansQuery.eq("frequency_type", frequency);
  if (status) plansQuery = plansQuery.eq("status", status);
  if (technicianId) plansQuery = plansQuery.eq("assigned_technician_id", technicianId);
  if (q) {
    const term = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    plansQuery = plansQuery.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data: plansRaw, error } = await plansQuery.order("next_run_date", {
    ascending: true,
  });
  const plans = (plansRaw ?? []).map((plan) => {
    const row = plan as Record<string, unknown>;
    const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
    const technician = Array.isArray(row.technicians)
      ? row.technicians[0]
      : row.technicians;
    return {
      id: row.id as string,
      company_id: row.company_id as string,
      asset_id: (row.asset_id as string | null) ?? null,
      property_id: (row.property_id as string | null) ?? null,
      building_id: (row.building_id as string | null) ?? null,
      unit_id: (row.unit_id as string | null) ?? null,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      frequency_type: row.frequency_type as PreventiveMaintenancePlan["frequency_type"],
      frequency_interval: Number(row.frequency_interval ?? 1),
      start_date: row.start_date as string,
      next_run_date: row.next_run_date as string,
      last_run_date: (row.last_run_date as string | null) ?? null,
      auto_create_work_order: Boolean(row.auto_create_work_order),
      priority: (row.priority as string | null) ?? "medium",
      estimated_duration_minutes:
        (row.estimated_duration_minutes as number | null) ?? null,
      assigned_technician_id:
        (row.assigned_technician_id as string | null) ?? null,
      instructions: (row.instructions as string | null) ?? null,
      status: row.status as PreventiveMaintenancePlan["status"],
      asset_name:
        asset && typeof asset === "object"
          ? ((asset as { asset_name?: string }).asset_name ??
            (asset as { name?: string }).name ??
            null)
          : null,
      technician_name:
        technician && typeof technician === "object"
          ? ((technician as { technician_name?: string }).technician_name ??
            (technician as { name?: string }).name ??
            null)
          : null,
    };
  });

  const { data: templatesRaw } = await supabase
    .from("preventive_maintenance_templates")
    .select(
      "id, company_id, name, description, frequency_type, frequency_interval, priority, estimated_duration_minutes, instructions"
    )
    .in("company_id", companyIds)
    .order("name");
  const templates = (templatesRaw ?? []).map((template) => ({
    id: (template as { id: string }).id,
    company_id: (template as { company_id: string }).company_id,
    name: (template as { name: string }).name,
    description: (template as { description?: string | null }).description ?? null,
    frequency_type: (template as { frequency_type: PreventiveMaintenanceTemplate["frequency_type"] })
      .frequency_type,
    frequency_interval: Number((template as { frequency_interval?: number }).frequency_interval ?? 1),
    priority: (template as { priority?: string }).priority ?? "medium",
    estimated_duration_minutes:
      (template as { estimated_duration_minutes?: number | null })
        .estimated_duration_minutes ?? null,
    instructions: (template as { instructions?: string | null }).instructions ?? null,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Repeat className="size-5" />}
        title="Preventive Maintenance"
        subtitle="Build recurring plans and auto-generate preventive work orders."
      />
      <PreventiveMaintenancePlansList
        plans={plans}
        templates={templates}
        companies={companyOptions}
        assets={assets}
        technicians={technicians}
        filterParams={{
          q: q ?? "",
          frequency: frequency ?? "",
          status: status ?? "",
          technician_id: technicianId ?? "",
        }}
        initialPrefill={prefill}
        autoOpenNew={shouldOpenNew}
        error={error?.message ?? null}
      />
    </div>
  );
}
