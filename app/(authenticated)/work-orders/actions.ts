"use server";

import { createClient } from "@/src/lib/supabase/server";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { validateLocationHierarchy } from "@/src/lib/location-hierarchy";
import {
  calculateNextRunDateAfterExecution,
  formatDateOnly,
  type PreventiveMaintenanceFrequencyType,
} from "@/src/lib/preventive-maintenance/schedule";
import { revalidatePath } from "next/cache";

export type WorkOrderFormState = { error?: string; success?: boolean };

const LEGACY_STATUS_MAP: Record<string, string> = {
  open: "new",
  assigned: "ready_to_schedule",
  closed: "completed",
};

const ALL_SUPPORTED_STATUSES = [
  "draft",
  "open",
  "assigned",
  "closed",
  "new",
  "ready_to_schedule",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "closed"]);

const TRANSITIONS: Record<string, ReadonlySet<string>> = {
  draft: new Set(["new", "cancelled"]),
  new: new Set(["ready_to_schedule", "scheduled", "in_progress", "on_hold", "cancelled"]),
  ready_to_schedule: new Set(["new", "scheduled", "in_progress", "on_hold", "cancelled"]),
  scheduled: new Set(["ready_to_schedule", "in_progress", "on_hold", "cancelled"]),
  in_progress: new Set(["on_hold", "completed", "cancelled"]),
  on_hold: new Set(["ready_to_schedule", "scheduled", "in_progress", "cancelled"]),
  completed: new Set(["completed"]),
  cancelled: new Set(["cancelled"]),
};

function normalizeStatus(input: string | null | undefined): string {
  const value = (input ?? "").trim();
  if (!value) return "new";
  return LEGACY_STATUS_MAP[value] ?? value;
}

function toComparableStatus(input: string | null | undefined): string {
  const value = normalizeStatus(input);
  return value === "draft" ? "new" : value;
}

function canTransitionStatus(currentRaw: string | null | undefined, targetRaw: string): boolean {
  const current = toComparableStatus(currentRaw);
  const target = toComparableStatus(targetRaw);
  const allowed = TRANSITIONS[current] ?? new Set();
  return allowed.has(target);
}

function isSupportedStatus(input: string | null | undefined): boolean {
  if (!input) return false;
  return (ALL_SUPPORTED_STATUSES as readonly string[]).includes(input);
}

async function getTenantId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  return data?.tenant_id ?? null;
}

async function getActorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function companyBelongsToTenant(companyId: string, tenantId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return !!data;
}

async function generateWorkOrderNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string
): Promise<string> {
  const { data: rows } = await supabase
    .from("work_orders")
    .select("work_order_number")
    .eq("company_id", companyId)
    .not("work_order_number", "is", null);
  const numbers = (rows ?? [])
    .map((r) => {
      const n = (r as { work_order_number?: string }).work_order_number;
      if (!n || !/^WO-(\d+)$/i.test(n)) return 0;
      return parseInt(n.replace(/^WO-/i, ""), 10);
    })
    .filter((n) => n > 0);
  const next = numbers.length ? Math.max(...numbers) + 1 : 1001;
  return `WO-${next}`;
}

