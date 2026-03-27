"use server";

import { createClient } from "@/src/lib/supabase/server";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { resolveAssetLocation } from "@/src/lib/assets/hierarchy";
import {
  calculateNextRunDate,
  calculateNextRunDateAfterExecution,
  formatDateOnly,
  type PreventiveMaintenanceFrequencyType,
} from "@/src/lib/preventive-maintenance/schedule";
import { revalidatePath } from "next/cache";
import { getTenantIdForUser, companyBelongsToTenant } from "@/src/lib/auth-context";
import { DEMO_READ_ONLY_ERROR, isDemoReadOnlyUser } from "@/src/lib/demo/readOnly";

const FREQUENCY_TYPES = [
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
const PLAN_STATUSES = ["active", "paused", "archived"] as const;
const PRIORITIES = ["low", "medium", "high", "urgent", "emergency"] as const;

export type PreventiveMaintenanceFormState = { error?: string; success?: boolean };
export type PreventiveMaintenanceGenerationState = {
  error?: string;
  success?: boolean;
  generatedRuns?: number;
  generatedWorkOrders?: number;
  skipped?: number;
  failed?: number;
};
export type PMProgramPlanFormState = { error?: string; success?: boolean };

type PlanRow = {
  id: string;
  tenant_id: string;
  company_id: string;
  asset_id: string | null;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  name: string;
  description: string | null;
  frequency_type: PreventiveMaintenanceFrequencyType;
  frequency_interval: number;
  start_date: string;
  next_run_date: string;
  last_run_date: string | null;
  auto_create_work_order: boolean;
  priority: string | null;
  estimated_duration_minutes: number | null;
  assigned_technician_id: string | null;
  instructions: string | null;
  status: "active" | "paused" | "archived";
  template_id?: string | null;
  pm_plan_id?: string | null;
  generate_parent_work_order?: boolean;
  generate_child_work_orders?: boolean;
};
type PMTemplateTaskRow = {
  id: string;
  pm_template_id: string;
  title: string;
  description: string | null;
  asset_id: string | null;
  asset_group: string | null;
  sort_order: number;
};

type PMScheduleTaskRow = {
  id: string;
  title: string;
  description: string | null;
  asset_id: string | null;
  sort_order: number;
  active: boolean;
};

async function getActorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function savePMProgramPlan(
  _prev: PMProgramPlanFormState,
  formData: FormData
): Promise<PMProgramPlanFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string | null)?.trim() || null;
  const pmPlanId = (formData.get("pm_plan_id") as string | null)?.trim() || null;
  const companyId = (formData.get("company_id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const category = (formData.get("category") as string | null)?.trim() || null;
  const active =
    formData.get("active") !== null && formData.get("active") !== "off";

  if (!companyId) return { error: "Company is required." };
  if (!name) return { error: "Plan name is required." };
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  const payload = {
    tenant_id: tenantId,
    company_id: companyId,
    name,
    description,
    category,
    active,
  };

  if (id) {
    const { error } = await supabase.from("pm_plans").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("pm_plans").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/preventive-maintenance");
  revalidatePath("/preventive-maintenance/plans");
  return { success: true };
}

export async function updatePMProgramPlanActive(
  id: string,
  active: boolean
): Promise<PMProgramPlanFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: row } = await supabase
    .from("pm_plans")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "PM Plan not found." };
  const allowed = await companyBelongsToTenant((row as { company_id: string }).company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const { error } = await supabase.from("pm_plans").update({ active }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/preventive-maintenance");
  revalidatePath("/preventive-maintenance/plans");
  return { success: true };
}

async function loadAssetContext(assetId: string): Promise<{
  id: string;
  company_id: string;
  property_id: string | null;
  building_id: string | null;
  unit_id: string | null;
  asset_name: string | null;
  name: string | null;
} | null> {
  const supabase = await createClient();
  const resolved = await resolveAssetLocation(supabase, assetId);
  if (!resolved) return null;
  return {
    id: resolved.asset.id,
    company_id: resolved.asset.company_id,
    property_id: resolved.effectivePropertyId,
    building_id: resolved.effectiveBuildingId,
    unit_id: resolved.effectiveUnitId,
    asset_name: resolved.asset.asset_name,
    name: resolved.asset.name,
  };
}

function parseFrequencyType(input: string | null | undefined): PreventiveMaintenanceFrequencyType | null {
  if (!input) return null;
  return FREQUENCY_TYPES.includes(input as PreventiveMaintenanceFrequencyType)
    ? (input as PreventiveMaintenanceFrequencyType)
    : null;
}

function parsePriority(input: string | null | undefined): string {
  if (!input) return "medium";
  return PRIORITIES.includes(input as (typeof PRIORITIES)[number]) ? input : "medium";
}

function parsePlanStatus(input: string | null | undefined): "active" | "paused" | "archived" {
  if (!input) return "active";
  return PLAN_STATUSES.includes(input as (typeof PLAN_STATUSES)[number])
    ? (input as "active" | "paused" | "archived")
    : "active";
}

function parsePositiveInt(input: string | null | undefined, fallback = 1): number {
  const raw = parseInt((input ?? "").trim(), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
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
    .map((row) => {
      const number = (row as { work_order_number?: string }).work_order_number ?? "";
      const match = number.match(/^WO-(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((value) => value > 0);

  const next = numbers.length ? Math.max(...numbers) + 1 : 1001;
  return `WO-${next}`;
}

function toPlanRow(data: Record<string, unknown>): PlanRow {
  return {
    id: data.id as string,
    tenant_id: data.tenant_id as string,
    company_id: data.company_id as string,
    asset_id: (data.asset_id as string | null) ?? null,
    property_id: (data.property_id as string | null) ?? null,
    building_id: (data.building_id as string | null) ?? null,
    unit_id: (data.unit_id as string | null) ?? null,
    name: data.name as string,
    description: (data.description as string | null) ?? null,
    frequency_type: data.frequency_type as PreventiveMaintenanceFrequencyType,
    frequency_interval: Number(data.frequency_interval ?? 1),
    start_date: data.start_date as string,
    next_run_date: data.next_run_date as string,
    last_run_date: (data.last_run_date as string | null) ?? null,
    auto_create_work_order: Boolean(data.auto_create_work_order),
    priority: (data.priority as string | null) ?? "medium",
    estimated_duration_minutes: (data.estimated_duration_minutes as number | null) ?? null,
    assigned_technician_id: (data.assigned_technician_id as string | null) ?? null,
    instructions: (data.instructions as string | null) ?? null,
    status: (data.status as "active" | "paused" | "archived") ?? "active",
    template_id: (data.template_id as string | null) ?? null,
    pm_plan_id: (data.pm_plan_id as string | null) ?? null,
    generate_parent_work_order:
      (data.generate_parent_work_order as boolean | null) ?? true,
    generate_child_work_orders:
      (data.generate_child_work_orders as boolean | null) ?? false,
  };
}

async function loadPlanTemplateTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plan: PlanRow
): Promise<PMTemplateTaskRow[]> {
  if (!plan.template_id) return [];
  const { data } = await supabase
    .from("preventive_maintenance_template_tasks")
    .select("id, pm_template_id, title, description, asset_id, asset_group, sort_order")
    .eq("pm_template_id", plan.template_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as PMTemplateTaskRow[];
}

async function loadScheduleTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scheduleId: string
): Promise<PMScheduleTaskRow[]> {
  const { data } = await supabase
    .from("preventive_maintenance_schedule_tasks")
    .select("id, title, description, asset_id, sort_order, active")
    .eq("pm_schedule_id", scheduleId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as PMScheduleTaskRow[];
}

async function createWorkOrderFromPlanTask(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plan: PlanRow,
  runId: string,
  scheduledDate: string,
  task: PMTemplateTaskRow | null,
  parentWorkOrderId: string | null
): Promise<string> {
  const taskAssetId = task?.asset_id ?? null;
  const effectiveAssetId = taskAssetId ?? plan.asset_id;
  let resolvedAssetName: string | null = null;
  if (!resolvedAssetName && effectiveAssetId) {
    const { data: asset } = await supabase
      .from("assets")
      .select("asset_name, name")
      .eq("id", effectiveAssetId)
      .maybeSingle();
    resolvedAssetName =
      ((asset as { asset_name?: string }).asset_name ??
        (asset as { name?: string }).name ??
        null);
  }

  const title = parentWorkOrderId
    ? task?.title ?? `Preventive Maintenance Task - ${resolvedAssetName ?? plan.name}`
    : `Preventive Maintenance - ${plan.name}`;
  const descriptionParts = [task?.description, plan.description, plan.instructions].filter(Boolean);
  const workOrderNumber = await generateWorkOrderNumber(supabase, plan.company_id);

  const payload = {
    tenant_id: plan.tenant_id,
    company_id: plan.company_id,
    property_id: plan.property_id,
    building_id: plan.building_id,
    unit_id: plan.unit_id,
    asset_id: effectiveAssetId,
    parent_work_order_id: parentWorkOrderId,
    work_order_number: workOrderNumber,
    title,
    description: descriptionParts.length ? descriptionParts.join("\n\n") : null,
    category: "preventive_maintenance",
    priority: parsePriority(plan.priority),
    status: "ready_to_schedule",
    requested_at: new Date().toISOString(),
    scheduled_date: null,
    scheduled_start: null,
    scheduled_end: null,
    due_date: scheduledDate,
    assigned_technician_id: plan.assigned_technician_id,
    estimated_hours:
      plan.estimated_duration_minutes != null
        ? Math.max(plan.estimated_duration_minutes / 60, 0.25)
        : null,
    source_type: "preventive_maintenance",
    preventive_maintenance_plan_id: plan.id,
    preventive_maintenance_run_id: runId,
  };

  const { data: inserted, error } = await supabase
    .from("work_orders")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return (inserted as { id: string }).id;
}

async function processPlanRun(
  supabase: Awaited<ReturnType<typeof createClient>>,
  plan: PlanRow,
  scheduledDate: string,
  forceCreateWorkOrder: boolean,
  tenantId: string,
  actorId: string | null
): Promise<{ status: "generated" | "skipped" | "failed"; workOrdersGenerated: number; error?: string }> {
  const scheduled = formatDateOnly(scheduledDate);

  // Idempotency: unique constraint on (plan_id, scheduled_date) prevents duplicate runs; 23505 = unique violation.
  const { data: runRow, error: runInsertError } = await supabase
    .from("preventive_maintenance_runs")
    .insert({
      preventive_maintenance_plan_id: plan.id,
      pm_schedule_id: plan.id,
      pm_plan_id: plan.pm_plan_id ?? null,
      company_id: plan.company_id,
      scheduled_date: scheduled,
      status: "pending",
      notes: forceCreateWorkOrder ? "Manual run generation" : null,
    })
    .select("id")
    .single();

  if (runInsertError) {
    if ((runInsertError as { code?: string }).code === "23505") {
      return { status: "skipped", workOrdersGenerated: 0 };
    }
    return { status: "failed", workOrdersGenerated: 0, error: runInsertError.message };
  }

  const runId = (runRow as { id: string }).id;
  const generatedWorkOrderIds: string[] = [];
  const shouldCreateWorkOrder = forceCreateWorkOrder || plan.auto_create_work_order;
  let runStatus: "generated" | "skipped" | "failed" = "generated";
  let runNotes: string | null = forceCreateWorkOrder ? "Manual run generation" : null;

  if (shouldCreateWorkOrder) {
    try {
      const scheduleTasks = (await loadScheduleTasks(supabase, plan.id)).filter((task) => task.active);
      const templateTasks = await loadPlanTemplateTasks(supabase, plan);
      const executionTasks = scheduleTasks.length
        ? scheduleTasks.map((task) => ({
            id: task.id,
            pm_template_id: "",
            title: task.title,
            description: task.description,
            asset_id: task.asset_id,
            asset_group: null,
            sort_order: task.sort_order,
          }))
        : templateTasks;
      const shouldGenerateChildren =
        (plan.generate_child_work_orders ?? false) && executionTasks.length > 0;
      const shouldGenerateParent =
        (plan.generate_parent_work_order ?? true) || !shouldGenerateChildren;

      if (!shouldGenerateChildren) {
        const workOrderId = await createWorkOrderFromPlanTask(
          supabase,
          plan,
          runId,
          scheduled,
          null,
          null
        );
        generatedWorkOrderIds.push(workOrderId);
      } else {
        let parentWorkOrderId: string | null = null;
        if (shouldGenerateParent) {
          parentWorkOrderId = await createWorkOrderFromPlanTask(
            supabase,
            plan,
            runId,
            scheduled,
            null,
            null
          );
          generatedWorkOrderIds.push(parentWorkOrderId);
        }
        for (const task of executionTasks) {
          const childWorkOrderId = await createWorkOrderFromPlanTask(
            supabase,
            plan,
            runId,
            scheduled,
            task,
            parentWorkOrderId
          );
          generatedWorkOrderIds.push(childWorkOrderId);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await supabase
        .from("preventive_maintenance_runs")
        .update({ status: "failed", notes: message })
        .eq("id", runId);
      return { status: "failed", workOrdersGenerated: 0, error: message };
    }
  } else {
    runStatus = "skipped";
    runNotes = "Auto-create work order disabled for plan.";
  }

  const { error: runUpdateError } = await supabase
    .from("preventive_maintenance_runs")
    .update({
      generated_work_order_id: generatedWorkOrderIds[0] ?? null,
      parent_work_order_id: generatedWorkOrderIds[0] ?? null,
      generated_at: new Date().toISOString(),
      status: runStatus,
      notes: runNotes,
    })
    .eq("id", runId);
  if (runUpdateError) {
    return { status: "failed", workOrdersGenerated: generatedWorkOrderIds.length, error: runUpdateError.message };
  }
  if (generatedWorkOrderIds.length > 0) {
    await supabase.from("preventive_maintenance_run_work_orders").insert(
      generatedWorkOrderIds.map((workOrderId) => ({
        preventive_maintenance_run_id: runId,
        work_order_id: workOrderId,
      }))
    );
  }

  const nextRun = calculateNextRunDateAfterExecution({
    frequencyType: plan.frequency_type,
    frequencyInterval: plan.frequency_interval,
    currentNextRunDate: scheduled,
    executedOn: scheduled,
  });

  const { error: updatePlanError } = await supabase
    .from("preventive_maintenance_plans")
    .update({
      last_run_date: scheduled,
      next_run_date: nextRun,
    })
    .eq("id", plan.id);

  if (updatePlanError) {
    return { status: "failed", workOrdersGenerated: generatedWorkOrderIds.length, error: updatePlanError.message };
  }

  await insertActivityLog(supabase, {
    tenantId,
    companyId: plan.company_id,
    entityType: "preventive_maintenance_run",
    entityId: runId,
    actionType: "pm_run_generated",
    performedBy: actorId,
    metadata: {
      preventive_maintenance_plan_id: plan.id,
        generated_work_order_ids: generatedWorkOrderIds,
      auto_create_work_order: plan.auto_create_work_order,
      force_create_work_order: forceCreateWorkOrder,
    },
    afterState: {
      status: runStatus,
      scheduled_date: scheduled,
        generated_work_order_id: generatedWorkOrderIds[0] ?? null,
    },
  });

  for (const generatedWorkOrderId of generatedWorkOrderIds) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId: plan.company_id,
      entityType: "work_order",
      entityId: generatedWorkOrderId,
      actionType: "pm_work_order_created",
      performedBy: actorId,
      metadata: {
        preventive_maintenance_plan_id: plan.id,
        preventive_maintenance_run_id: runId,
      },
      afterState: {
        source_type: "preventive_maintenance",
        preventive_maintenance_plan_id: plan.id,
        preventive_maintenance_run_id: runId,
        status: "ready_to_schedule",
      },
    });
  }

  return { status: "generated", workOrdersGenerated: generatedWorkOrderIds.length };
}

export async function savePreventiveMaintenancePlan(
  _prev: PreventiveMaintenanceFormState,
  formData: FormData
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string | null)?.trim() || null;
  const pmPlanId = (formData.get("pm_plan_id") as string | null)?.trim() || null;
  const companyId = (formData.get("company_id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const frequencyType = parseFrequencyType(
    (formData.get("frequency_type") as string | null)?.trim()
  );
  const frequencyInterval = parsePositiveInt(
    (formData.get("frequency_interval") as string | null)?.trim(),
    1
  );
  const startDateRaw = (formData.get("start_date") as string | null)?.trim();
  const startDate = startDateRaw ? formatDateOnly(startDateRaw) : null;

  if (!companyId) return { error: "Company is required." };
  if (!name) return { error: "Plan name is required." };
  if (!frequencyType) return { error: "Frequency type is required." };
  if (!startDate) return { error: "Start date is required." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };
  if (pmPlanId) {
    const { data: pmPlanRow } = await supabase
      .from("pm_plans")
      .select("id, company_id")
      .eq("id", pmPlanId)
      .maybeSingle();
    if (!pmPlanRow) return { error: "PM Plan not found." };
    if ((pmPlanRow as { company_id: string }).company_id !== companyId) {
      return { error: "PM Plan must belong to the selected company." };
    }
  }

  const assetId = (formData.get("asset_id") as string | null)?.trim() || null;
  const propertyIdInput = (formData.get("property_id") as string | null)?.trim() || null;
  const buildingIdInput = (formData.get("building_id") as string | null)?.trim() || null;
  const unitIdInput = (formData.get("unit_id") as string | null)?.trim() || null;

  let propertyId = propertyIdInput;
  let buildingId = buildingIdInput;
  let unitId = unitIdInput;
  if (assetId) {
    const asset = await loadAssetContext(assetId);
    if (!asset) return { error: "Asset not found." };
    if (asset.company_id !== companyId) {
      return { error: "Selected asset does not belong to the selected company." };
    }
    propertyId = propertyId ?? asset.property_id;
    buildingId = buildingId ?? asset.building_id;
    unitId = unitId ?? asset.unit_id;
  }

  const priority = parsePriority((formData.get("priority") as string | null)?.trim());
  const status = parsePlanStatus((formData.get("status") as string | null)?.trim());
  const estimatedDurationRaw = (formData.get("estimated_duration_minutes") as string | null)?.trim();
  const estimatedDurationMinutes =
    estimatedDurationRaw && Number.isFinite(parseInt(estimatedDurationRaw, 10))
      ? Math.max(parseInt(estimatedDurationRaw, 10), 1)
      : null;
  const assignedTechnicianId =
    (formData.get("assigned_technician_id") as string | null)?.trim() || null;
  const autoCreateWorkOrder =
    formData.get("auto_create_work_order") !== null &&
    formData.get("auto_create_work_order") !== "off";
  const generateParentWorkOrder =
    formData.get("generate_parent_work_order") !== null &&
    formData.get("generate_parent_work_order") !== "off";
  const generateChildWorkOrders =
    formData.get("generate_child_work_orders") !== null &&
    formData.get("generate_child_work_orders") !== "off";
  const intervalValueRaw = (formData.get("interval_value") as string | null)?.trim();
  const intervalValue =
    intervalValueRaw && Number.isFinite(parseInt(intervalValueRaw, 10))
      ? Math.max(parseInt(intervalValueRaw, 10), 1)
      : null;

  const actorId = await getActorId(supabase);
  let beforeState: Record<string, unknown> | null = null;

  let nextRunDate = startDate;
  if (id) {
    const { data: existing } = await supabase
      .from("preventive_maintenance_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Plan not found." };
    beforeState = existing as Record<string, unknown>;
    const belongs = await companyBelongsToTenant(
      (beforeState.company_id as string) ?? "",
      tenantId
    );
    if (!belongs) return { error: "Unauthorized." };
    const lastRunDate = (beforeState.last_run_date as string | null) ?? null;
    if (lastRunDate) {
      nextRunDate = calculateNextRunDate({
        frequencyType,
        frequencyInterval,
        baseDate: lastRunDate,
      });
    }
  }

  const payload = {
    tenant_id: tenantId,
    company_id: companyId,
    asset_id: assetId,
    property_id: propertyId,
    building_id: buildingId,
    unit_id: unitId,
    name,
    description: (formData.get("description") as string | null)?.trim() || null,
    frequency_type: frequencyType,
    frequency_interval: frequencyInterval,
    start_date: startDate,
    next_run_date: nextRunDate,
    auto_create_work_order: autoCreateWorkOrder,
    generate_parent_work_order: generateParentWorkOrder,
    generate_child_work_orders: generateChildWorkOrders,
    pm_plan_id: pmPlanId,
    interval_value: intervalValue,
    priority,
    estimated_duration_minutes: estimatedDurationMinutes,
    assigned_technician_id: assignedTechnicianId,
    instructions: (formData.get("instructions") as string | null)?.trim() || null,
    status,
  };
  const taskTitles = formData.getAll("task_title").map((value) => String(value ?? "").trim());
  const taskDescriptions = formData
    .getAll("task_description")
    .map((value) => String(value ?? "").trim());
  const taskAssetIds = formData.getAll("task_asset_id").map((value) => String(value ?? "").trim());
  const taskSortOrders = formData
    .getAll("task_sort_order")
    .map((value) => parseInt(String(value ?? "").trim(), 10));
  const taskIds = formData.getAll("task_id").map((value) => String(value ?? "").trim());

  if (id) {
    const { data: updated, error } = await supabase
      .from("preventive_maintenance_plans")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { error: error.message };
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "preventive_maintenance_plan",
      entityId: id,
      actionType: "pm_plan_edited",
      performedBy: actorId,
      beforeState,
      afterState: updated as Record<string, unknown>,
    });
    await supabase
      .from("preventive_maintenance_schedule_tasks")
      .delete()
      .eq("pm_schedule_id", id);
    const scheduleTasksToInsert = taskTitles
      .map((title, index) => ({
        id: taskIds[index] || undefined,
        pm_schedule_id: id,
        title,
        description: taskDescriptions[index] || null,
        asset_id: taskAssetIds[index] || null,
        sort_order: Number.isFinite(taskSortOrders[index]) ? taskSortOrders[index] : index,
      }))
      .filter((task) => task.title);
    if (scheduleTasksToInsert.length > 0) {
      const { error: scheduleTaskError } = await supabase
        .from("preventive_maintenance_schedule_tasks")
        .insert(scheduleTasksToInsert);
      if (scheduleTaskError) return { error: scheduleTaskError.message };
    }
    revalidatePath(`/preventive-maintenance/${id}`);
  } else {
    const { data: inserted, error } = await supabase
      .from("preventive_maintenance_plans")
      .insert(payload)
      .select("*")
      .single();
    if (error) return { error: error.message };
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "preventive_maintenance_plan",
      entityId: (inserted as { id: string }).id,
      actionType: "pm_plan_created",
      performedBy: actorId,
      afterState: inserted as Record<string, unknown>,
    });
    const insertedId = (inserted as { id: string }).id;
    const scheduleTasksToInsert = taskTitles
      .map((title, index) => ({
        pm_schedule_id: insertedId,
        title,
        description: taskDescriptions[index] || null,
        asset_id: taskAssetIds[index] || null,
        sort_order: Number.isFinite(taskSortOrders[index]) ? taskSortOrders[index] : index,
      }))
      .filter((task) => task.title);
    if (scheduleTasksToInsert.length > 0) {
      const { error: scheduleTaskError } = await supabase
        .from("preventive_maintenance_schedule_tasks")
        .insert(scheduleTasksToInsert);
      if (scheduleTaskError) return { error: scheduleTaskError.message };
    }
  }

  revalidatePath("/preventive-maintenance");
  if (assetId) revalidatePath(`/assets/${assetId}`);
  return { success: true };
}

export async function deletePreventiveMaintenancePlan(
  id: string
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: row } = await supabase
    .from("preventive_maintenance_plans")
    .select("id, company_id, asset_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Plan not found." };

  const allowed = await companyBelongsToTenant(
    (row as { company_id: string }).company_id,
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("preventive_maintenance_plans")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/preventive-maintenance");
  revalidatePath(`/preventive-maintenance/${id}`);
  const assetId = (row as { asset_id?: string | null }).asset_id;
  if (assetId) revalidatePath(`/assets/${assetId}`);
  return { success: true };
}

export async function updatePreventiveMaintenancePlanStatus(
  id: string,
  status: "active" | "paused" | "archived"
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("preventive_maintenance_plans")
    .select("id, company_id, asset_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Plan not found." };

  const allowed = await companyBelongsToTenant(
    (row as { company_id: string }).company_id,
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };

  const beforeState = row as Record<string, unknown>;
  const { data: updated, error } = await supabase
    .from("preventive_maintenance_plans")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  const actionType =
    status === "paused"
      ? "pm_plan_paused"
      : status === "active" && (beforeState.status as string) === "paused"
        ? "pm_plan_resumed"
        : "pm_plan_status_changed";
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (beforeState.company_id as string) ?? null,
    entityType: "preventive_maintenance_plan",
    entityId: id,
    actionType,
    performedBy: actorId,
    beforeState: { status: beforeState.status as string | null },
    afterState: { status: (updated as { status?: string }).status ?? status },
  });

  revalidatePath("/preventive-maintenance");
  revalidatePath(`/preventive-maintenance/${id}`);
  const assetId = (row as { asset_id?: string | null }).asset_id;
  if (assetId) revalidatePath(`/assets/${assetId}`);
  return { success: true };
}

