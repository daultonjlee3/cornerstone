import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabase/server";
import type { AssetInsightSeverity } from "@/src/lib/assets/intelligence-types";

const WORK_ORDER_SELECT_WITH_SAFETY = `
      id, company_id, work_order_number, title, status, priority, category, source_type,
      description, safety_notes, due_date, assigned_technician_id, assigned_crew_id,
      estimated_hours, started_at, last_paused_at, scheduled_start, scheduled_end,
      preventive_maintenance_plan_id,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      assets!work_orders_asset_id_fkey(
        id, asset_name, name, asset_type, category, manufacturer, model, serial_number,
        status, condition, health_score, failure_risk, last_serviced_at
      ),
      technicians!assigned_technician_id(technician_name, name),
      crews!assigned_crew_id(name)
    `;

const WORK_ORDER_SELECT_LEGACY = `
      id, company_id, work_order_number, title, status, priority, category, source_type,
      description, due_date, assigned_technician_id, assigned_crew_id,
      estimated_hours, started_at, last_paused_at, scheduled_start, scheduled_end,
      preventive_maintenance_plan_id,
      properties(property_name, name),
      buildings(building_name, name),
      units(unit_name, name_or_number),
      assets!work_orders_asset_id_fkey(
        id, asset_name, name, asset_type, category, manufacturer, model, serial_number,
        status, condition, health_score, failure_risk, last_serviced_at
      ),
      technicians!assigned_technician_id(technician_name, name),
      crews!assigned_crew_id(name)
    `;

type TechnicianOption = { id: string; name: string; email: string };

type ChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  sort_order: number;
};

type PartUsage = {
  id: string;
  quantity_used: number;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
  part_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_of_measure: string | null;
  used_at: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  unit: string | null;
  cost: number | null;
  quantity: number;
};

type Attachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  caption: string | null;
  technician_id: string | null;
  created_at: string;
};

type LaborEntry = {
  id: string;
  technician_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
};

type TimelineNote = {
  id: string;
  body: string;
  note_type: string | null;
  created_at: string;
  technician_id: string | null;
};

type TimelineEvent = {
  id: string;
  action_type: string;
  performed_at: string;
  metadata: Record<string, unknown> | null;
};

export type TechnicianExecutionWorkOrder = {
  id: string;
  company_id: string;
  work_order_number: string | null;
  title: string;
  status: string;
  priority: string;
  category: string | null;
  source_type: string | null;
  due_date: string | null;
  description: string | null;
  instructions: string | null;
  safety_notes: string | null;
  assigned_technician_id: string | null;
  assigned_technician_name: string | null;
  assigned_crew_id: string | null;
  assigned_crew_name: string | null;
  estimated_hours: number | null;
  started_at: string | null;
  last_paused_at: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  location: string | null;
  location_segments: string[];
  asset_id: string | null;
  asset_name: string | null;
  technician_id_for_actor: string | null;
  notesTimeline: TimelineNote[];
  activityTimeline: TimelineEvent[];
  asset_context: {
    id: string | null;
    name: string | null;
    asset_type: string | null;
    health_score: number | null;
    failure_risk: number | null;
    last_maintenance_at: string | null;
    recurring_issues: Array<{
      id: string;
      pattern_type: string;
      frequency: number;
      severity: AssetInsightSeverity;
      recommendation: string;
    }>;
  };
  checklist_progress: {
    total: number;
    completed: number;
    percent: number;
    remaining: number;
  };
};

export type TechnicianExecutionPayload = {
  workOrder: TechnicianExecutionWorkOrder;
  checklistItems: ChecklistItem[];
  partUsage: PartUsage[];
  inventoryItems: InventoryItem[];
  technicians: Array<{ id: string; name: string }>;
  laborEntries: LaborEntry[];
  attachments: Attachment[];
};

function toLocationName(record: Record<string, unknown>, primary: string, secondary: string): string | null {
  return (record[primary] as string | null | undefined) ?? (record[secondary] as string | null | undefined) ?? null;
}

function normalizeTechnicianName(row: Record<string, unknown>): string {
  return (
    (row.technician_name as string | null | undefined) ??
    (row.name as string | null | undefined) ??
    "Technician"
  );
}