export async function saveWorkOrder(
  _prev: WorkOrderFormState,
  formData: FormData
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();

  if (!title) return { error: "Title is required." };
  if (!companyId) return { error: "Company is required." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  const propertyId = (formData.get("property_id") as string)?.trim() || null;
  const buildingId = (formData.get("building_id") as string)?.trim() || null;
  const unitId = (formData.get("unit_id") as string)?.trim() || null;
  const assetId = (formData.get("asset_id") as string)?.trim() || null;
  const customerIdForm = (formData.get("customer_id") as string)?.trim() || null;

  const supabase = await createClient();
  if (customerIdForm) {
    const { data: cust } = await supabase
      .from("customers")
      .select("id, company_id")
      .eq("id", customerIdForm)
      .maybeSingle();
    if (!cust) return { error: "Selected customer was not found." };
    if ((cust as { company_id: string }).company_id !== companyId)
      return { error: "Selected customer does not belong to the selected company." };
  }

  const hierarchyError = await validateLocationHierarchy(supabase, {
    companyId,
    propertyId,
    buildingId,
    unitId,
  });
  if (hierarchyError) return { error: hierarchyError };
  if (assetId) {
    const { data: ast } = await supabase
      .from("assets")
      .select("id, company_id, property_id, building_id, unit_id")
      .eq("id", assetId)
      .maybeSingle();
    if (!ast) return { error: "Selected asset was not found." };
    if (ast.company_id !== companyId) return { error: "Selected asset does not belong to the selected company." };
    if (propertyId && ast.property_id !== null && ast.property_id !== propertyId)
      return { error: "Selected asset does not match the selected property." };
    if (buildingId && ast.building_id !== null && ast.building_id !== buildingId)
      return { error: "Selected asset does not match the selected building." };
    if (unitId && ast.unit_id !== null && ast.unit_id !== unitId)
      return { error: "Selected asset does not match the selected unit." };
  }
  const assignedTechnicianId = (formData.get("assigned_technician_id") as string)?.trim() || null;
  const assignedCrewId = (formData.get("assigned_crew_id") as string)?.trim() || null;
  const dueDateRaw = (formData.get("due_date") as string)?.trim();
  const priority = (formData.get("priority") as string)?.trim();
  const status = (formData.get("status") as string)?.trim();
  const categoryRaw = (formData.get("category") as string)?.trim() || null;
  const validCategory = [
    "repair",
    "preventive_maintenance",
    "inspection",
    "installation",
    "emergency",
    "general",
  ].includes(categoryRaw ?? "")
    ? categoryRaw
    : null;
  const validPriority = ["low", "medium", "high", "urgent", "emergency"].includes(priority ?? "")
    ? priority
    : "medium";
  const validStatus = isSupportedStatus(status ?? "") ? normalizeStatus(status) : "new";
  if (validStatus === "completed") {
    return { error: "Use Complete Work Order to mark work orders as completed." };
  }

  const requestedAtRaw = (formData.get("requested_at") as string)?.trim() || null;
  const scheduledDateRaw = (formData.get("scheduled_date") as string)?.trim() || null;
  const scheduledStartRaw = (formData.get("scheduled_start") as string)?.trim() || null;
  const scheduledEndRaw = (formData.get("scheduled_end") as string)?.trim() || null;
  const estimatedHoursRaw = (formData.get("estimated_hours") as string)?.trim();
  const estimatedTechniciansRaw = (formData.get("estimated_technicians") as string)?.trim();
  const nteAmountRaw = (formData.get("nte_amount") as string)?.trim();
  const billable = formData.get("billable") !== null && formData.get("billable") !== "off";
  const actorId = await getActorId(supabase);

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    company_id: companyId,
    customer_id: customerIdForm || null,
    property_id: propertyId || null,
    building_id: buildingId || null,
    unit_id: unitId || null,
    asset_id: assetId || null,
    title,
    description: (formData.get("description") as string)?.trim() || null,
    category: validCategory,
    priority: validPriority,
    status: validStatus,
    requested_by_name: (formData.get("requested_by_name") as string)?.trim() || null,
    requested_by_email: (formData.get("requested_by_email") as string)?.trim() || null,
    requested_by_phone: (formData.get("requested_by_phone") as string)?.trim() || null,
    requested_at: requestedAtRaw ? new Date(requestedAtRaw).toISOString() : null,
    scheduled_date: scheduledDateRaw || null,
    scheduled_start: scheduledStartRaw ? new Date(scheduledStartRaw).toISOString() : null,
    scheduled_end: scheduledEndRaw ? new Date(scheduledEndRaw).toISOString() : null,
    due_date: dueDateRaw || null,
    assigned_technician_id: assignedTechnicianId,
    assigned_crew_id: assignedCrewId || null,
    estimated_hours: estimatedHoursRaw ? parseFloat(estimatedHoursRaw) : null,
    estimated_technicians: estimatedTechniciansRaw ? parseInt(estimatedTechniciansRaw, 10) : null,
    billable,
    nte_amount: nteAmountRaw ? parseFloat(nteAmountRaw) : null,
  };
  payload.created_by_user_id = actorId;

  const scheduleExists = Boolean(
    payload.scheduled_date || payload.scheduled_start || payload.scheduled_end
  );
  const assignmentExists = Boolean(payload.assigned_technician_id || payload.assigned_crew_id);
  if (validStatus === "new" && (scheduleExists || assignmentExists)) {
    payload.status = scheduleExists ? "scheduled" : "ready_to_schedule";
  }

  if (id) {
    const { data: row } = await supabase
      .from("work_orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!row) return { error: "Work order not found." };
    const allowedUpdate = await companyBelongsToTenant(
      (row as { company_id: string }).company_id,
      tenantId
    );
    if (!allowedUpdate) return { error: "Unauthorized." };
    const beforeState = row as Record<string, unknown>;
    const { data: updated, error } = await supabase
      .from("work_orders")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { error: error.message };

    const afterState = (updated as Record<string, unknown>) ?? {};
    await insertActivityLog(supabase, {
      tenantId,
      companyId: (afterState.company_id as string) ?? companyId,
      entityType: "work_order",
      entityId: id,
      actionType: "work_order_edited",
      performedBy: actorId,
      beforeState,
      afterState,
      metadata: { source: "saveWorkOrder" },
    });

    if (
      toComparableStatus(beforeState.status as string | null) !==
      toComparableStatus(afterState.status as string | null)
    ) {
      await insertActivityLog(supabase, {
        tenantId,
        companyId: (afterState.company_id as string) ?? companyId,
        entityType: "work_order",
        entityId: id,
        actionType: "work_order_status_changed",
        performedBy: actorId,
        beforeState: { status: beforeState.status as string | null },
        afterState: { status: afterState.status as string | null },
        metadata: { source: "saveWorkOrder" },
      });
    }
  } else {
    const workOrderNumber =
      (formData.get("work_order_number") as string)?.trim() ||
      (await generateWorkOrderNumber(supabase, companyId));
    (payload as Record<string, unknown>).work_order_number = workOrderNumber || null;
    (payload as Record<string, unknown>).created_by_user_id = actorId;
    const { data: inserted, error } = await supabase
      .from("work_orders")
      .insert(payload)
      .select("*")
      .single();
    if (error) return { error: error.message };

    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: (inserted as { id: string }).id,
      actionType: "work_order_created",
      performedBy: actorId,
      afterState: inserted as Record<string, unknown>,
      metadata: { source: "saveWorkOrder" },
    });
  }
  revalidatePath("/work-orders");
  revalidatePath("/dispatch");
  return { success: true };
}