export async function duplicatePreventiveMaintenancePlan(
  id: string
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const today = formatDateOnly(new Date());
  const { data: row } = await supabase
    .from("preventive_maintenance_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Plan not found." };
  const plan = toPlanRow(row as Record<string, unknown>);
  const allowed = await companyBelongsToTenant(plan.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const payload = {
    tenant_id: plan.tenant_id,
    company_id: plan.company_id,
    asset_id: plan.asset_id,
    property_id: plan.property_id,
    building_id: plan.building_id,
    unit_id: plan.unit_id,
    template_id: (row as { template_id?: string | null }).template_id ?? null,
    name: `${plan.name} (Copy)`,
    description: plan.description,
    frequency_type: plan.frequency_type,
    frequency_interval: plan.frequency_interval,
    start_date: today,
    next_run_date: today,
    last_run_date: null,
    auto_create_work_order: plan.auto_create_work_order,
    priority: parsePriority(plan.priority),
    estimated_duration_minutes: plan.estimated_duration_minutes,
    assigned_technician_id: plan.assigned_technician_id,
    instructions: plan.instructions,
    status: "active",
  };

  const { error } = await supabase.from("preventive_maintenance_plans").insert(payload);
  if (error) return { error: error.message };

  revalidatePath("/preventive-maintenance");
  if (plan.asset_id) revalidatePath(`/assets/${plan.asset_id}`);
  return { success: true };
}

export async function savePreventiveMaintenanceTemplate(
  _prev: PreventiveMaintenanceFormState,
  formData: FormData
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string | null)?.trim() || null;
  const companyId = (formData.get("company_id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const frequencyType = parseFrequencyType(
    (formData.get("frequency_type") as string | null)?.trim()
  );
  const frequencyInterval = parsePositiveInt(
    (formData.get("frequency_interval") as string | null)?.trim(),
    1
  );
  if (!companyId) return { error: "Company is required." };
  if (!name) return { error: "Template name is required." };
  if (!frequencyType) return { error: "Frequency type is required." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  const payload = {
    company_id: companyId,
    name,
    description: (formData.get("description") as string | null)?.trim() || null,
    frequency_type: frequencyType,
    frequency_interval: frequencyInterval,
    priority: parsePriority((formData.get("priority") as string | null)?.trim()),
    estimated_duration_minutes: (() => {
      const raw = (formData.get("estimated_duration_minutes") as string | null)?.trim();
      if (!raw) return null;
      const value = parseInt(raw, 10);
      return Number.isFinite(value) && value > 0 ? value : null;
    })(),
    instructions: (formData.get("instructions") as string | null)?.trim() || null,
  };
  const taskTitles = formData.getAll("task_title").map((value) => String(value ?? "").trim());
  const taskDescriptions = formData
    .getAll("task_description")
    .map((value) => String(value ?? "").trim());
  const taskAssetIds = formData.getAll("task_asset_id").map((value) => String(value ?? "").trim());
  const taskAssetGroups = formData
    .getAll("task_asset_group")
    .map((value) => String(value ?? "").trim());
  const taskSortOrders = formData
    .getAll("task_sort_order")
    .map((value) => parseInt(String(value ?? "").trim(), 10));
  const taskIds = formData.getAll("task_id").map((value) => String(value ?? "").trim());

  if (id) {
    const { data: existing } = await supabase
      .from("preventive_maintenance_templates")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Template not found." };
    const canEdit = await companyBelongsToTenant(
      (existing as { company_id: string }).company_id,
      tenantId
    );
    if (!canEdit) return { error: "Unauthorized." };

    const { error } = await supabase
      .from("preventive_maintenance_templates")
      .update(payload)
      .eq("id", id);
    if (error) return { error: error.message };
    await supabase
      .from("preventive_maintenance_template_tasks")
      .delete()
      .eq("pm_template_id", id);
    const tasksToInsert = taskTitles
      .map((title, index) => ({
        id: taskIds[index] || undefined,
        pm_template_id: id,
        title,
        description: taskDescriptions[index] || null,
        asset_id: taskAssetIds[index] || null,
        asset_group: taskAssetGroups[index] || null,
        sort_order: Number.isFinite(taskSortOrders[index]) ? taskSortOrders[index] : index,
      }))
      .filter((task) => task.title);
    if (tasksToInsert.length > 0) {
      const { error: taskError } = await supabase
        .from("preventive_maintenance_template_tasks")
        .insert(tasksToInsert);
      if (taskError) return { error: taskError.message };
    }
  } else {
    const { data: insertedTemplate, error } = await supabase
      .from("preventive_maintenance_templates")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    const templateId = (insertedTemplate as { id?: string } | null)?.id ?? null;
    if (templateId) {
      const tasksToInsert = taskTitles
        .map((title, index) => ({
          pm_template_id: templateId,
          title,
          description: taskDescriptions[index] || null,
          asset_id: taskAssetIds[index] || null,
          asset_group: taskAssetGroups[index] || null,
          sort_order: Number.isFinite(taskSortOrders[index]) ? taskSortOrders[index] : index,
        }))
        .filter((task) => task.title);
      if (tasksToInsert.length > 0) {
        const { error: taskError } = await supabase
          .from("preventive_maintenance_template_tasks")
          .insert(tasksToInsert);
        if (taskError) return { error: taskError.message };
      }
    }
  }

  revalidatePath("/preventive-maintenance");
  return { success: true };
}

export async function deletePreventiveMaintenanceTemplate(
  id: string
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: row } = await supabase
    .from("preventive_maintenance_templates")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Template not found." };

  const allowed = await companyBelongsToTenant(
    (row as { company_id: string }).company_id,
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase
    .from("preventive_maintenance_templates")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/preventive-maintenance");
  return { success: true };
}

export async function bulkCreatePlansFromTemplate(
  _prev: PreventiveMaintenanceFormState,
  formData: FormData
): Promise<PreventiveMaintenanceFormState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const templateId = (formData.get("template_id") as string | null)?.trim();
  const startDateRaw = (formData.get("start_date") as string | null)?.trim();
  const startDate = startDateRaw ? formatDateOnly(startDateRaw) : null;
  const companyId = (formData.get("company_id") as string | null)?.trim();
  const assetIds = formData
    .getAll("asset_ids")
    .map((id) => String(id).trim())
    .filter(Boolean);

  if (!templateId) return { error: "Template is required." };
  if (!companyId) return { error: "Company is required." };
  if (!startDate) return { error: "Start date is required." };
  if (assetIds.length === 0) return { error: "Select at least one asset." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  const { data: template } = await supabase
    .from("preventive_maintenance_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return { error: "Template not found." };
  if ((template as { company_id: string }).company_id !== companyId) {
    return { error: "Template does not belong to the selected company." };
  }

  const { data: assets } = await supabase
    .from("assets")
    .select("id, company_id, property_id, building_id, unit_id, asset_name, name")
    .in("id", assetIds);
  const assetRows = (assets ?? []) as {
    id: string;
    company_id: string;
    property_id: string | null;
    building_id: string | null;
    unit_id: string | null;
    asset_name: string | null;
    name: string | null;
  }[];

  const validAssets = assetRows.filter((asset) => asset.company_id === companyId);
  if (validAssets.length === 0) {
    return { error: "No valid assets found for this company." };
  }

  const templateData = template as Record<string, unknown>;
  const plans = validAssets.map((asset) => ({
    tenant_id: tenantId,
    company_id: companyId,
    asset_id: asset.id,
    property_id: asset.property_id,
    building_id: asset.building_id,
    unit_id: asset.unit_id,
    template_id: templateId,
    name: `${templateData.name as string} - ${asset.asset_name ?? asset.name ?? "Asset"}`,
    description: (templateData.description as string | null) ?? null,
    frequency_type: templateData.frequency_type as PreventiveMaintenanceFrequencyType,
    frequency_interval: Number(templateData.frequency_interval ?? 1),
    start_date: startDate,
    next_run_date: startDate,
    auto_create_work_order: true,
    priority: parsePriority(templateData.priority as string | null),
    estimated_duration_minutes:
      (templateData.estimated_duration_minutes as number | null) ?? null,
    assigned_technician_id:
      (formData.get("assigned_technician_id") as string | null)?.trim() || null,
    instructions: (templateData.instructions as string | null) ?? null,
    status: "active",
  }));

  const { error } = await supabase
    .from("preventive_maintenance_plans")
    .insert(plans);
  if (error) return { error: error.message };

  revalidatePath("/preventive-maintenance");
  return { success: true };
}

export async function generatePreventiveMaintenanceNow(
  planId: string
): Promise<PreventiveMaintenanceGenerationState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("preventive_maintenance_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (!row) return { error: "Plan not found." };
  const plan = toPlanRow(row as Record<string, unknown>);

  const allowed = await companyBelongsToTenant(plan.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  if (plan.status === "archived") return { error: "Archived plans cannot generate runs." };

  const result = await processPlanRun(
    supabase,
    plan,
    formatDateOnly(new Date()),
    true,
    tenantId,
    actorId
  );

  revalidatePath("/preventive-maintenance");
  revalidatePath(`/preventive-maintenance/${planId}`);
  if (plan.asset_id) revalidatePath(`/assets/${plan.asset_id}`);
  revalidatePath("/work-orders");
  revalidatePath("/dispatch");

  if (result.status === "failed") {
    return { error: result.error ?? "Failed to generate PM run.", failed: 1 };
  }
  if (result.status === "skipped") {
    return { success: true, skipped: 1 };
  }
  return {
    success: true,
    generatedRuns: 1,
    generatedWorkOrders: result.workOrdersGenerated,
  };
}

export async function generateDuePreventiveMaintenanceRuns(
  targetDate?: string
): Promise<PreventiveMaintenanceGenerationState> {
  const supabase = await createClient();
  if (await isDemoReadOnlyUser(supabase)) return { error: DEMO_READ_ONLY_ERROR };
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const runDate = targetDate ? formatDateOnly(targetDate) : formatDateOnly(new Date());

  const actorId = await getActorId(supabase);
  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((row) => (row as { id: string }).id);
  if (companyIds.length === 0) return { success: true, generatedRuns: 0, skipped: 0, failed: 0 };

  const { data: plans } = await supabase
    .from("preventive_maintenance_plans")
    .select("*")
    .in("company_id", companyIds)
    .eq("status", "active")
    .lte("next_run_date", runDate)
    .order("next_run_date", { ascending: true });

  let generatedRuns = 0;
  let generatedWorkOrders = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of plans ?? []) {
    const plan = toPlanRow(row as Record<string, unknown>);
    const result = await processPlanRun(
      supabase,
      plan,
      plan.next_run_date,
      false,
      tenantId,
      actorId
    );
    if (result.status === "generated") {
      generatedRuns += 1;
      generatedWorkOrders += result.workOrdersGenerated;
    } else if (result.status === "skipped") {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  revalidatePath("/preventive-maintenance");
  revalidatePath("/work-orders");
  revalidatePath("/assets");
  revalidatePath("/dispatch");

  return {
    success: true,
    generatedRuns,
    generatedWorkOrders,
    skipped,
    failed,
  };
}
