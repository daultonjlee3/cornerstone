import { createClient } from "@/src/lib/supabase/server";
import type { DispatchWorkOrder, DispatchCrew } from "./types";

export type LoadDispatchResult = {
  crews: DispatchCrew[];
  workOrders: DispatchWorkOrder[];
  unscheduled: DispatchWorkOrder[];
  overdue: DispatchWorkOrder[];
  ready: DispatchWorkOrder[];
  filterOptions: DispatchFilterOptions;
  insights: DispatchInsights;
  workforce: DispatchWorkforce;
  error: string | null;
};

export type DispatchFilterOptions = {
  companies: { id: string; name: string }[];
  properties: { id: string; property_name?: string; name?: string; company_id: string }[];
  buildings: {
    id: string;
    building_name?: string | null;
    name?: string | null;
    property_id: string;
    company_id: string;
  }[];
  crews: { id: string; name: string; company_id?: string | null }[];
  technicians: { id: string; name: string }[];
  assets: { id: string; name: string; company_id?: string | null }[];
  assignmentTypes: { value: string; label: string }[];
  priorities: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  categories: { value: string; label: string }[];
};

export type DispatchInsights = {
  total: number;
  overdue: number;
  ready: number;
  unscheduled: number;
  unassignedWorkOrders: number;
  scheduledToday: number;
  inProgressToday: number;
  highPriorityOpenJobs: number;
  techniciansWorkingToday: number;
  crewsWorkingToday: number;
};

export type DispatchTechnicianWorkload = {
  id: string;
  name: string;
  status: string;
  currentAssignments: number;
  scheduledToday: number;
  inProgress: number;
  workloadHoursToday: number;
  dailyCapacityHours: number;
  availableCapacityHours: number;
  crewMemberships: string[];
  latitude: number | null;
  longitude: number | null;
  locationSource: "technician" | "assigned_work_orders" | null;
  lastLocationAt: string | null;
  assignedWorkOrderIds: string[];
};

export type DispatchCrewWorkload = {
  id: string;
  name: string;
  memberCount: number;
  memberNames: string[];
  currentAssignments: number;
  scheduledToday: number;
  activeJobs: number;
  workloadHoursToday: number;
  dailyCapacityHours: number;
  availableCapacityHours: number;
};

export type DispatchWorkforce = {
  technicians: DispatchTechnicianWorkload[];
  crews: DispatchCrewWorkload[];
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "ready_to_schedule", label: "Ready to schedule" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
];

const ASSIGNMENT_TYPE_OPTIONS = [
  { value: "unassigned", label: "Unassigned" },
  { value: "technician", label: "Technician" },
  { value: "crew", label: "Crew" },
];

type LoadDispatchParams = {
  tenantId: string;
  companyIds: string[];
  selectedDate: string;
  q: string | null;
  company_id: string | null;
  property_id: string | null;
  building_id: string | null;
  priority: string | null;
  status: string | null;
  crew_id: string | null;
  technician_id: string | null;
  assignment_type: string | null;
  asset_id: string | null;
  category: string | null;
};

function toComparableStatus(value: string | null | undefined): string {
  if (!value) return "";
  if (value === "open") return "new";
  if (value === "assigned") return "ready_to_schedule";
  if (value === "closed") return "completed";
  return value;
}

function parseScheduledHours(workOrder: DispatchWorkOrder): number {
  if (workOrder.scheduled_start && workOrder.scheduled_end) {
    const start = new Date(workOrder.scheduled_start).getTime();
    const end = new Date(workOrder.scheduled_end).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return (end - start) / (60 * 60 * 1000);
    }
  }
  return workOrder.estimated_hours ?? 1;
}