export async function deleteWorkOrder(id: string): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/work-orders");
  return { success: true };
}

export async function updateWorkOrderStatus(
  id: string,
  newStatus: string
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };
  if (!isSupportedStatus(newStatus)) return { error: "Invalid status." };
  const normalizedStatus = normalizeStatus(newStatus);
  if (normalizedStatus === "completed") {
    return { error: "Use Complete Work Order to mark work orders as completed." };
  }

  const supabase = await createClient();
  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const beforeState = row as Record<string, unknown>;
  const allowed = await companyBelongsToTenant(
    (beforeState.company_id as string) ?? "",
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };
  const currentStatus = String(beforeState.status ?? "");
  if (TERMINAL_STATUSES.has(currentStatus)) {
    return { error: "Cannot change status for completed or cancelled work orders." };
  }
  if (!canTransitionStatus(currentStatus, normalizedStatus)) {
    return {
      error: `Invalid lifecycle transition from ${toComparableStatus(
        currentStatus
      )} to ${toComparableStatus(normalizedStatus)}.`,
    };
  }

  const updatePayload: Record<string, unknown> = {
    status: normalizedStatus,
    created_by_user_id: actorId,
  };
  if (normalizedStatus === "in_progress" && !beforeState.started_at) {
    updatePayload.started_at = new Date().toISOString();
  }
  if (normalizedStatus === "on_hold") {
    updatePayload.last_paused_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from("work_orders")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  const afterState = (updated as Record<string, unknown>) ?? {};
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (afterState.company_id as string) ?? (beforeState.company_id as string),
    entityType: "work_order",
    entityId: id,
    actionType: "work_order_status_changed",
    performedBy: actorId,
    beforeState: { status: beforeState.status as string | null },
    afterState: { status: afterState.status as string | null },
    metadata: { source: "updateWorkOrderStatus" },
  });
  if (
    toComparableStatus(beforeState.status as string | null) !== "in_progress" &&
    toComparableStatus(normalizedStatus) === "in_progress"
  ) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId: (afterState.company_id as string) ?? (beforeState.company_id as string),
      entityType: "work_order",
      entityId: id,
      actionType: "job_started",
      performedBy: actorId,
      metadata: {
        started_at:
          (afterState.started_at as string | null) ?? new Date().toISOString(),
      },
    });
  }
  if (toComparableStatus(normalizedStatus) === "on_hold") {
    await insertActivityLog(supabase, {
      tenantId,
      companyId: (afterState.company_id as string) ?? (beforeState.company_id as string),
      entityType: "work_order",
      entityId: id,
      actionType: "job_paused",
      performedBy: actorId,
      metadata: {
        paused_at:
          (afterState.last_paused_at as string | null) ?? new Date().toISOString(),
      },
    });
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/dispatch");
  return { success: true };
}

