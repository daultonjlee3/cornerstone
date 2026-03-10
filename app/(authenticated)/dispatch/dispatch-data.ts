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
  error: string | null;
};

export type DispatchFilterOptions = {
  companies: { id: string; name: string }[];
  properties: { id: string; property_name?: string; name?: string; company_id: string }[];
  crews: { id: string; name: string }[];
  technicians: { id: string; name: string }[];
  priorities: { value: string; label: string }[];
  statuses: { value: string; label: string }[];
  categories: { value: string; label: string }[];
};

export type DispatchInsights = {
  total: number;
  overdue: number;
  ready: number;
  unscheduled: number;
  scheduledToday: number;
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

type LoadDispatchParams = {
  tenantId: string;
  companyIds: string[];
  selectedDate: string;
  q: string | null;
  company_id: string | null;
  property_id: string | null;
  priority: string | null;
  status: string | null;
  crew_id: string | null;
  technician_id: string | null;
  category: string | null;
};

export async function loadDispatchData(params: LoadDispatchParams): Promise<LoadDispatchResult> {
  const {
    tenantId,
    companyIds,
    selectedDate,
    q,
    company_id,
    property_id,
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
        crews: [],
        technicians: [],
        priorities: PRIORITY_OPTIONS,
        statuses: STATUS_OPTIONS,
        categories: [],
      },
      insights: { total: 0, overdue: 0, ready: 0, unscheduled: 0, scheduledToday: 0 },
      error: null,
    };
  }

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");
  const companyList = (companies ?? []) as { id: string; name: string }[];

  const { data: properties } = await supabase
    .from("properties")
    .select("id, property_name, name, company_id")
    .in("company_id", companyIds)
    .order("property_name");
  const propertyList = (properties ?? []) as {
    id: string;
    property_name?: string;
    name?: string;
    company_id: string;
  }[];

  const { data: crewsData } = await supabase
    .from("crews")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("name");
  const crewList = (crewsData ?? []) as { id: string; name: string }[];

  const { data: techniciansData } = await supabase
    .from("technicians")
    .select("id, technician_name, name")
    .in("company_id", companyIds)
    .eq("status", "active")
    .order("technician_name");
  const technicianList = (techniciansData ?? []).map((t) => ({
    id: (t as { id: string }).id,
    name: ((t as { technician_name?: string; name?: string }).technician_name ||
      (t as { name?: string }).name ||
      "Unknown") as string,
  }));

  let query = supabase
    .from("work_orders")
    .select(
      `
      id, title, status, priority, category,
      scheduled_date, scheduled_start, scheduled_end, due_date,
      assigned_crew_id, assigned_technician_id, estimated_hours,
      company_id, property_id, building_id, unit_id,
      source_type, preventive_maintenance_plan_id,
      updated_at,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number)
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
    query = query.or(`title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);
  }
  if (company_id) query = query.eq("company_id", company_id);
  if (property_id) query = query.eq("property_id", property_id);
  if (priority) query = query.eq("priority", priority);
  if (status) query = query.eq("status", status);
  if (crew_id) query = query.eq("assigned_crew_id", crew_id);
  if (technician_id) query = query.eq("assigned_technician_id", technician_id);
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
        crews: crewList,
        technicians: technicianList,
        priorities: PRIORITY_OPTIONS,
        statuses: STATUS_OPTIONS,
        categories: [],
      },
      insights: { total: 0, overdue: 0, ready: 0, unscheduled: 0, scheduledToday: 0 },
      error: error.message,
    };
  }

  type Rel = { property_name?: string; name?: string; building_name?: string; unit_name?: string; name_or_number?: string } | null;
  type Row = Record<string, unknown> & {
    properties?: Rel | Rel[];
    buildings?: Rel | Rel[];
    units?: Rel | Rel[];
  };
  const first = (v: Rel | Rel[] | undefined): Rel => (Array.isArray(v) ? v[0] : v ?? null);
  const all: DispatchWorkOrder[] = (workOrdersRaw ?? []).map((row: Row) => {
    const { properties: propRel, buildings: bldRel, units: unitRel, ...rest } = row;
    const p = first(propRel);
    const b = first(bldRel);
    const u = first(unitRel);
    const propertyName = p && typeof p === "object" ? (p.property_name ?? p.name ?? null) : null;
    const buildingName = b && typeof b === "object" ? (b.building_name ?? b.name ?? null) : null;
    const unitName = u && typeof u === "object" ? (u.unit_name ?? u.name_or_number ?? null) : null;
    const crewId = rest.assigned_crew_id as string | null | undefined;
    const assigned_crew_name = crewId
      ? (crewList.find((c) => c.id === crewId)?.name ?? null)
      : null;
    return {
      ...rest,
      property_name: propertyName,
      building_name: buildingName,
      unit_name: unitName,
      assigned_crew_name: assigned_crew_name ?? undefined,
    } as DispatchWorkOrder;
  });

  const today = selectedDate;

  const overdue: DispatchWorkOrder[] = [];
  const ready: DispatchWorkOrder[] = [];
  const unscheduled: DispatchWorkOrder[] = [];
  const scheduledToday: DispatchWorkOrder[] = [];

  for (const wo of all) {
    const scheduled = wo.scheduled_date ?? null;
    const due = wo.due_date ?? null;
    const hasCrew = !!wo.assigned_crew_id;

    if (due && due < today && wo.status !== "completed") {
      overdue.push(wo);
    }
    if (scheduled === today && hasCrew) {
      scheduledToday.push(wo);
    }
    if (
      !scheduled &&
      !hasCrew &&
      ["open", "assigned", "new", "ready_to_schedule"].includes(wo.status ?? "")
    ) {
      unscheduled.push(wo);
    }
    if (
      scheduled === today &&
      !hasCrew &&
      ["open", "assigned", "new", "ready_to_schedule"].includes(wo.status ?? "")
    ) {
      ready.push(wo);
    }
  }

  const crews: DispatchCrew[] = crewList.map((c) => {
    const crewWos = scheduledToday.filter((wo) => wo.assigned_crew_id === c.id);
    let totalHours = 0;
    for (const wo of crewWos) {
      if (wo.scheduled_start && wo.scheduled_end) {
        const start = new Date(wo.scheduled_start).getTime();
        const end = new Date(wo.scheduled_end).getTime();
        totalHours += (end - start) / (60 * 60 * 1000);
      } else {
        totalHours += wo.estimated_hours ?? 1;
      }
    }
    return {
      id: c.id,
      name: c.name,
      company_id: null,
      scheduled_today: crewWos,
      total_scheduled_hours: Math.round(totalHours * 10) / 10,
      job_count: crewWos.length,
    };
  });

  return {
    crews,
    workOrders: all,
    unscheduled,
    overdue,
    ready,
    filterOptions: {
      companies: companyList,
      properties: propertyList,
      crews: crewList,
      technicians: technicianList,
      priorities: PRIORITY_OPTIONS,
      statuses: STATUS_OPTIONS,
      categories: [],
    },
    insights: {
      total: all.length,
      overdue: overdue.length,
      ready: ready.length,
      unscheduled: unscheduled.length,
      scheduledToday: scheduledToday.length,
    },
    error: null,
  };
}