export async function getTechnicianExecutionPayload(
  workOrderId: string,
  options?: { supabase?: SupabaseClient; requireAssignedAccess?: boolean }
): Promise<TechnicianExecutionPayload> {
  const supabase = options?.supabase ?? ((await createClient()) as unknown as SupabaseClient);
  const requireAssignedAccess = options?.requireAssignedAccess ?? true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized.");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership?.tenant_id) throw new Error("Tenant membership not found.");

  const workOrderWithSafety = await supabase
    .from("work_orders")
    .select(WORK_ORDER_SELECT_WITH_SAFETY)
    .eq("id", workOrderId)
    .maybeSingle();
  const workOrderLegacy =
    workOrderWithSafety.error &&
    workOrderWithSafety.error.message.toLowerCase().includes("safety_notes")
      ? await supabase
          .from("work_orders")
          .select(WORK_ORDER_SELECT_LEGACY)
          .eq("id", workOrderId)
          .maybeSingle()
      : null;
  const workOrderError =
    workOrderLegacy != null ? workOrderLegacy.error : workOrderWithSafety.error;
  if (workOrderError) {
    throw new Error(workOrderError.message);
  }
  const workOrderRaw = workOrderLegacy?.data ?? workOrderWithSafety.data ?? null;
  if (!workOrderRaw) throw new Error("Work order not found.");

  const companyId = (workOrderRaw as { company_id?: string | null }).company_id ?? null;
  if (!companyId) throw new Error("Work order company is missing.");
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("tenant_id", membership.tenant_id)
    .maybeSingle();
  if (!company) throw new Error("Unauthorized.");

  const [techniciansRaw, notesRaw, checklistItemsRaw, partUsageRaw, inventoryItemsRaw, attachmentsRaw, laborEntriesRaw, activityRaw] =
    await Promise.all([
      supabase
        .from("technicians")
        .select("id, technician_name, name, email")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("technician_name"),
      supabase
        .from("work_order_notes")
        .select("id, body, note_type, created_at, technician_id")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("work_order_checklist_items")
        .select("id, label, completed, sort_order")
        .eq("work_order_id", workOrderId)
        .order("sort_order"),
      supabase
        .from("work_order_part_usage")
        .select(
          "id, quantity_used, unit_cost, total_cost, created_at, part_name_snapshot, sku_snapshot, unit_of_measure, used_at"
        )
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory_items")
        .select("id, name, sku, unit, cost, quantity")
        .eq("company_id", companyId)
        .order("name"),
      supabase
        .from("work_order_attachments")
        .select("id, file_name, file_url, file_type, caption, technician_id, created_at")
        .eq("work_order_id", workOrderId)
        .order("created_at", { ascending: false }),
      supabase
        .from("work_order_labor_entries")
        .select("id, technician_id, started_at, ended_at, duration_minutes, is_active, created_at")
        .eq("work_order_id", workOrderId)
        .order("started_at", { ascending: false }),
      supabase
        .from("activity_logs")
        .select("id, action_type, performed_at, metadata")
        .eq("entity_type", "work_order")
        .eq("entity_id", workOrderId)
        .in("action_type", [
          "work_order_created",
          "work_order_assigned",
          "dispatch_reassigned",
          "dispatch_rescheduled",
          "dispatch_unscheduled",
          "work_order_scheduled",
          "work_order_status_changed",
          "job_started",
          "job_paused",
          "job_completed",
          "work_order_photo_uploaded",
          "work_order_note_added",
          "work_order_checklist_toggled",
          "work_order_checklist_item_added",
          "work_order_part_added",
          "labor_logged",
          "completion_notes_added",
          "work_order_completed",
        ])
        .order("performed_at", { ascending: false })
        .limit(120),
    ]);

  const technicians = (techniciansRaw.data ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: normalizeTechnicianName(row as Record<string, unknown>),
    email: ((row as { email?: string | null }).email ?? "").toLowerCase(),
  })) as TechnicianOption[];
  const currentTechnician =
    technicians.find((technician) => technician.email === (user.email ?? "").toLowerCase()) ?? null;

  const assignedTechnicianId =
    (workOrderRaw as { assigned_technician_id?: string | null }).assigned_technician_id ?? null;
  const assignedCrewId = (workOrderRaw as { assigned_crew_id?: string | null }).assigned_crew_id ?? null;

  const { data: currentCrewRows } =
    currentTechnician && (assignedCrewId || requireAssignedAccess)
      ? await supabase
          .from("crew_members")
          .select("crew_id")
          .eq("technician_id", currentTechnician.id)
      : { data: [] as unknown[] };
  const currentCrewIds = (currentCrewRows ?? []).map((row) => (row as { crew_id: string }).crew_id);

  if (requireAssignedAccess) {
    const hasAssignmentTarget = Boolean(assignedTechnicianId || assignedCrewId);
    const hasAccess =
      Boolean(
        currentTechnician &&
          (assignedTechnicianId === currentTechnician.id ||
            (assignedCrewId && currentCrewIds.includes(assignedCrewId)))
      ) || !hasAssignmentTarget;
    if (!hasAccess) throw new Error("Unauthorized.");
  }

  const pmPlanId =
    (workOrderRaw as { preventive_maintenance_plan_id?: string | null }).preventive_maintenance_plan_id ??
    null;
  const planWithSafety = pmPlanId
    ? await supabase
        .from("preventive_maintenance_plans")
        .select("instructions, safety_notes")
        .eq("id", pmPlanId)
        .maybeSingle()
    : { data: null, error: null };
  const planLegacy =
    pmPlanId &&
    planWithSafety.error &&
    planWithSafety.error.message.toLowerCase().includes("safety_notes")
      ? await supabase
          .from("preventive_maintenance_plans")
          .select("instructions")
          .eq("id", pmPlanId)
          .maybeSingle()
      : null;
  const planError = planLegacy != null ? planLegacy.error : planWithSafety.error;
  if (planError) throw new Error(planError.message);
  const planRow = planLegacy?.data ?? planWithSafety.data ?? null;

  const workOrderRecord = workOrderRaw as Record<string, unknown>;
  const joinedAsset = workOrderRecord.assets as unknown;
  const joinedProperty = workOrderRecord.properties as unknown;
  const joinedBuilding = workOrderRecord.buildings as unknown;
  const joinedUnit = workOrderRecord.units as unknown;
  const joinedTechnician = workOrderRecord.technicians as unknown;
  const joinedCrew = workOrderRecord.crews as unknown;

  const asset = Array.isArray(joinedAsset) ? joinedAsset[0] : joinedAsset;
  const assetId =
    asset && typeof asset === "object" ? ((asset as { id?: string | null }).id ?? null) : null;
  const { data: recurringInsightRows } = assetId
    ? await supabase
        .from("asset_insights")
        .select("id, pattern_type, frequency, severity, recommendation")
        .eq("asset_id", assetId)
        .eq("is_active", true)
        .order("detected_at", { ascending: false })
        .limit(3)
    : { data: [] as unknown[] };

  const property = Array.isArray(joinedProperty) ? joinedProperty[0] : joinedProperty;
  const building = Array.isArray(joinedBuilding) ? joinedBuilding[0] : joinedBuilding;
  const unit = Array.isArray(joinedUnit) ? joinedUnit[0] : joinedUnit;
  const technician = Array.isArray(joinedTechnician) ? joinedTechnician[0] : joinedTechnician;
  const crew = Array.isArray(joinedCrew) ? joinedCrew[0] : joinedCrew;

  const locationSegments = [
    property && typeof property === "object"
      ? toLocationName(property as Record<string, unknown>, "property_name", "name")
      : null,
    building && typeof building === "object"
      ? toLocationName(building as Record<string, unknown>, "building_name", "name")
      : null,
    unit && typeof unit === "object"
      ? toLocationName(unit as Record<string, unknown>, "unit_name", "name_or_number")
      : null,
  ].filter(Boolean) as string[];

  const checklistItems = (checklistItemsRaw.data ?? []) as ChecklistItem[];
  const completedChecklistCount = checklistItems.filter((item) => item.completed).length;
  const checklistProgress = {
    total: checklistItems.length,
    completed: completedChecklistCount,
    percent:
      checklistItems.length === 0
        ? 0
        : Math.round((completedChecklistCount / checklistItems.length) * 100),
    remaining: Math.max(0, checklistItems.length - completedChecklistCount),
  };

  const workOrder: TechnicianExecutionWorkOrder = {
    id: (workOrderRaw as { id: string }).id,
    company_id: companyId,
    work_order_number: (workOrderRaw as { work_order_number?: string | null }).work_order_number ?? null,
    title: (workOrderRaw as { title?: string | null }).title ?? "Work order",
    status: (workOrderRaw as { status?: string | null }).status ?? "new",
    priority: (workOrderRaw as { priority?: string | null }).priority ?? "medium",
    category: (workOrderRaw as { category?: string | null }).category ?? null,
    source_type: (workOrderRaw as { source_type?: string | null }).source_type ?? null,
    due_date: (workOrderRaw as { due_date?: string | null }).due_date ?? null,
    description: (workOrderRaw as { description?: string | null }).description ?? null,
    instructions:
      ((planRow as { instructions?: string | null } | null)?.instructions as string | null | undefined) ??
      null,
    safety_notes:
      ((workOrderRaw as { safety_notes?: string | null }).safety_notes ??
        (planRow as { safety_notes?: string | null } | null)?.safety_notes ??
        null),
    assigned_technician_id: assignedTechnicianId,
    assigned_technician_name:
      technician && typeof technician === "object"
        ? normalizeTechnicianName(technician as Record<string, unknown>)
        : null,
    assigned_crew_id: assignedCrewId,
    assigned_crew_name:
      crew && typeof crew === "object" ? ((crew as { name?: string | null }).name ?? null) : null,
    estimated_hours: (workOrderRaw as { estimated_hours?: number | null }).estimated_hours ?? null,
    started_at: (workOrderRaw as { started_at?: string | null }).started_at ?? null,
    last_paused_at: (workOrderRaw as { last_paused_at?: string | null }).last_paused_at ?? null,
    scheduled_start:
      (workOrderRaw as { scheduled_start?: string | null }).scheduled_start ?? null,
    scheduled_end: (workOrderRaw as { scheduled_end?: string | null }).scheduled_end ?? null,
    location: locationSegments.join(" / ") || null,
    location_segments: locationSegments,
    asset_id: assetId,
    asset_name:
      asset && typeof asset === "object"
        ? (((asset as { asset_name?: string | null }).asset_name ??
            (asset as { name?: string | null }).name ??
            null) as string | null)
        : null,
    technician_id_for_actor: currentTechnician?.id ?? null,
    notesTimeline: (notesRaw.data ?? []) as TimelineNote[],
    activityTimeline: (activityRaw.data ?? []) as TimelineEvent[],
    asset_context: {
      id: assetId,
      name:
        asset && typeof asset === "object"
          ? (((asset as { asset_name?: string | null }).asset_name ??
              (asset as { name?: string | null }).name ??
              null) as string | null)
          : null,
      asset_type:
        asset && typeof asset === "object"
          ? (((asset as { asset_type?: string | null }).asset_type ??
              (asset as { category?: string | null }).category ??
              null) as string | null)
          : null,
      health_score:
        asset && typeof asset === "object"
          ? (((asset as { health_score?: number | null }).health_score ?? null) as number | null)
          : null,
      failure_risk:
        asset && typeof asset === "object"
          ? (((asset as { failure_risk?: number | null }).failure_risk ?? null) as number | null)
          : null,
      last_maintenance_at:
        asset && typeof asset === "object"
          ? (((asset as { last_serviced_at?: string | null }).last_serviced_at ?? null) as
              | string
              | null)
          : null,
      recurring_issues: (recurringInsightRows ?? []).map((row) => ({
        id: (row as { id: string }).id,
        pattern_type: (row as { pattern_type?: string | null }).pattern_type ?? "recurring_issue",
        frequency: Number((row as { frequency?: number | null }).frequency ?? 0),
        severity:
          ((row as { severity?: AssetInsightSeverity | null }).severity as AssetInsightSeverity | null) ??
          "medium",
        recommendation: (row as { recommendation?: string | null }).recommendation ?? "",
      })),
    },
    checklist_progress: checklistProgress,
  };

  return {
    workOrder,
    checklistItems,
    partUsage: (partUsageRaw.data ?? []) as PartUsage[],
    inventoryItems: (inventoryItemsRaw.data ?? []) as InventoryItem[],
    technicians: technicians.map((technician) => ({ id: technician.id, name: technician.name })),
    laborEntries: (laborEntriesRaw.data ?? []) as LaborEntry[],
    attachments: (attachmentsRaw.data ?? []) as Attachment[],
  };
}