export type WorkOrderAssignmentPayload = {
  assigned_technician_id: string | null;
  assigned_crew_id: string | null;
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
};

export async function updateWorkOrderAssignment(
  id: string,
  payload: WorkOrderAssignmentPayload
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const supabase = await createClient();
  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const beforeState = row as Record<string, unknown>;
  const allowed = await companyBelongsToTenant(
    (beforeState.company_id as string) ?? "",
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };

  const status = String(beforeState.status ?? "");
  if (TERMINAL_STATUSES.has(status))
    return { error: "Cannot change assignment on completed or cancelled work orders." };

  const nextTechnicianId = payload.assigned_technician_id || null;
  const nextCrewId = payload.assigned_crew_id || null;
  const nextScheduledDate =
    payload.scheduled_date !== undefined
      ? payload.scheduled_date || null
      : ((beforeState.scheduled_date as string | null) ?? null);
  const nextScheduledStart =
    payload.scheduled_start !== undefined
      ? payload.scheduled_start
        ? new Date(payload.scheduled_start).toISOString()
        : null
      : ((beforeState.scheduled_start as string | null) ?? null);
  const nextScheduledEnd =
    payload.scheduled_end !== undefined
      ? payload.scheduled_end
        ? new Date(payload.scheduled_end).toISOString()
        : null
      : ((beforeState.scheduled_end as string | null) ?? null);

  const hasSchedule = Boolean(nextScheduledDate || nextScheduledStart || nextScheduledEnd);
  const hasAssignment = Boolean(nextTechnicianId || nextCrewId);
  const statusComparable = toComparableStatus(status);
  let nextStatus = normalizeStatus(status);
  if (["new", "ready_to_schedule", "scheduled", "draft"].includes(statusComparable)) {
    if (hasSchedule && hasAssignment) nextStatus = "scheduled";
    else nextStatus = "ready_to_schedule";
  }

  const update: Record<string, unknown> = {
    assigned_technician_id: nextTechnicianId,
    assigned_crew_id: nextCrewId,
    status: nextStatus,
    created_by_user_id: actorId,
  };
  update.scheduled_date = nextScheduledDate;
  update.scheduled_start = nextScheduledStart;
  update.scheduled_end = nextScheduledEnd;

  const { data: updated, error } = await supabase
    .from("work_orders")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  const afterState = (updated as Record<string, unknown>) ?? {};
  const beforeHadAssignment = Boolean(
    beforeState.assigned_technician_id || beforeState.assigned_crew_id
  );
  const beforeHadSchedule = Boolean(
    beforeState.scheduled_date || beforeState.scheduled_start || beforeState.scheduled_end
  );
  const assignmentChanged =
    (beforeState.assigned_technician_id as string | null) !== nextTechnicianId ||
    (beforeState.assigned_crew_id as string | null) !== nextCrewId;
  const scheduleChanged =
    (beforeState.scheduled_date as string | null) !== nextScheduledDate ||
    (beforeState.scheduled_start as string | null) !== nextScheduledStart ||
    (beforeState.scheduled_end as string | null) !== nextScheduledEnd;
  const statusChanged =
    toComparableStatus(beforeState.status as string | null) !==
    toComparableStatus(afterState.status as string | null);

  const companyId = (afterState.company_id as string) ?? (beforeState.company_id as string);
  if (assignmentChanged && hasAssignment) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: beforeHadAssignment ? "dispatch_reassigned" : "work_order_assigned",
      performedBy: actorId,
      beforeState: {
        assigned_technician_id: beforeState.assigned_technician_id as string | null,
        assigned_crew_id: beforeState.assigned_crew_id as string | null,
      },
      afterState: {
        assigned_technician_id: nextTechnicianId,
        assigned_crew_id: nextCrewId,
      },
      metadata: { source: "updateWorkOrderAssignment" },
    });
  }
  if (scheduleChanged && hasSchedule) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: beforeHadSchedule ? "dispatch_rescheduled" : "work_order_scheduled",
      performedBy: actorId,
      beforeState: {
        scheduled_date: beforeState.scheduled_date as string | null,
        scheduled_start: beforeState.scheduled_start as string | null,
        scheduled_end: beforeState.scheduled_end as string | null,
      },
      afterState: {
        scheduled_date: nextScheduledDate,
        scheduled_start: nextScheduledStart,
        scheduled_end: nextScheduledEnd,
      },
      metadata: { source: "updateWorkOrderAssignment" },
    });
  }
  if (!hasSchedule && !hasAssignment && (beforeHadSchedule || beforeHadAssignment)) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: "dispatch_unscheduled",
      performedBy: actorId,
      beforeState: {
        assigned_technician_id: beforeState.assigned_technician_id as string | null,
        assigned_crew_id: beforeState.assigned_crew_id as string | null,
        scheduled_date: beforeState.scheduled_date as string | null,
        scheduled_start: beforeState.scheduled_start as string | null,
        scheduled_end: beforeState.scheduled_end as string | null,
      },
      afterState: {
        assigned_technician_id: null,
        assigned_crew_id: null,
        scheduled_date: null,
        scheduled_start: null,
        scheduled_end: null,
      },
      metadata: { source: "updateWorkOrderAssignment" },
    });
  }
  if (statusChanged) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: "work_order_status_changed",
      performedBy: actorId,
      beforeState: { status: beforeState.status as string | null },
      afterState: { status: afterState.status as string | null },
      metadata: { source: "updateWorkOrderAssignment" },
    });
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/dispatch");
  return { success: true };
}

