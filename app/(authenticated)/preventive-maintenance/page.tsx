import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { PreventiveMaintenancePlansList } from "./components/pm-plans-list";
import type { PreventiveMaintenanceTemplate } from "./components/pm-template-form-modal";
import type { PreventiveMaintenancePlan } from "./components/pm-plan-form-modal";

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
    .eq("tenant_id", membership.tenant_id)
    .order("name");

  const companyOptions = (companies ?? []).map((company) => ({
    id: (company as { id: string }).id,
    name: (company as { name: string }).name,
  }));
  const companyIds = companyOptions.map((company) => company.id);

  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Preventive Maintenance
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Build recurring plans and auto-generate preventive work orders.
          </p>
        </div>
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
      "id, company_id, property_id, building_id, unit_id, asset_name, name, properties(property_name, name), buildings(building_name, name), units(unit_name, name_or_number)"
    )
    .in("company_id", companyIds)
    .order("asset_name")
    .order("name");

  const assets = (assetsData ?? []).map((asset) => {
    const row = asset as Record<string, unknown>;
    const propertyData = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const buildingData = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
    const unitData = Array.isArray(row.units) ? row.units[0] : row.units;
    return {
      id: row.id as string,
      company_id: row.company_id as string,
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Preventive Maintenance
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Build recurring plans and auto-generate preventive work orders.
        </p>
      </div>
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
