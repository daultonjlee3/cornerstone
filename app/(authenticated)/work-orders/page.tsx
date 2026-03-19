import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import type { WorkOrder } from "./components/work-order-form-modal";
import { WorkOrdersList } from "./components/work-orders-list";
import { PageHeader } from "@/src/components/ui/page-header";
import { TakeTourButton } from "@/src/components/guidance/TakeTourButton";

export const metadata = {
  title: "Work Order Command Center | Cornerstone OS",
  description: "Operational hub for triage, dispatch, and work order management",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type WorkOrderFilters = {
  q: string;
  viewPreset: string | null;
  filterStatus: string | null;
  filterPriority: string | null;
  filterCategory: string | null;
  filterCompany: string | null;
  filterProperty: string | null;
  filterBuilding: string | null;
  filterUnit: string | null;
  filterAsset: string | null;
  filterTechnician: string | null;
  filterCrew: string | null;
  filterSourceType: string | null;
  filterOverdue: boolean;
  filterUnassigned: boolean;
  filterDueToday: boolean;
  filterCompletedToday: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  filterCompletionStatus: string | null;
  completedFrom: string | null;
  completedTo: string | null;
  today: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyWorkOrderFilters(query: any, filters: WorkOrderFilters) {
  const {
    q,
    viewPreset,
    filterStatus,
    filterPriority,
    filterCategory,
    filterCompany,
    filterProperty,
    filterBuilding,
    filterUnit,
    filterAsset,
    filterTechnician,
    filterCrew,
    filterSourceType,
    filterOverdue,
    filterUnassigned,
    filterDueToday,
    filterCompletedToday,
    dateFrom,
    dateTo,
    filterCompletionStatus,
    completedFrom,
    completedTo,
    today,
  } = filters;

  let scoped = query;
  if (q) {
    const term = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    scoped = scoped.or(
      `title.ilike.%${term}%,work_order_number.ilike.%${term}%,description.ilike.%${term}%,requested_by_name.ilike.%${term}%,requested_by_email.ilike.%${term}%`
    );
  }
  if (viewPreset === "open") {
    scoped = scoped.in("status", ["new", "open", "ready_to_schedule", "assigned", "scheduled"]);
  } else if (viewPreset === "in_progress") {
    scoped = scoped.eq("status", "in_progress");
  } else if (viewPreset === "on_hold") {
    scoped = scoped.eq("status", "on_hold");
  } else if (viewPreset === "overdue") {
    scoped = scoped.lt("due_date", today).not("status", "in", "(completed,cancelled)");
  } else if (viewPreset === "due_today") {
    scoped = scoped.eq("due_date", today);
  } else if (viewPreset === "completed_today") {
    scoped = scoped
      .eq("status", "completed")
      .gte("completed_at", `${today}T00:00:00`)
      .lte("completed_at", `${today}T23:59:59.999`);
  } else if (viewPreset === "unassigned") {
    scoped = scoped
      .is("assigned_technician_id", null)
      .is("assigned_crew_id", null)
      .is("vendor_id", null);
  } else if (viewPreset === "pm") {
    scoped = scoped.eq("source_type", "preventive_maintenance");
  } else if (viewPreset === "high_priority") {
    scoped = scoped.in("priority", ["high", "urgent", "emergency"]);
  }
  if (!viewPreset && filterStatus) scoped = scoped.eq("status", filterStatus);
  if (filterPriority) scoped = scoped.eq("priority", filterPriority);
  if (filterCategory) scoped = scoped.eq("category", filterCategory);
  if (filterCompany) scoped = scoped.eq("company_id", filterCompany);
  if (filterProperty) scoped = scoped.eq("property_id", filterProperty);
  if (filterBuilding) scoped = scoped.eq("building_id", filterBuilding);
  if (filterUnit) scoped = scoped.eq("unit_id", filterUnit);
  if (filterAsset) scoped = scoped.eq("asset_id", filterAsset);
  if (filterTechnician) scoped = scoped.eq("assigned_technician_id", filterTechnician);
  if (filterCrew) scoped = scoped.eq("assigned_crew_id", filterCrew);
  if (!viewPreset && filterSourceType) scoped = scoped.eq("source_type", filterSourceType);
  if (!viewPreset && filterOverdue) {
    scoped = scoped.lt("due_date", today);
    scoped = scoped.not("status", "in", "(completed,cancelled)");
  }
  if (!viewPreset && filterUnassigned) {
    scoped = scoped
      .is("assigned_technician_id", null)
      .is("assigned_crew_id", null)
      .is("vendor_id", null);
  }
  if (!viewPreset && filterDueToday) scoped = scoped.eq("due_date", today);
  if (!viewPreset && filterCompletedToday) {
    scoped = scoped.eq("status", "completed");
    scoped = scoped.gte("completed_at", `${today}T00:00:00`).lte("completed_at", `${today}T23:59:59.999`);
  }
  if (dateFrom) scoped = scoped.gte("scheduled_date", dateFrom);
  if (dateTo) scoped = scoped.lte("scheduled_date", dateTo);
  if (filterCompletionStatus) scoped = scoped.eq("completion_status", filterCompletionStatus);
  if (completedFrom) scoped = scoped.gte("completed_at", completedFrom);
  if (completedTo) scoped = scoped.lte("completed_at", completedTo);
  return scoped;
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Work Orders"
          subtitle="Create and track maintenance and repair work."
          actions={<TakeTourButton />}
        />
        <div className="ui-card py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add work orders.</p>
        </div>
      </div>
    );
  }

  const [
    { data: slaPoliciesData },
    { data: properties },
    { data: assetsData },
    { data: techniciansData },
    { data: customersData },
    { data: vendorsData },
    { data: crewsData },
  ] = await Promise.all([
    supabase
      .from("work_order_sla_policies")
      .select("company_id, priority, response_target_minutes")
      .in("company_id", companyIds),
    supabase
      .from("properties")
      .select("id, property_name, name, company_id")
      .in("company_id", companyIds)
      .order("property_name")
      .order("name")
      .limit(200),
    supabase
      .from("assets")
      .select("id, asset_name, name, company_id, parent_asset_id, property_id, building_id, unit_id")
      .in("company_id", companyIds)
      .order("asset_name")
      .order("name")
      .limit(500),
    supabase
      .from("technicians")
      .select("id, technician_name, name")
      .in("company_id", companyIds)
      .eq("status", "active")
      .order("technician_name")
      .order("name")
      .limit(200),
    supabase
      .from("customers")
      .select("id, name, company_id")
      .in("company_id", companyIds)
      .order("name")
      .limit(200),
    supabase
      .from("vendors")
      .select("id, name, company_id, service_type")
      .in("company_id", companyIds)
      .order("name")
      .limit(200),
    supabase
      .from("crews")
      .select("id, name, company_id")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name")
      .limit(100),
  ]);

  type BuildingRow = {
    id: string;
    building_name: string | null;
    name: string | null;
    property_id: string;
  };
  type UnitRow = {
    id: string;
    unit_name: string | null;
    name_or_number: string | null;
    building_id: string;
  };

  const propertyIds = (properties ?? []).map((p) => p.id);
  const { data: buildingsData } = propertyIds.length
    ? await supabase
        .from("buildings")
        .select("id, building_name, name, property_id")
        .in("property_id", propertyIds)
        .order("building_name")
        .order("name")
        .limit(300)
    : { data: [] as BuildingRow[] };

  const buildingIds = ((buildingsData ?? []) as BuildingRow[]).map((b) => b.id);
  const { data: unitsData } = buildingIds.length
    ? await supabase
        .from("units")
        .select("id, unit_name, name_or_number, building_id")
        .in("building_id", buildingIds)
        .order("unit_name")
        .order("name_or_number")
        .limit(500)
    : { data: [] as UnitRow[] };
  const assetHierarchyRows = (assetsData ?? []) as Array<{
    id: string;
    asset_name: string | null;
    name: string | null;
    company_id: string;
    parent_asset_id: string | null;
    property_id: string | null;
    building_id: string | null;
    unit_id: string | null;
  }>;
  const assetHierarchyById = new Map(assetHierarchyRows.map((row) => [row.id, row]));
  const effectiveAssetLocationById = new Map<
    string,
    { property_id: string | null; building_id: string | null; unit_id: string | null }
  >();
  const resolveEffectiveAssetLocation = (
    assetId: string,
    visited: Set<string> = new Set()
  ): { property_id: string | null; building_id: string | null; unit_id: string | null } => {
    const cached = effectiveAssetLocationById.get(assetId);
    if (cached) return cached;
    const row = assetHierarchyById.get(assetId);
    if (!row) {
      return { property_id: null, building_id: null, unit_id: null };
    }
    if (visited.has(assetId)) {
      const fallback = {
        property_id: row.property_id,
        building_id: row.building_id,
        unit_id: row.unit_id,
      };
      effectiveAssetLocationById.set(assetId, fallback);
      return fallback;
    }
    visited.add(assetId);
    const parentLocation = row.parent_asset_id
      ? resolveEffectiveAssetLocation(row.parent_asset_id, visited)
      : { property_id: null, building_id: null, unit_id: null };
    const resolved = {
      property_id: row.property_id ?? parentLocation.property_id ?? null,
      building_id: row.building_id ?? parentLocation.building_id ?? null,
      unit_id: row.unit_id ?? parentLocation.unit_id ?? null,
    };
    effectiveAssetLocationById.set(assetId, resolved);
    return resolved;
  };
  for (const row of assetHierarchyRows) {
    resolveEffectiveAssetLocation(row.id);
  }

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
  const vendorOptions = (vendorsData ?? []).map((v) => ({
    id: (v as { id: string }).id,
    name: (v as { name: string }).name,
    company_id: (v as { company_id: string }).company_id,
    service_type: (v as { service_type?: string | null }).service_type ?? null,
  }));
  const propertyOptions = (properties ?? []).map((p) => ({
    id: p.id,
    name: (p as { property_name?: string }).property_name ?? (p as { name?: string }).name ?? p.id,
    company_id: (p as { company_id: string }).company_id,
  }));
  const buildingOptions = ((buildingsData ?? []) as BuildingRow[]).map((b) => ({
    id: b.id,
    name: (b as { building_name?: string }).building_name ?? (b as { name?: string }).name ?? b.id,
    property_id: (b as { property_id: string }).property_id,
  }));
  const unitOptions = ((unitsData ?? []) as UnitRow[]).map((u) => ({
    id: u.id,
    name: (u as { unit_name?: string }).unit_name ?? (u as { name_or_number?: string }).name_or_number ?? u.id,
    building_id: (u as { building_id: string }).building_id,
  }));
  const assetOptions = assetHierarchyRows.map((asset) => {
    const effectiveLocation = effectiveAssetLocationById.get(asset.id) ?? {
      property_id: null,
      building_id: null,
      unit_id: null,
    };
    return {
      id: asset.id,
      name: asset.asset_name ?? asset.name ?? asset.id,
      company_id: asset.company_id,
      property_id: effectiveLocation.property_id,
      building_id: effectiveLocation.building_id,
      unit_id: effectiveLocation.unit_id,
    };
  });

  const newParam = resolvedSearchParams?.new;
  const wantNew = newParam === "1" || newParam === "true";
  const prefill = wantNew
    ? {
        company_id: typeof resolvedSearchParams?.company_id === "string" ? resolvedSearchParams.company_id : undefined,
        property_id: typeof resolvedSearchParams?.property_id === "string" ? resolvedSearchParams.property_id : undefined,
        building_id: typeof resolvedSearchParams?.building_id === "string" ? resolvedSearchParams.building_id : undefined,
        unit_id: typeof resolvedSearchParams?.unit_id === "string" ? resolvedSearchParams.unit_id : undefined,
        asset_id: typeof resolvedSearchParams?.asset_id === "string" ? resolvedSearchParams.asset_id : undefined,
        title: typeof resolvedSearchParams?.title === "string" ? decodeURIComponent(resolvedSearchParams.title) : undefined,
        description:
          typeof resolvedSearchParams?.description === "string"
            ? decodeURIComponent(resolvedSearchParams.description)
            : undefined,
      }
    : null;
  const autoOpenNew = wantNew && (prefill?.company_id ?? prefill?.property_id ?? prefill?.building_id ?? prefill?.unit_id ?? prefill?.asset_id ?? prefill?.title ?? prefill?.description);
  const editId = typeof resolvedSearchParams?.edit === "string" ? resolvedSearchParams.edit : null;
  const technicianOptions = (techniciansData ?? []).map((t) => ({
    id: t.id,
    name: (t as { technician_name?: string }).technician_name ?? (t as { name?: string }).name ?? t.id,
  }));

  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";
  const filterStatus = typeof resolvedSearchParams?.status === "string" ? resolvedSearchParams.status : null;
  const filterPriority = typeof resolvedSearchParams?.priority === "string" ? resolvedSearchParams.priority : null;
  const filterCategory = typeof resolvedSearchParams?.category === "string" ? resolvedSearchParams.category : null;
  const filterCompany = typeof resolvedSearchParams?.company_id === "string" ? resolvedSearchParams.company_id : null;
  const filterProperty = typeof resolvedSearchParams?.property_id === "string" ? resolvedSearchParams.property_id : null;
  const filterBuilding = typeof resolvedSearchParams?.building_id === "string" ? resolvedSearchParams.building_id : null;
  const filterUnit = typeof resolvedSearchParams?.unit_id === "string" ? resolvedSearchParams.unit_id : null;
  const filterAsset = typeof resolvedSearchParams?.asset_id === "string" ? resolvedSearchParams.asset_id : null;
  const filterTechnician = typeof resolvedSearchParams?.technician_id === "string" ? resolvedSearchParams.technician_id : null;
  const filterCrew = typeof resolvedSearchParams?.crew_id === "string" ? resolvedSearchParams.crew_id : null;
  const filterSourceType = typeof resolvedSearchParams?.source_type === "string" ? resolvedSearchParams.source_type : null;
  const filterOverdue = resolvedSearchParams?.overdue === "1" || resolvedSearchParams?.overdue === "true";
  const filterUnassigned =
    resolvedSearchParams?.unassigned === "1" || resolvedSearchParams?.unassigned === "true";
  const filterDueToday = resolvedSearchParams?.due_today === "1" || resolvedSearchParams?.due_today === "true";
  const filterCompletedToday =
    resolvedSearchParams?.completed_today === "1" || resolvedSearchParams?.completed_today === "true";
  const viewPreset = typeof resolvedSearchParams?.view === "string" ? resolvedSearchParams.view : null;
  const dateFrom = typeof resolvedSearchParams?.date_from === "string" ? resolvedSearchParams.date_from : null;
  const dateTo = typeof resolvedSearchParams?.date_to === "string" ? resolvedSearchParams.date_to : null;
  const filterCompletionStatus =
    typeof resolvedSearchParams?.completion_status === "string"
      ? resolvedSearchParams.completion_status
      : null;
  const completedFrom =
    typeof resolvedSearchParams?.completed_from === "string" ? resolvedSearchParams.completed_from : null;
  const completedTo =
    typeof resolvedSearchParams?.completed_to === "string" ? resolvedSearchParams.completed_to : null;
  const sortBy =
    typeof resolvedSearchParams?.sort === "string" &&
    ["updated_at", "scheduled_date", "due_date", "completed_at", "priority", "status"].includes(
      resolvedSearchParams.sort
    )
    ? resolvedSearchParams.sort
    : "updated_at";
  const sortOrder = resolvedSearchParams?.order === "asc" ? "asc" : "desc";
  const today = new Date().toISOString().slice(0, 10);
  const parsedPage = Number.parseInt(
    typeof resolvedSearchParams?.page === "string" ? resolvedSearchParams.page : "1",
    10
  );
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 50;
  const listFilters: WorkOrderFilters = {
    q,
    viewPreset,
    filterStatus,
    filterPriority,
    filterCategory,
    filterCompany,
    filterProperty,
    filterBuilding,
    filterUnit,
    filterAsset,
    filterTechnician,
    filterCrew,
    filterSourceType,
    filterOverdue,
    filterUnassigned,
    filterDueToday,
    filterCompletedToday,
    dateFrom,
    dateTo,
    filterCompletionStatus,
    completedFrom,
    completedTo,
    today,
  };
  const sortColumn =
    sortBy === "scheduled_date"
      ? "scheduled_date"
      : sortBy === "due_date"
        ? "due_date"
        : sortBy === "completed_at"
          ? "completed_at"
          : sortBy === "priority"
            ? "priority"
            : sortBy === "status"
              ? "status"
              : "updated_at";
  const buildWorkOrdersQuery = () => {
    const baseQuery = supabase
      .from("work_orders")
      .select(
        `
      id, work_order_number, title, company_id, customer_id, property_id, building_id, unit_id, asset_id, vendor_id,
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
      crews!assigned_crew_id(name),
      vendors(name)
    `,
        { count: "exact" }
      )
      .in("company_id", companyIds);
    return applyWorkOrderFilters(baseQuery, listFilters) as typeof baseQuery;
  };

  const fetchWorkOrdersPage = async (targetPage: number) => {
    const from = (targetPage - 1) * pageSize;
    const to = from + pageSize - 1;
    return buildWorkOrdersQuery()
      .order(sortColumn, { ascending: sortOrder === "asc" })
      .range(from, to);
  };

  let currentPage = page;
  const firstPageResult = await fetchWorkOrdersPage(currentPage);
  let workOrdersRaw = firstPageResult.data;
  let error = firstPageResult.error;
  const totalCount = firstPageResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (currentPage > totalPages) {
    currentPage = totalPages;
    const fallbackPage = await fetchWorkOrdersPage(currentPage);
    workOrdersRaw = fallbackPage.data;
    error = fallbackPage.error;
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekAgoStart = `${oneWeekAgo.toISOString().slice(0, 10)}T00:00:00.000Z`;

  // Summary card counts: global for tenant/company scope only. Do NOT apply saved view or list filters.
  const buildStatsBaseQuery = () =>
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .in("company_id", companyIds);

  const [openStats, inProgressStats, onHoldStats, overdueStats, dueTodayStats, completedTodayStats, newStats, readyStats, scheduledStats, completedWeekStats] =
    await Promise.all([
      buildStatsBaseQuery().in("status", ["new", "open", "ready_to_schedule", "assigned", "scheduled"]),
      buildStatsBaseQuery().eq("status", "in_progress"),
      buildStatsBaseQuery().eq("status", "on_hold"),
      buildStatsBaseQuery().lt("due_date", today).not("status", "in", "(completed,cancelled)"),
      buildStatsBaseQuery().eq("due_date", today).not("status", "in", "(completed,cancelled)"),
      buildStatsBaseQuery()
        .eq("status", "completed")
        .gte("completed_at", `${today}T00:00:00`)
        .lte("completed_at", `${today}T23:59:59.999`),
      buildStatsBaseQuery().in("status", ["new", "open"]),
      buildStatsBaseQuery().in("status", ["ready_to_schedule", "assigned"]),
      buildStatsBaseQuery().eq("status", "scheduled"),
      buildStatsBaseQuery().eq("status", "completed").gte("updated_at", weekAgoStart),
    ]);

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
    const ven = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors;
    const technician_name = tech && typeof tech === "object" && "technician_name" in tech ? (tech as { technician_name?: string }).technician_name ?? (tech as { name?: string }).name : null;
    const crew_name = crewRow && typeof crewRow === "object" && "name" in crewRow ? (crewRow as { name?: string }).name : null;
    const company_name = comp && typeof comp === "object" && "name" in comp ? (comp as { name?: string }).name : null;
    const customer_name = cust && typeof cust === "object" && "name" in cust ? (cust as { name?: string }).name : null;
    const property_name = prop && typeof prop === "object" ? (prop as { property_name?: string }).property_name ?? (prop as { name?: string }).name : null;
    const building_name = bld && typeof bld === "object" ? (bld as { building_name?: string }).building_name ?? (bld as { name?: string }).name : null;
    const unit_name = un && typeof un === "object" ? (un as { unit_name?: string }).unit_name ?? (un as { name_or_number?: string }).name_or_number : null;
    const asset_name = ast && typeof ast === "object" ? (ast as { asset_name?: string }).asset_name ?? (ast as { name?: string }).name : null;
    const vendor_name = ven && typeof ven === "object" && "name" in ven ? (ven as { name?: string }).name : null;
    const locationParts = [property_name, building_name, unit_name].filter(Boolean);
    const location = locationParts.length ? locationParts.join(" / ") : null;
    const rest = { ...row };
    delete rest.technicians;
    delete rest.crews;
    delete rest.companies;
    delete rest.customers;
    delete rest.properties;
    delete rest.buildings;
    delete rest.units;
    delete rest.assets;
    delete rest.vendors;
    return {
      ...rest,
      technician_name: technician_name ?? undefined,
      crew_name: crew_name ?? undefined,
      vendor_name: vendor_name ?? undefined,
      company_name: company_name ?? undefined,
      customer_name: customer_name ?? undefined,
      location: location ?? undefined,
      asset_name: asset_name ?? undefined,
    };
  }) as (WorkOrder & { technician_name?: string; crew_name?: string; vendor_name?: string; company_name?: string; customer_name?: string; location?: string; asset_name?: string })[];

  const stats = {
    open: openStats.count ?? 0,
    inProgress: inProgressStats.count ?? 0,
    onHold: onHoldStats.count ?? 0,
    overdue: overdueStats.count ?? 0,
    dueToday: dueTodayStats.count ?? 0,
    completedToday: completedTodayStats.count ?? 0,
    new: newStats.count ?? 0,
    readyToSchedule: readyStats.count ?? 0,
    scheduled: scheduledStats.count ?? 0,
    completedThisWeek: completedWeekStats.count ?? 0,
  };

  return (
    <div className="space-y-6" data-tour="demo-guided:work-orders">
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
        vendors={vendorOptions}
        slaPolicies={
          (slaPoliciesData ?? []) as {
            company_id: string;
            priority: string;
            response_target_minutes: number;
          }[]
        }
        initialPrefill={prefill}
        autoOpenNew={!!autoOpenNew}
        initialEditId={editId}
        page={currentPage}
        pageSize={pageSize}
        totalCount={totalCount}
        error={error?.message ?? null}
      />
    </div>
  );
}