export type WorkOrderCompletionPayload = {
  completed_at?: string | null;
  completion_date?: string | null;
  resolution_summary: string;
  completion_notes?: string | null;
  parts_used_summary?: string | null;
  root_cause?: string | null;
  actual_hours?: number | null;
  follow_up_required?: boolean;
  customer_visible_summary?: string | null;
  internal_completion_notes?: string | null;
  completed_by_technician_id?: string | null;
  completion_status?: string | null;
};

const VALID_COMPLETION_STATUSES = ["successful", "partially_completed", "deferred", "unable_to_complete"] as const;

export async function completeWorkOrder(
  id: string,
  payload: WorkOrderCompletionPayload
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const resolutionSummary = (payload.resolution_summary ?? "").trim();
  if (!resolutionSummary) return { error: "Resolution summary is required." };

  const supabase = await createClient();
  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const beforeState = row as Record<string, unknown>;
  const allowed = await companyBelongsToTenant(
    (beforeState.company_id as string) ?? "",
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };
  if (String(beforeState.status ?? "") === "cancelled") {
    return { error: "Cancelled work orders cannot be completed." };
  }
  if (!beforeState.started_at) {
    return { error: "Work order must be started before it can be completed." };
  }

  const completedAt = payload.completed_at
    ? new Date(payload.completed_at).toISOString()
    : new Date().toISOString();
  const completionDate =
    payload.completion_date ?? completedAt.slice(0, 10);
  const completionStatus =
    payload.completion_status && VALID_COMPLETION_STATUSES.includes(payload.completion_status as (typeof VALID_COMPLETION_STATUSES)[number])
      ? payload.completion_status
      : "successful";
  const completionNotes = (payload.completion_notes ?? "").trim() || null;
  const partsUsedSummary = (payload.parts_used_summary ?? "").trim() || null;

  const update: Record<string, unknown> = {
    status: "completed",
    created_by_user_id: actorId,
    completed_at: completedAt,
    completion_date: completionDate || null,
    resolution_summary: resolutionSummary,
    completion_notes: completionNotes,
    root_cause: (payload.root_cause ?? "").trim() || null,
    actual_hours: payload.actual_hours ?? null,
    follow_up_required: payload.follow_up_required ?? false,
    customer_visible_summary: (payload.customer_visible_summary ?? "").trim() || null,
    internal_completion_notes: (payload.internal_completion_notes ?? "").trim() || null,
    completed_by_technician_id: payload.completed_by_technician_id || null,
    completion_status: completionStatus,
  };

  const { data: updated, error } = await supabase
    .from("work_orders")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  const afterState = (updated as Record<string, unknown>) ?? {};
  const companyId =
    (afterState.company_id as string) ?? (beforeState.company_id as string);
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: id,
    actionType: "work_order_completed",
    performedBy: actorId,
    beforeState,
    afterState,
    metadata: { source: "completeWorkOrder" },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: id,
    actionType: "job_completed",
    performedBy: actorId,
    metadata: {
      completed_at: completedAt,
      actual_hours: payload.actual_hours ?? null,
      completion_status: completionStatus,
    },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: id,
    actionType: "work_order_status_changed",
    performedBy: actorId,
    beforeState: { status: beforeState.status as string | null },
    afterState: { status: "completed" },
    metadata: { source: "completeWorkOrder" },
  });
  if (completionNotes || partsUsedSummary) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: "completion_notes_added",
      performedBy: actorId,
      metadata: {
        completion_notes: completionNotes,
        parts_used_summary: partsUsedSummary,
      },
    });
  }
  if (partsUsedSummary) {
    const { error: completionNoteError } = await supabase.from("work_order_notes").insert({
      work_order_id: id,
      body: `Parts used: ${partsUsedSummary}`,
      note_type: "completion",
      created_by_id: actorId,
    });
    if (completionNoteError) return { error: completionNoteError.message };
  }

  const assetId = (afterState.asset_id as string | null) ?? null;
  if (assetId) {
    const { error: assetUpdateError } = await supabase
      .from("assets")
      .update({
        last_serviced_at: completedAt,
        last_service_work_order_id: id,
      })
      .eq("id", assetId);
    if (assetUpdateError) return { error: assetUpdateError.message };

    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "asset",
      entityId: assetId,
      actionType: "asset_service_history_added",
      performedBy: actorId,
      metadata: {
        work_order_id: id,
        work_order_number: afterState.work_order_number as string | null,
        source_type: afterState.source_type as string | null,
      },
      afterState: {
        last_serviced_at: completedAt,
        last_service_work_order_id: id,
      },
    });
  }

  const sourceType = (afterState.source_type as string | null) ?? null;
  const pmPlanId = (afterState.preventive_maintenance_plan_id as string | null) ?? null;
  const pmRunId = (afterState.preventive_maintenance_run_id as string | null) ?? null;
  if (sourceType === "preventive_maintenance" && pmPlanId) {
    const { data: planRow } = await supabase
      .from("preventive_maintenance_plans")
      .select("id, frequency_type, frequency_interval, next_run_date")
      .eq("id", pmPlanId)
      .maybeSingle();
    if (planRow) {
      const plan = planRow as {
        id: string;
        frequency_type: PreventiveMaintenanceFrequencyType;
        frequency_interval: number;
        next_run_date: string;
      };
      const completionDateOnly = formatDateOnly(completionDate);
      const nextRunDate = calculateNextRunDateAfterExecution({
        frequencyType: plan.frequency_type,
        frequencyInterval: Number(plan.frequency_interval ?? 1),
        currentNextRunDate: plan.next_run_date ?? completionDateOnly,
        executedOn: completionDateOnly,
      });
      const { error: planUpdateError } = await supabase
        .from("preventive_maintenance_plans")
        .update({
          last_run_date: completionDateOnly,
          next_run_date: nextRunDate,
        })
        .eq("id", pmPlanId);
      if (planUpdateError) return { error: planUpdateError.message };

      await insertActivityLog(supabase, {
        tenantId,
        companyId,
        entityType: "preventive_maintenance_plan",
        entityId: pmPlanId,
        actionType: "pm_work_order_completed",
        performedBy: actorId,
        metadata: {
          work_order_id: id,
          preventive_maintenance_run_id: pmRunId,
        },
        afterState: {
          last_run_date: completionDateOnly,
          next_run_date: nextRunDate,
        },
      });
    }

    if (pmRunId) {
      await insertActivityLog(supabase, {
        tenantId,
        companyId,
        entityType: "preventive_maintenance_run",
        entityId: pmRunId,
        actionType: "pm_work_order_completed",
        performedBy: actorId,
        metadata: { work_order_id: id, preventive_maintenance_plan_id: pmPlanId },
      });
    }
    revalidatePath("/preventive-maintenance");
    revalidatePath(`/preventive-maintenance/${pmPlanId}`);
  }

  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/dispatch");
  if (assetId) {
    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
  }
  return { success: true };
}