export async function loadDispatchData(params: LoadDispatchParams): Promise<LoadDispatchResult> {
  const {
    tenantId,
    companyIds,
    selectedDate,
    q,
    company_id,
    property_id,
    building_id,
    priority,
    status,
    crew_id,
    technician_id,
    category,
  } = params;

  const supabase = await createClient();

  if (companyIds.length === 0) {
    return {
      crews: [],
      workOrders: [],
      unscheduled: [],
      overdue: [],
      ready: [],
      filterOptions: {
        companies: [],
        properties: [],
        buildings: [],
        crews: [],
        technicians: [],
        assets: [],
        assignmentTypes: ASSIGNMENT_TYPE_OPTIONS,
        priorities: PRIORITY_OPTIONS,
        statuses: STATUS_OPTIONS,
        categories: [],
      },
      insights: {
        total: 0,
        overdue: 0,
        ready: 0,
        unscheduled: 0,
        unassignedWorkOrders: 0,
        scheduledToday: 0,
        inProgressToday: 0,
        highPriorityOpenJobs: 0,
        techniciansWorkingToday: 0,
        crewsWorkingToday: 0,
      },
      workforce: { technicians: [], crews: [] },
      error: null,
    };
  }

  const [
    { data: companies },
    { data: properties },
    { data: buildings },
    { data: crewsData },
    { data: techniciansData },
    { data: assetsData },
  ] = await Promise.all([
    supabase.from("companies").select("id, name").eq("tenant_id", tenantId).order("name"),
    supabase
      .from("properties")
      .select("id, property_name, name, company_id")
      .in("company_id", companyIds)
      .order("property_name"),
    supabase
      .from("buildings")
      .select("id, building_name, name, property_id, company_id")
      .in("company_id", companyIds)
      .order("building_name")
      .order("name"),
    supabase
      .from("crews")
      .select("id, name, is_active, company_id")
      .eq("tenant_id", tenantId)
      .order("name"),
    supabase
      .from("technicians")
      .select("id, technician_name, name, status, company_id, current_latitude, current_longitude, last_location_at")
      .in("company_id", companyIds)
      .order("technician_name")
      .order("name"),
    supabase
      .from("assets")
      .select("id, asset_name, name, company_id, property_id, building_id, unit_id")
    .in("company_id", companyIds)
      .order("asset_name")
      .order("name"),
  ]);

  const companyList = (companies ?? []) as { id: string; name: string }[];
  const propertyList = (properties ?? []) as {
    id: string;
    property_name?: string;
    name?: string;
    company_id: string;
  }[];
  const buildingList = (buildings ?? []) as Array<{
    id: string;
    building_name?: string | null;
    name?: string | null;
    property_id: string;
    company_id: string;
  }>;
  const allCrews = (crewsData ?? []) as Array<{
    id: string;
    name: string;
    is_active?: boolean | null;
    company_id?: string | null;
  }>;
  const crewList = allCrews
    .filter((row) => row.is_active !== false)
    .map((row) => ({ id: row.id, name: row.name, company_id: row.company_id ?? null }));
  const crewCompanyById = new Map(
    allCrews.map((row) => [row.id, row.company_id ?? null] as const)
  );
  const allTechnicians = (techniciansData ?? []).map((t) => ({
    id: (t as { id: string }).id,
    name:
      (t as { technician_name?: string | null; name?: string | null }).technician_name ??
      (t as { name?: string | null }).name ??
      "Unknown",
    status: (t as { status?: string | null }).status ?? "active",
    company_id: (t as { company_id?: string | null }).company_id ?? null,
    current_latitude:
      (t as { current_latitude?: number | string | null }).current_latitude == null
        ? null
        : Number((t as { current_latitude?: number | string | null }).current_latitude),
    current_longitude:
      (t as { current_longitude?: number | string | null }).current_longitude == null
        ? null
        : Number((t as { current_longitude?: number | string | null }).current_longitude),
    last_location_at: (t as { last_location_at?: string | null }).last_location_at ?? null,
  }));
  const technicianList = allTechnicians
    .filter((t) => t.status === "active")
    .map((t) => ({ id: t.id, name: t.name }));
  const assetList = (assetsData ?? []).map((a) => ({
    id: (a as { id: string }).id,
    name:
      (a as { asset_name?: string | null; name?: string | null }).asset_name ??
      (a as { name?: string | null }).name ??
      "Unnamed asset",
    company_id: (a as { company_id?: string | null }).company_id ?? null,
    property_id: (a as { property_id?: string | null }).property_id ?? null,
    building_id: (a as { building_id?: string | null }).building_id ?? null,
    unit_id: (a as { unit_id?: string | null }).unit_id ?? null,
  }));

  const technicianNameById = new Map(allTechnicians.map((t) => [t.id, t.name]));
  const crewNameById = new Map(crewList.map((c) => [c.id, c.name]));

  const crewIds = crewList.map((c) => c.id);
  const crewMembersByCrewId = new Map<string, string[]>();
  crewIds.forEach((id) => crewMembersByCrewId.set(id, []));
  if (crewIds.length > 0) {
    const { data: crewMembersRaw } = await supabase
      .from("crew_members")
      .select("crew_id, technician_id")
      .in("crew_id", crewIds);
    (crewMembersRaw ?? []).forEach((row) => {
      const crewId = (row as { crew_id?: string }).crew_id;
      const technicianId = (row as { technician_id?: string }).technician_id;
      if (!crewId || !technicianId) return;
      const members = crewMembersByCrewId.get(crewId) ?? [];
      members.push(technicianId);
      crewMembersByCrewId.set(crewId, members);
    });
  }

  let query = supabase
    .from("work_orders")
    .select(
      `
      id, title, status, priority, category, latitude, longitude,
      scheduled_date, scheduled_start, scheduled_end, due_date,
      assigned_crew_id, assigned_technician_id, estimated_hours,
      company_id, property_id, building_id, unit_id,
      work_order_number, asset_id,
      source_type, preventive_maintenance_plan_id,
      updated_at,
      properties(property_name, name, latitude, longitude),
      buildings(building_name, name, latitude, longitude),
      units(unit_name, name_or_number, latitude, longitude),
      assets!work_orders_asset_id_fkey(asset_name, name, latitude, longitude)
    `
    )
    .in("company_id", companyIds)
    .in("status", [
      "open",
      "assigned",
      "new",
      "ready_to_schedule",
      "scheduled",
      "in_progress",
      "on_hold",
    ]);

  if (q?.trim()) {
    query = query.or(
      `work_order_number.ilike.%${q.trim()}%,title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`
    );
  }
  if (company_id) query = query.eq("company_id", company_id);
  if (property_id) query = query.eq("property_id", property_id);
  if (building_id) query = query.eq("building_id", building_id);
  if (priority) query = query.eq("priority", priority);
  if (status) query = query.eq("status", status);
  if (crew_id) query = query.eq("assigned_crew_id", crew_id);
  if (technician_id) query = query.eq("assigned_technician_id", technician_id);
  if (params.assignment_type === "unassigned") {
    query = query.is("assigned_technician_id", null).is("assigned_crew_id", null);
  } else if (params.assignment_type === "technician") {
    query = query.not("assigned_technician_id", "is", null);
  } else if (params.assignment_type === "crew") {
    query = query.not("assigned_crew_id", "is", null);
  }
  if (params.asset_id) query = query.eq("asset_id", params.asset_id);
  if (category) query = query.eq("category", category);

  const { data: workOrdersRaw, error } = await query.order("scheduled_date", { ascending: true });

  if (error) {
    return {
      crews: [],
      workOrders: [],
      unscheduled: [],
      overdue: [],
      ready: [],
      filterOptions: {
        companies: companyList,
        properties: propertyList,
        buildings: buildingList,
        crews: crewList,
        technicians: technicianList,
        assets: assetList,
        assignmentTypes: ASSIGNMENT_TYPE_OPTIONS,
        priorities: PRIORITY_OPTIONS,
        statuses: STATUS_OPTIONS,
        categories: [],
      },
      insights: {
        total: 0,
        overdue: 0,
        ready: 0,
        unscheduled: 0,
        unassignedWorkOrders: 0,
        scheduledToday: 0,
        inProgressToday: 0,
        highPriorityOpenJobs: 0,
        techniciansWorkingToday: 0,
        crewsWorkingToday: 0,
      },
      workforce: { technicians: [], crews: [] },
      error: error.message,
    };
  }

  type Rel = {
    property_name?: string;
    name?: string;
    building_name?: string;
    unit_name?: string;
    name_or_number?: string;
    asset_name?: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  type Row = Record<string, unknown> & {
    properties?: Rel | Rel[];
    buildings?: Rel | Rel[];
    units?: Rel | Rel[];
    assets?: Rel | Rel[];
  };
  const first = (v: Rel | Rel[] | undefined): Rel => (Array.isArray(v) ? v[0] : v ?? null);
  const toNumber = (value: unknown): number | null => {
    if (value == null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const resolveCoordinates = (
    workOrderLatitude: number | null,
    workOrderLongitude: number | null,
    assetLatitude: number | null,
    assetLongitude: number | null,
    unitLatitude: number | null,
    unitLongitude: number | null,
    buildingLatitude: number | null,
    buildingLongitude: number | null,
    propertyLatitude: number | null,
    propertyLongitude: number | null
  ): {
    latitude: number | null;
    longitude: number | null;
    source: DispatchWorkOrder["location_coordinate_source"];
    accuracy: DispatchWorkOrder["location_coordinate_accuracy"];
  } => {
    if (workOrderLatitude != null && workOrderLongitude != null) {
      return { latitude: workOrderLatitude, longitude: workOrderLongitude, source: "work_order", accuracy: "exact" };
    }
    if (assetLatitude != null && assetLongitude != null) {
      return { latitude: assetLatitude, longitude: assetLongitude, source: "asset", accuracy: "fallback" };
    }
    if (unitLatitude != null && unitLongitude != null) {
      return { latitude: unitLatitude, longitude: unitLongitude, source: "unit", accuracy: "fallback" };
    }
    if (buildingLatitude != null && buildingLongitude != null) {
      return { latitude: buildingLatitude, longitude: buildingLongitude, source: "building", accuracy: "fallback" };
    }
    if (propertyLatitude != null && propertyLongitude != null) {
      return { latitude: propertyLatitude, longitude: propertyLongitude, source: "property", accuracy: "fallback" };
    }
    return { latitude: null, longitude: null, source: null, accuracy: null };
  };
  const categorySet = new Set<string>();
  const all: DispatchWorkOrder[] = (workOrdersRaw ?? []).map((row: Row) => {
    const { properties: propRel, buildings: bldRel, units: unitRel, assets: assetRel, ...rest } = row;
    const p = first(propRel);
    const b = first(bldRel);
    const u = first(unitRel);
    const a = first(assetRel);
    const propertyName = p && typeof p === "object" ? (p.property_name ?? p.name ?? null) : null;
    const buildingName = b && typeof b === "object" ? (b.building_name ?? b.name ?? null) : null;
    const unitName = u && typeof u === "object" ? (u.unit_name ?? u.name_or_number ?? null) : null;
    const assetName = a && typeof a === "object" ? (a.asset_name ?? a.name ?? null) : null;
    const workOrderLatitude = toNumber(rest.latitude);
    const workOrderLongitude = toNumber(rest.longitude);
    const assetLatitude = a && typeof a === "object" ? toNumber(a.latitude) : null;
    const assetLongitude = a && typeof a === "object" ? toNumber(a.longitude) : null;
    const unitLatitude = u && typeof u === "object" ? toNumber(u.latitude) : null;
    const unitLongitude = u && typeof u === "object" ? toNumber(u.longitude) : null;
    const buildingLatitude = b && typeof b === "object" ? toNumber(b.latitude) : null;
    const buildingLongitude = b && typeof b === "object" ? toNumber(b.longitude) : null;
    const propertyLatitude = p && typeof p === "object" ? toNumber(p.latitude) : null;
    const propertyLongitude = p && typeof p === "object" ? toNumber(p.longitude) : null;
    const resolvedCoordinates = resolveCoordinates(
      workOrderLatitude,
      workOrderLongitude,
      assetLatitude,
      assetLongitude,
      unitLatitude,
      unitLongitude,
      buildingLatitude,
      buildingLongitude,
      propertyLatitude,
      propertyLongitude
    );
    const crewId = rest.assigned_crew_id as string | null | undefined;
    const technicianId = rest.assigned_technician_id as string | null | undefined;
    const assigned_crew_name = crewId ? crewNameById.get(crewId) ?? null : null;
    const assigned_technician_name = technicianId
      ? technicianNameById.get(technicianId) ?? null
      : null;
    const assignment_type: DispatchWorkOrder["assignment_type"] = technicianId
      ? "technician"
      : crewId
        ? "crew"
        : "unassigned";
    const categoryValue = (rest.category as string | null | undefined) ?? null;
    if (categoryValue) categorySet.add(categoryValue);
    return {
      ...rest,
      property_name: propertyName,
      building_name: buildingName,
      unit_name: unitName,
      asset_name: assetName,
      latitude: resolvedCoordinates.latitude,
      longitude: resolvedCoordinates.longitude,
      location_coordinate_source: resolvedCoordinates.source,
      location_coordinate_accuracy: resolvedCoordinates.accuracy,
      assigned_technician_name,
      assigned_crew_name: assigned_crew_name ?? undefined,
      assignment_type,
    } as DispatchWorkOrder;
  });

  const today = selectedDate;

  const overdue: DispatchWorkOrder[] = [];
  const ready: DispatchWorkOrder[] = [];
  const unscheduled: DispatchWorkOrder[] = [];
  const scheduledToday: DispatchWorkOrder[] = [];
  const highPriorityOpen = new Set<string>();
  const techniciansWorkingToday = new Set<string>();
  const crewsWorkingToday = new Set<string>();
  let inProgressToday = 0;
  let unassignedWorkOrders = 0;

  const priorityRank = (p: string | null | undefined): number => {
    const v = (p ?? "").toLowerCase();
    if (v === "emergency") return 0;
    if (v === "urgent") return 1;
    if (v === "high") return 2;
    if (v === "medium") return 3;
    if (v === "low") return 4;
    return 5;
  };

  for (const wo of all) {
    const scheduled = wo.scheduled_date ?? null;
    const due = wo.due_date ?? null;
    const comparableStatus = toComparableStatus(wo.status ?? "");
    const isTerminal = comparableStatus === "completed" || comparableStatus === "cancelled";
    const hasAssignment = Boolean(wo.assigned_crew_id || wo.assigned_technician_id);

    if (!hasAssignment && !isTerminal) unassignedWorkOrders += 1;
    if (comparableStatus === "in_progress") inProgressToday += 1;
    if (scheduled === today && wo.assigned_technician_id) {
      techniciansWorkingToday.add(wo.assigned_technician_id);
    }
    if (scheduled === today && wo.assigned_crew_id) {
      crewsWorkingToday.add(wo.assigned_crew_id);
    }
    if (
      !isTerminal &&
      ["high", "urgent", "emergency"].includes((wo.priority ?? "").toLowerCase())
    ) {
      highPriorityOpen.add(wo.id);
    }
    if (scheduled === today && hasAssignment) {
      scheduledToday.push(wo);
    }

    // Queue: only work orders not yet scheduled (no scheduled_date)
    if (scheduled) continue;
    if (isTerminal) continue;

    const isOverdue = due && due < today;
    if (isOverdue) {
      overdue.push(wo);
      continue;
    }
    if (comparableStatus === "ready_to_schedule") {
      ready.push(wo);
      continue;
    }
    if (["new", "ready_to_schedule"].includes(comparableStatus)) {
      unscheduled.push(wo);
    }
  }

  overdue.sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    const da = a.due_date ?? "";
    const db = b.due_date ?? "";
    return da.localeCompare(db);
  });
  ready.sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    const da = a.due_date ?? "";
    const db = b.due_date ?? "";
    return da.localeCompare(db);
  });
  unscheduled.sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    const da = a.due_date ?? "";
    const db = b.due_date ?? "";
    return da.localeCompare(db);
  });

  const crews: DispatchCrew[] = crewList.map((c) => {
    const crewWos = scheduledToday.filter((wo) => wo.assigned_crew_id === c.id);
    const totalHours = crewWos.reduce((sum, wo) => sum + parseScheduledHours(wo), 0);
    return {
      id: c.id,
      name: c.name,
      company_id: crewCompanyById.get(c.id) ?? null,
      scheduled_today: crewWos,
      total_scheduled_hours: Math.round(totalHours * 10) / 10,
      job_count: crewWos.length,
    };
  });

  const activeWorkOrders = all.filter((wo) => {
    const normalized = toComparableStatus(wo.status ?? "");
    return normalized !== "completed" && normalized !== "cancelled";
  });

  const technicianStats = new Map<
    string,
    { currentAssignments: number; scheduledToday: number; inProgress: number; workloadHoursToday: number }
  >();
  const assignedWorkOrderIdsByTechnician = new Map<string, string[]>();
  const assignedCoordinatesByTechnician = new Map<string, Array<{ latitude: number; longitude: number }>>();
  const crewStats = new Map<
    string,
    { currentAssignments: number; scheduledToday: number; activeJobs: number; workloadHoursToday: number }
  >();

  activeWorkOrders.forEach((wo) => {
    const comparableStatus = toComparableStatus(wo.status ?? "");
    const hours = wo.scheduled_date === today ? parseScheduledHours(wo) : 0;

    if (wo.assigned_technician_id) {
      const key = wo.assigned_technician_id;
      const current = technicianStats.get(key) ?? {
        currentAssignments: 0,
        scheduledToday: 0,
        inProgress: 0,
        workloadHoursToday: 0,
      };
      current.currentAssignments += 1;
      if (wo.scheduled_date === today) {
        current.scheduledToday += 1;
        current.workloadHoursToday += hours;
      }
      if (comparableStatus === "in_progress") current.inProgress += 1;
      technicianStats.set(key, current);
      const assignedIds = assignedWorkOrderIdsByTechnician.get(key) ?? [];
      assignedIds.push(wo.id);
      assignedWorkOrderIdsByTechnician.set(key, assignedIds);
      if (wo.latitude != null && wo.longitude != null) {
        const coordinates = assignedCoordinatesByTechnician.get(key) ?? [];
        coordinates.push({ latitude: wo.latitude, longitude: wo.longitude });
        assignedCoordinatesByTechnician.set(key, coordinates);
      }
    }

    if (wo.assigned_crew_id) {
      const key = wo.assigned_crew_id;
      const current = crewStats.get(key) ?? {
        currentAssignments: 0,
        scheduledToday: 0,
        activeJobs: 0,
        workloadHoursToday: 0,
      };
      current.currentAssignments += 1;
      if (wo.scheduled_date === today) {
        current.scheduledToday += 1;
        current.workloadHoursToday += hours;
      }
      if (comparableStatus === "in_progress") current.activeJobs += 1;
      crewStats.set(key, current);
    }
  });

  const technicianWorkloads: DispatchTechnicianWorkload[] = allTechnicians.map((tech) => {
    const stats = technicianStats.get(tech.id) ?? {
      currentAssignments: 0,
      scheduledToday: 0,
      inProgress: 0,
      workloadHoursToday: 0,
    };
    const crewMemberships = crewList
      .filter((crew) => (crewMembersByCrewId.get(crew.id) ?? []).includes(tech.id))
      .map((crew) => crew.name);
    const dailyCapacityHours = 8;
    const workloadHoursToday = Math.round(stats.workloadHoursToday * 10) / 10;
    const assignedCoordinates = assignedCoordinatesByTechnician.get(tech.id) ?? [];
    const fallbackLatitude =
      assignedCoordinates.length > 0
        ? assignedCoordinates.reduce((sum, point) => sum + point.latitude, 0) / assignedCoordinates.length
        : null;
    const fallbackLongitude =
      assignedCoordinates.length > 0
        ? assignedCoordinates.reduce((sum, point) => sum + point.longitude, 0) / assignedCoordinates.length
        : null;
    const techLatitude = toNumber(tech.current_latitude);
    const techLongitude = toNumber(tech.current_longitude);
    const latitude = techLatitude ?? fallbackLatitude;
    const longitude = techLongitude ?? fallbackLongitude;
    return {
      id: tech.id,
      name: tech.name,
      status: tech.status,
      currentAssignments: stats.currentAssignments,
      scheduledToday: stats.scheduledToday,
      inProgress: stats.inProgress,
      workloadHoursToday,
      dailyCapacityHours,
      availableCapacityHours: Math.round((dailyCapacityHours - workloadHoursToday) * 10) / 10,
      crewMemberships,
      latitude,
      longitude,
      locationSource:
        techLatitude != null && techLongitude != null
          ? "technician"
          : latitude != null && longitude != null
            ? "assigned_work_orders"
            : null,
      lastLocationAt: tech.last_location_at ?? null,
      assignedWorkOrderIds: assignedWorkOrderIdsByTechnician.get(tech.id) ?? [],
    };
  });

  const crewWorkloads: DispatchCrewWorkload[] = crewList.map((crew) => {
    const stats = crewStats.get(crew.id) ?? {
      currentAssignments: 0,
      scheduledToday: 0,
      activeJobs: 0,
      workloadHoursToday: 0,
    };
    const memberIds = crewMembersByCrewId.get(crew.id) ?? [];
    const memberNames = memberIds
      .map((id) => technicianNameById.get(id))
      .filter((value): value is string => Boolean(value));
    const workloadHoursToday = Math.round(stats.workloadHoursToday * 10) / 10;
    const dailyCapacityHours = Math.max(1, memberIds.length) * 8;
    return {
      id: crew.id,
      name: crew.name,
      memberCount: memberIds.length,
      memberNames,
      currentAssignments: stats.currentAssignments,
      scheduledToday: stats.scheduledToday,
      activeJobs: stats.activeJobs,
      workloadHoursToday,
      dailyCapacityHours,
      availableCapacityHours: Math.round((dailyCapacityHours - workloadHoursToday) * 10) / 10,
    };
  });

  const categoryOptions = Array.from(categorySet)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({
      value,
      label: value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    }));

  return {
    crews,
    workOrders: all,
    unscheduled,
    overdue,
    ready,
    filterOptions: {
      companies: companyList,
      properties: propertyList,
      buildings: buildingList,
      crews: crewList,
      technicians: technicianList,
      assets: assetList,
      assignmentTypes: ASSIGNMENT_TYPE_OPTIONS,
      priorities: PRIORITY_OPTIONS,
      statuses: STATUS_OPTIONS,
      categories: categoryOptions,
    },
    insights: {
      total: all.length,
      overdue: overdue.length,
      ready: ready.length,
      unscheduled: unscheduled.length,
      unassignedWorkOrders,
      scheduledToday: scheduledToday.length,
      inProgressToday,
      highPriorityOpenJobs: highPriorityOpen.size,
      techniciansWorkingToday: techniciansWorkingToday.size,
      crewsWorkingToday: crewsWorkingToday.size,
    },
    workforce: {
      technicians: technicianWorkloads.sort((a, b) => {
        if (a.status !== b.status) return a.status === "active" ? -1 : 1;
        if (b.currentAssignments !== a.currentAssignments) {
          return b.currentAssignments - a.currentAssignments;
        }
        return a.name.localeCompare(b.name);
      }),
      crews: crewWorkloads.sort((a, b) => {
        if (b.currentAssignments !== a.currentAssignments) {
          return b.currentAssignments - a.currentAssignments;
        }
        return a.name.localeCompare(b.name);
      }),
    },
    error: null,
  };
}
