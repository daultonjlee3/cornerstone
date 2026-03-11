import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WorkOrder } from "./components/work-order-form-modal";
import { WorkOrdersList } from "./components/work-orders-list";

export const metadata = {
  title: "Work Order Command Center | Cornerstone OS",
  description: "Operational hub for triage, dispatch, and work order management",
};

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
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
            Work Orders
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Create and track maintenance and repair work.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add work orders.</p>
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

  const propertyIds = (properties ?? []).map((p) => p.id);
  const { data: buildingsData } = await supabase
    .from("buildings")
    .select("id, building_name, name, property_id")
    .in("property_id", propertyIds)
    .order("building_name")
    .order("name");

  const buildingIds = (buildingsData ?? []).map((b) => b.id);
  const { data: unitsData } = await supabase
    .from("units")
    .select("id, unit_name, name_or_number, building_id")
    .in("building_id", buildingIds)
    .order("unit_name")
    .order("name_or_number");

  const { data: assetsData } = await supabase
    .from("assets")
    .select("id, asset_name, name, company_id, property_id, building_id, unit_id")
    .in("company_id", companyIds)
    .order("asset_name")
    .order("name");

  const { data: techniciansData } = await supabase
    .from("technicians")
    .select("id, technician_name, name")
    .in("company_id", companyIds)
    .eq("status", "active")
    .order("technician_name")
    .order("name");

  const { data: customersData } = await supabase
    .from("customers")
    .select("id, name, company_id")
    .in("company_id", companyIds)
    .order("name");

  const { data: crewsData } = await supabase
    .from("crews")
    .select("id, name, company_id")
    .eq("tenant_id", membership.tenant_id)
    .eq("is_active", true)
    .order("name");

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));
  const customerOptions = (customersData ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string }).name,
    company_id: (c as { company_id: string }).company_id,
  }));
  const crewOptions = (crewsData ?? []).map((c) => ({
    id: (c as { id: string }).id,
    name: (c as { name: string }).name,
    company_id: (c as { company_id?: string }).company_id ?? null,
  }));
  const propertyOptions = (properties ?? []).map((p) => ({
    id: p.id,
    name: (p as { property_name?: string }).property_name ?? (p as { name?: string }).name ?? p.id,
    company_id: (p as { company_id: string }).company_id,
  }));
  const buildingOptions = (buildingsData ?? []).map((b) => ({
    id: b.id,
    name: (b as { building_name?: string }).building_name ?? (b as { name?: string }).name ?? b.id,
    property_id: (b as { property_id: string }).property_id,
  }));
  const unitOptions = (unitsData ?? []).map((u) => ({
    id: u.id,
    name: (u as { unit_name?: string }).unit_name ?? (u as { name_or_number?: string }).name_or_number ?? u.id,
    building_id: (u as { building_id: string }).building_id,
  }));
  const assetOptions = (assetsData ?? []).map((a) => ({
    id: a.id,
    name: (a as { asset_name?: string }).asset_name ?? (a as { name?: string }).name ?? a.id,
    company_id: (a as { company_id: string }).company_id,
    property_id: (a as { property_id?: string }).property_id ?? null,
    building_id: (a as { building_id?: string }).building_id ?? null,
    unit_id: (a as { unit_id?: string }).unit_id ?? null,
  }));

  const newParam = searchParams?.new;
  const wantNew = newParam === "1" || newParam === "true";
  const prefill = wantNew
    ? {
        company_id: typeof searchParams?.company_id === "string" ? searchParams.company_id : undefined,
        property_id: typeof searchParams?.property_id === "string" ? searchParams.property_id : undefined,
        building_id: typeof searchParams?.building_id === "string" ? searchParams.building_id : undefined,
        unit_id: typeof searchParams?.unit_id === "string" ? searchParams.unit_id : undefined,
        asset_id: typeof searchParams?.asset_id === "string" ? searchParams.asset_id : undefined,
        title: typeof searchParams?.title === "string" ? decodeURIComponent(searchParams.title) : undefined,
        description: typeof searchParams?.description === "string" ? decodeURIComponent(searchParams.description) : undefined,
      }
    : null;
  const autoOpenNew = wantNew && (prefill?.company_id ?? prefill?.property_id ?? prefill?.building_id ?? prefill?.unit_id ?? prefill?.asset_id ?? prefill?.title ?? prefill?.description);
  const editId = typeof searchParams?.edit === "string" ? searchParams.edit : null;
  const technicianOptions = (techniciansData ?? []).map((t) => ({
    id: t.id,
    name: (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? t.id,
  }));

  const q = typeof searchParams?.q === "string" ? searchParams.q.trim() : "";
  const filterStatus = typeof searchParams?.status === "string" ? searchParams.status : null;
  const filterPriority = typeof searchParams?.priority === "string" ? searchParams.priority : null;
  const filterCategory = typeof searchParams?.category === "string" ? searchParams.category : null;
  const filterCompany = typeof searchParams?.company_id === "string" ? searchParams.company_id : null;
  const filterProperty = typeof searchParams?.property_id === "string" ? searchParams.property_id : null;
  const filterBuilding = typeof searchParams?.building_id === "string" ? searchParams.building_id : null;
  const filterUnit = typeof searchParams?.unit_id === "string" ? searchParams.unit_id : null;
  const filterAsset = typeof searchParams?.asset_id === "string" ? searchParams.asset_id : null;
  const filterTechnician = typeof searchParams?.technician_id === "string" ? searchParams.technician_id : null;
  const filterCrew = typeof searchParams?.crew_id === "string" ? searchParams.crew_id : null;
  const filterSourceType = typeof searchParams?.source_type === "string" ? searchParams.source_type : null;
  const filterOverdue = searchParams?.overdue === "1" || searchParams?.overdue === "true";
  const filterUnassigned = searchParams?.unassigned === "1" || searchParams?.unassigned === "true";
  const filterDueToday = searchParams?.due_today === "1" || searchParams?.due_today === "true";
  const filterCompletedToday = searchParams?.completed_today === "1" || searchParams?.completed_today === "true";
  const viewPreset = typeof searchParams?.view === "string" ? searchParams.view : null;
  const dateFrom = typeof searchParams?.date_from === "string" ? searchParams.date_from : null;
  const dateTo = typeof searchParams?.date_to === "string" ? searchParams.date_to : null;
  const filterCompletionStatus = typeof searchParams?.completion_status === "string" ? searchParams.completion_status : null;
  const completedFrom = typeof searchParams?.completed_from === "string" ? searchParams.completed_from : null;
  const completedTo = typeof searchParams?.completed_to === "string" ? searchParams.completed_to : null;
  const sortBy = typeof searchParams?.sort === "string" && ["updated_at", "scheduled_date", "due_date", "completed_at", "priority", "status"].includes(searchParams.sort)
    ? searchParams.sort
    : "updated_at";
  const sortOrder = searchParams?.order === "asc" ? "asc" : "desc";
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("work_orders")
    .select(`
      id, work_order_number, title, company_id, customer_id, property_id, building_id, unit_id, asset_id,
      description, category, priority, status,
      requested_at, scheduled_date, scheduled_start, scheduled_end, due_date,
      requested_by_name, requested_by_email, requested_by_phone,
      assigned_technician_id, assigned_crew_id,
      estimated_hours, estimated_technicians, actual_hours,
      billable, nte_amount, updated_at,
      source_type, preventive_maintenance_plan_id, preventive_maintenance_run_id,
      completed_at, completion_status,
      companies(name),
      customers(name),
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      assets!work_orders_asset_id_fkey(asset_name, name),
      technicians!assigned_technician_id(technician_name, name),
      crews!assigned_crew_id(name)
    `)
    .in("company_id", companyIds);

  if (q) {
    const term = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `title.ilike.%${term}%,work_order_number.ilike.%${term}%,description.ilike.%${term}%,requested_by_name.ilike.%${term}%,requested_by_email.ilike.%${term}%`
    );
  }
  if (viewPreset === "open") {
    query = query.in("status", ["new", "open", "ready_to_schedule", "assigned", "scheduled"]);
  } else if (viewPreset === "in_progress") {
    query = query.eq("status", "in_progress");
  } else if (viewPreset === "on_hold") {
    query = query.eq("status", "on_hold");
  } else if (viewPreset === "overdue") {
    query = query.lt("due_date", today).not("status", "in", "(completed,cancelled)");
  } else if (viewPreset === "due_today") {
    query = query.eq("due_date", today);
  } else if (viewPreset === "completed_today") {
    query = query.eq("status", "completed").gte("completed_at", `${today}T00:00:00`).lte("completed_at", `${today}T23:59:59.999`);
  } else if (viewPreset === "unassigned") {
    query = query.is("assigned_technician_id", null).is("assigned_crew_id", null);
  } else if (viewPreset === "pm") {
    query = query.eq("source_type", "preventive_maintenance");
  } else if (viewPreset === "high_priority") {
    query = query.in("priority", ["high", "urgent", "emergency"]);
  }
  if (!viewPreset && filterStatus) query = query.eq("status", filterStatus);
  if (filterPriority) query = query.eq("priority", filterPriority);
  if (filterCategory) query = query.eq("category", filterCategory);
  if (filterCompany) query = query.eq("company_id", filterCompany);
  if (filterProperty) query = query.eq("property_id", filterProperty);
  if (filterBuilding) query = query.eq("building_id", filterBuilding);
  if (filterUnit) query = query.eq("unit_id", filterUnit);
  if (filterAsset) query = query.eq("asset_id", filterAsset);
  if (filterTechnician) query = query.eq("assigned_technician_id", filterTechnician);
  if (filterCrew) query = query.eq("assigned_crew_id", filterCrew);
  if (!viewPreset && filterSourceType) query = query.eq("source_type", filterSourceType);
  if (!viewPreset && filterOverdue) {
    query = query.lt("due_date", today);
    query = query.not("status", "in", "(completed,cancelled)");
  }
  if (!viewPreset && filterUnassigned) {
    query = query.is("assigned_technician_id", null).is("assigned_crew_id", null);
  }
  if (!viewPreset && filterDueToday) query = query.eq("due_date", today);
  if (!viewPreset && filterCompletedToday) {
    query = query.eq("status", "completed");
    query = query.gte("completed_at", `${today}T00:00:00`).lte("completed_at", `${today}T23:59:59.999`);
  }
  if (dateFrom) query = query.gte("scheduled_date", dateFrom);
  if (dateTo) query = query.lte("scheduled_date", dateTo);
  if (filterCompletionStatus) query = query.eq("completion_status", filterCompletionStatus);
  if (completedFrom) query = query.gte("completed_at", completedFrom);
  if (completedTo) query = query.lte("completed_at", completedTo);

  const sortColumn = sortBy === "scheduled_date" ? "scheduled_date" : sortBy === "due_date" ? "due_date" : sortBy === "completed_at" ? "completed_at" : sortBy === "priority" ? "priority" : sortBy === "status" ? "status" : "updated_at";
  const { data: workOrdersRaw, error } = await query.order(sortColumn, { ascending: sortOrder === "asc" });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStr = oneWeekAgo.toISOString();

  const workOrders = (workOrdersRaw ?? []).map((wo) => {
    const row = wo as Record<string, unknown>;
    const tech = Array.isArray(row.technicians) ? row.technicians[0] : row.technicians;
    const crewRow = Array.isArray(row.crews) ? row.crews[0] : row.crews;
    const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    const cust = Array.isArray(row.customers) ? row.customers[0] : row.customers;
    const prop = Array.isArray(row.properties) ? row.properties[0] : row.properties;
    const bld = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
    const un = Array.isArray(row.units) ? row.units[0] : row.units;
    const ast = Array.isArray(row.assets) ? row.assets[0] : row.assets;
    const technician_name = tech && typeof tech === "object" && "technician_name" in tech ? (tech as { technician_name?: string }).technician_name ?? (tech as { name?: string }).name : null;
    const crew_name = crewRow && typeof crewRow === "object" && "name" in crewRow ? (crewRow as { name?: string }).name : null;
    const company_name = comp && typeof comp === "object" && "name" in comp ? (comp as { name?: string }).name : null;
    const customer_name = cust && typeof cust === "object" && "name" in cust ? (cust as { name?: string }).name : null;
    const property_name = prop && typeof prop === "object" ? (prop as { property_name?: string }).property_name ?? (prop as { name?: string }).name : null;
    const building_name = bld && typeof bld === "object" ? (bld as { building_name?: string }).building_name ?? (bld as { name?: string }).name : null;
    const unit_name = un && typeof un === "object" ? (un as { unit_name?: string }).unit_name ?? (un as { name_or_number?: string }).name_or_number : null;
    const asset_name = ast && typeof ast === "object" ? (ast as { asset_name?: string }).asset_name ?? (ast as { name?: string }).name : null;
    const locationParts = [property_name, building_name, unit_name].filter(Boolean);
    const location = locationParts.length ? locationParts.join(" / ") : null;
    const { technicians: _, crews: __, companies: ___, customers: ____, properties: _____, buildings: ______, units: _______, assets: ________, ...rest } = row;
    return {
      ...rest,
      technician_name: technician_name ?? undefined,
      crew_name: crew_name ?? undefined,
      company_name: company_name ?? undefined,
      customer_name: customer_name ?? undefined,
      location: location ?? undefined,
      asset_name: asset_name ?? undefined,
    };
  }) as (WorkOrder & { technician_name?: string; crew_name?: string; company_name?: string; customer_name?: string; location?: string; asset_name?: string })[];

  const stats = {
    open: workOrders.filter(
      (wo) =>
        ["new", "open", "ready_to_schedule", "assigned", "scheduled"].includes(wo.status ?? "") &&
        wo.status !== "completed" &&
        wo.status !== "cancelled"
    ).length,
    inProgress: workOrders.filter((wo) => wo.status === "in_progress").length,
    onHold: workOrders.filter((wo) => wo.status === "on_hold").length,
    overdue: workOrders.filter(
      (wo) =>
        wo.due_date != null &&
        wo.due_date < today &&
        wo.status !== "completed" &&
        wo.status !== "cancelled"
    ).length,
    dueToday: workOrders.filter(
      (wo) => wo.due_date === today && wo.status !== "completed" && wo.status !== "cancelled"
    ).length,
    completedToday: workOrders.filter((wo) => {
      if (wo.status !== "completed" || !wo.completed_at) return false;
      const completedAt = String(wo.completed_at).slice(0, 10);
      return completedAt === today;
    }).length,
    new: workOrders.filter((wo) => wo.status === "new" || wo.status === "open").length,
    readyToSchedule: workOrders.filter((wo) => wo.status === "ready_to_schedule" || wo.status === "assigned").length,
    scheduled: workOrders.filter((wo) => wo.status === "scheduled").length,
    completedThisWeek: workOrders.filter((wo) => wo.status === "completed" && wo.updated_at && String(wo.updated_at) >= weekAgoStr).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Work Order Command Center
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Triage, dispatch, and manage work orders. Use filters and bulk actions for fast operations.
        </p>
      </div>
      <WorkOrdersList
        workOrders={workOrders}
        stats={stats}
        companies={companyOptions}
        customers={customerOptions}
        properties={propertyOptions}
        buildings={buildingOptions}
        units={unitOptions}
        assets={assetOptions}
        technicians={technicianOptions}
        crews={crewOptions}
        initialPrefill={prefill}
        autoOpenNew={!!autoOpenNew}
        initialEditId={editId}
        error={error?.message ?? null}
      />
    </div>
  );
}