export async function addWorkOrderNote(
  workOrderId: string,
  body: string,
  noteType: "internal" | "customer_visible" | "completion" = "internal"
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("work_order_notes").insert({
    work_order_id: workOrderId,
    body: body.trim(),
    note_type: noteType,
    created_by_id: user?.id ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${workOrderId}`);
  return { success: true };
}

export async function toggleWorkOrderChecklistItem(
  itemId: string,
  completed: boolean
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("work_order_checklist_items")
    .select("work_order_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "Checklist item not found." };
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", item.work_order_id)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(wo.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const { error } = await supabase
    .from("work_order_checklist_items")
    .update({ completed })
    .eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${item.work_order_id}`);
  return { success: true };
}

export async function addWorkOrderChecklistItem(
  workOrderId: string,
  label: string
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };
  const trimmed = (label ?? "").trim();
  if (!trimmed) return { error: "Label is required." };
  const supabase = await createClient();
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(wo.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const { data: maxSort } = await supabase
    .from("work_order_checklist_items")
    .select("sort_order")
    .eq("work_order_id", workOrderId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = maxSort != null ? (maxSort as { sort_order: number }).sort_order + 1 : 0;
  const { error } = await supabase.from("work_order_checklist_items").insert({
    work_order_id: workOrderId,
    label: trimmed,
    completed: false,
    sort_order: sortOrder,
  });
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${workOrderId}`);
  return { success: true };
}

export type AddPartUsagePayload = {
  inventory_item_id?: string | null;
  part_name_snapshot?: string | null;
  sku_snapshot?: string | null;
  unit_of_measure?: string | null;
  quantity_used: number;
  unit_cost: number | null;
  notes?: string | null;
  deduct_inventory?: boolean;
};

export async function addWorkOrderPartUsage(
  workOrderId: string,
  payload: AddPartUsagePayload
): Promise<WorkOrderFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };
  if (payload.quantity_used <= 0) return { error: "Quantity must be greater than zero." };

  const supabase = await createClient();
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id, status")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant((wo as { company_id: string }).company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const companyId = (wo as { company_id: string }).company_id;
  let unitCost = payload.unit_cost;
  let partName = payload.part_name_snapshot ?? null;
  let sku = payload.sku_snapshot ?? null;
  let unitOfMeasure = payload.unit_of_measure ?? null;

  if (payload.inventory_item_id) {
    const { data: item } = await supabase
      .from("inventory_items")
      .select("id, name, sku, unit, cost, quantity")
      .eq("id", payload.inventory_item_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!item) return { error: "Inventory item not found or access denied." };
    const inv = item as { name: string; sku?: string | null; unit?: string | null; cost?: number | null; quantity?: number };
    if (unitCost == null && inv.cost != null) unitCost = inv.cost;
    if (!partName) partName = inv.name;
    if (!sku) sku = inv.sku ?? null;
    if (!unitOfMeasure) unitOfMeasure = inv.unit ?? null;
    if (payload.deduct_inventory) {
      const onHand = Number(inv.quantity ?? 0);
      if (payload.quantity_used > onHand)
        return { error: `Not enough stock. Quantity on hand: ${onHand}. Requested: ${payload.quantity_used}.` };
    }
  }

  const finalUnitCost = unitCost ?? 0;
  const totalCost = payload.quantity_used * finalUnitCost;

  const { data: inserted, error: insertError } = await supabase
    .from("work_order_part_usage")
    .insert({
      work_order_id: workOrderId,
      inventory_item_id: payload.inventory_item_id || null,
      part_name_snapshot: partName,
      sku_snapshot: sku,
      unit_of_measure: unitOfMeasure,
      quantity_used: payload.quantity_used,
      unit_cost: finalUnitCost,
      total_cost: totalCost,
      notes: payload.notes || null,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!inserted?.id) return { error: "Failed to create part usage." };

  if (payload.inventory_item_id && payload.deduct_inventory) {
    const { data: invRow, error: invReadError } = await supabase
      .from("inventory_items")
      .select("quantity")
      .eq("id", payload.inventory_item_id)
      .maybeSingle();
    if (invReadError) {
      await supabase.from("work_order_part_usage").delete().eq("id", inserted.id);
      return { error: `Failed to read inventory: ${invReadError.message}` };
    }
    if (!invRow) {
      await supabase.from("work_order_part_usage").delete().eq("id", inserted.id);
      return { error: "Inventory item no longer found." };
    }
    const currentQty = Number((invRow as { quantity?: number })?.quantity ?? 0);
    const newQty = Math.max(0, currentQty - payload.quantity_used);
    const { error: updateError } = await supabase
      .from("inventory_items")
      .update({ quantity: newQty })
      .eq("id", payload.inventory_item_id);
    if (updateError) {
      await supabase.from("work_order_part_usage").delete().eq("id", inserted.id);
      return { error: `Failed to update inventory: ${updateError.message}` };
    }
    const { error: txError } = await supabase.from("inventory_transactions").insert({
      inventory_item_id: payload.inventory_item_id,
      quantity_delta: -payload.quantity_used,
      transaction_type: "issue",
      reference_type: "work_order_part_usage",
      reference_id: inserted.id,
      notes: payload.notes || `Work order ${workOrderId}`,
    });
    if (txError) {
      await supabase.from("inventory_items").update({ quantity: currentQty }).eq("id", payload.inventory_item_id);
      await supabase.from("work_order_part_usage").delete().eq("id", inserted.id);
      return { error: `Failed to record inventory transaction: ${txError.message}` };
    }
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  return { success: true };
}
