"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WorkOrderFormState = { error?: string; success?: boolean };

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

  if (propertyId) {
    const { data: prop } = await supabase
      .from("properties")
      .select("id, company_id")
      .eq("id", propertyId)
      .maybeSingle();
    if (!prop) return { error: "Selected property was not found." };
    if (prop.company_id !== companyId) return { error: "Selected property does not belong to the selected company." };
  }
  if (buildingId) {
    const { data: bld } = await supabase
      .from("buildings")
      .select("id, property_id")
      .eq("id", buildingId)
      .maybeSingle();
    if (!bld) return { error: "Selected building was not found." };
    if (!propertyId) return { error: "Please select a property when selecting a building." };
    if (bld.property_id !== propertyId) return { error: "Selected building does not belong to the selected property." };
  }
  if (unitId) {
    const { data: un } = await supabase
      .from("units")
      .select("id, building_id")
      .eq("id", unitId)
      .maybeSingle();
    if (!un) return { error: "Selected unit was not found." };
    if (!buildingId) return { error: "Please select a building when selecting a unit." };
    if (un.building_id !== buildingId) return { error: "Selected unit does not belong to the selected building." };
  }
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
  const validStatus = [
    "open",
    "assigned",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
    "closed",
  ].includes(status ?? "")
    ? status
    : "open";

  const requestedAtRaw = (formData.get("requested_at") as string)?.trim() || null;
  const scheduledDateRaw = (formData.get("scheduled_date") as string)?.trim() || null;
  const scheduledStartRaw = (formData.get("scheduled_start") as string)?.trim() || null;
  const scheduledEndRaw = (formData.get("scheduled_end") as string)?.trim() || null;
  const estimatedHoursRaw = (formData.get("estimated_hours") as string)?.trim();
  const estimatedTechniciansRaw = (formData.get("estimated_technicians") as string)?.trim();
  const nteAmountRaw = (formData.get("nte_amount") as string)?.trim();
  const billable = formData.get("billable") !== null && formData.get("billable") !== "off";

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

  if (id) {
    const { data: row } = await supabase
      .from("work_orders")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (!row) return { error: "Work order not found." };
    const allowedUpdate = await companyBelongsToTenant(row.company_id, tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { error } = await supabase.from("work_orders").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const workOrderNumber =
      (formData.get("work_order_number") as string)?.trim() ||
      (await generateWorkOrderNumber(supabase, companyId));
    (payload as Record<string, unknown>).work_order_number = workOrderNumber || null;
    const { error } = await supabase.from("work_orders").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/work-orders");
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

  const validStatuses = [
    "open",
    "assigned",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
    "closed",
  ];
  if (!validStatuses.includes(newStatus)) return { error: "Invalid status." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("work_orders")
    .update({ status: newStatus })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
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
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const status = (row as { status?: string }).status;
  if (status === "completed" || status === "cancelled" || status === "closed")
    return { error: "Cannot change assignment on completed or cancelled work orders." };

  const hasAssignment = !!(payload.assigned_technician_id || payload.assigned_crew_id);
  const newStatus =
    status === "open" && hasAssignment ? "assigned" : undefined;

  const update: Record<string, unknown> = {
    assigned_technician_id: payload.assigned_technician_id || null,
    assigned_crew_id: payload.assigned_crew_id || null,
  };
  if (newStatus) update.status = newStatus;
  if (payload.scheduled_date !== undefined) update.scheduled_date = payload.scheduled_date || null;
  if (payload.scheduled_start !== undefined)
    update.scheduled_start = payload.scheduled_start ? new Date(payload.scheduled_start).toISOString() : null;
  if (payload.scheduled_end !== undefined)
    update.scheduled_end = payload.scheduled_end ? new Date(payload.scheduled_end).toISOString() : null;

  const { error } = await supabase.from("work_orders").update(update).eq("id", id);
  if (error) return { error: error.message };
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
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const completedAt = payload.completed_at
    ? new Date(payload.completed_at).toISOString()
    : new Date().toISOString();
  const completionDate =
    payload.completion_date ?? completedAt.slice(0, 10);
  const completionStatus =
    payload.completion_status && VALID_COMPLETION_STATUSES.includes(payload.completion_status as (typeof VALID_COMPLETION_STATUSES)[number])
      ? payload.completion_status
      : "successful";

  const update: Record<string, unknown> = {
    status: "completed",
    completed_at: completedAt,
    completion_date: completionDate || null,
    resolution_summary: resolutionSummary,
    completion_notes: (payload.completion_notes ?? "").trim() || null,
    root_cause: (payload.root_cause ?? "").trim() || null,
    actual_hours: payload.actual_hours ?? null,
    follow_up_required: payload.follow_up_required ?? false,
    customer_visible_summary: (payload.customer_visible_summary ?? "").trim() || null,
    internal_completion_notes: (payload.internal_completion_notes ?? "").trim() || null,
    completed_by_technician_id: payload.completed_by_technician_id || null,
    completion_status: completionStatus,
  };

  const { error } = await supabase.from("work_orders").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/work-orders");
  revalidatePath(`/work-orders/${id}`);
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
