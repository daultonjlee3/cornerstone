"use server";

import { createClient } from "@/src/lib/supabase/server";
import { calculateAssetHealth } from "@/src/lib/assets/assetHealthService";
import { revalidateAssetIntelligenceCaches } from "@/src/lib/assets/assetIntelligenceService";
import { resolveAssetLocation } from "@/src/lib/assets/hierarchy";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { createNotification } from "@/src/lib/notifications/service";
import { dispatchNotificationEvent } from "@/src/lib/notifications/dispatch";
import { sendEmailAlert, getCompanyAlertRecipients } from "@/src/lib/notifications";
import { validateLocationHierarchy } from "@/src/lib/location-hierarchy";
import {
  calculateNextRunDateAfterExecution,
  formatDateOnly,
  type PreventiveMaintenanceFrequencyType,
} from "@/src/lib/preventive-maintenance/schedule";
import { revalidatePath } from "next/cache";
import { getTenantIdForUser, companyBelongsToTenant } from "@/src/lib/auth-context";
import { requirePermission } from "@/src/lib/permissions";
import {
  TERMINAL_STATUSES,
  normalizeStatus,
  toComparableStatus,
  canTransitionStatus,
  isSupportedStatus,
} from "@/src/lib/work-orders/status";

export type WorkOrderFormState = {
  error?: string;
  success?: boolean;
  workOrderId?: string;
  workOrderNumber?: string;
};

async function getActorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

type PortalTechnicianGuard = {
  isPortalOnly: boolean;
  technicianId: string | null;
  crewIds: Set<string>;
};

async function resolvePortalTechnicianGuard(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<PortalTechnicianGuard> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { isPortalOnly: false, technicianId: null, crewIds: new Set() };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_portal_only")
    .eq("id", user.id)
    .limit(1)
    .maybeSingle();
  const isPortalOnly = Boolean(
    (profile as { is_portal_only?: boolean | null } | null)?.is_portal_only
  );
  if (!isPortalOnly) {
    return { isPortalOnly: false, technicianId: null, crewIds: new Set() };
  }

  const { data: technician } = await supabase
    .from("technicians")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const technicianId = (technician as { id?: string } | null)?.id ?? null;
  const { data: crewRows } = technicianId
    ? await supabase.from("crew_members").select("crew_id").eq("technician_id", technicianId)
    : { data: [] as unknown[] };
  const crewIds = new Set(
    ((crewRows ?? []) as Array<{ crew_id?: string | null }>)
      .map((row) => row.crew_id)
      .filter((value): value is string => Boolean(value))
  );

  return {
    isPortalOnly: true,
    technicianId,
    crewIds,
  };
}

function portalGuardHasWorkOrderAccess(
  guard: PortalTechnicianGuard,
  workOrder: {
    assigned_technician_id?: string | null;
    assigned_crew_id?: string | null;
  }
): boolean {
  if (!guard.isPortalOnly) return true;
  if (!guard.technicianId) return false;
  const assignedTechnicianId = workOrder.assigned_technician_id ?? null;
  const assignedCrewId = workOrder.assigned_crew_id ?? null;
  return (
    assignedTechnicianId === guard.technicianId ||
    Boolean(assignedCrewId && guard.crewIds.has(assignedCrewId))
  );
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

async function validateAssignmentTargets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    tenantId,
    companyId,
    technicianId,
    crewId,
    vendorId,
  }: {
    tenantId: string;
    companyId: string;
    technicianId: string | null;
    crewId: string | null;
    vendorId: string | null;
  }
): Promise<string | null> {
  const selectedTargets = [technicianId, crewId, vendorId].filter(Boolean).length;
  if (selectedTargets > 1) {
    return "Assign to one target only: technician, crew, or external vendor.";
  }

  if (technicianId) {
    const { data: technician } = await supabase
      .from("technicians")
      .select("id, company_id, status")
      .eq("id", technicianId)
      .maybeSingle();
    if (!technician) return "Selected technician was not found.";
    if ((technician as { company_id?: string | null }).company_id !== companyId) {
      return "Selected technician does not belong to the selected company.";
    }
    if ((technician as { status?: string | null }).status !== "active") {
      return "Selected technician is not active.";
    }
  }

  if (crewId) {
    const { data: crew } = await supabase
      .from("crews")
      .select("id, tenant_id, company_id, is_active")
      .eq("id", crewId)
      .maybeSingle();
    if (!crew) return "Selected crew was not found.";
    if ((crew as { tenant_id?: string | null }).tenant_id !== tenantId) {
      return "Selected crew does not belong to this tenant.";
    }
    const crewCompanyId = (crew as { company_id?: string | null }).company_id ?? null;
    if (crewCompanyId && crewCompanyId !== companyId) {
      return "Selected crew does not belong to the selected company.";
    }
    if ((crew as { is_active?: boolean | null }).is_active === false) {
      return "Selected crew is inactive.";
    }
  }

  if (vendorId) {
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id, company_id")
      .eq("id", vendorId)
      .maybeSingle();
    if (!vendor) return "Selected vendor was not found.";
    if ((vendor as { company_id?: string | null }).company_id !== companyId) {
      return "Selected vendor does not belong to the selected company.";
    }
  }

  return null;
}

async function resolveActorTechnicianIdForCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    actorId,
    companyId,
  }: {
    actorId: string | null;
    companyId: string | null;
  }
): Promise<string | null> {
  if (!actorId || !companyId) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = (user?.email ?? "").trim();
  if (!email) return null;
  const { data: technician } = await supabase
    .from("technicians")
    .select("id")
    .eq("company_id", companyId)
    .eq("status", "active")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  return (technician as { id?: string } | null)?.id ?? null;
}

function diffMinutes(startIso: string, endIso: string): number {
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}

async function startLaborSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    workOrderId,
    technicianId,
    actorId,
    startedAt,
  }: {
    workOrderId: string;
    technicianId: string | null;
    actorId: string | null;
    startedAt: string;
  }
): Promise<{ id: string } | null> {
  const { data: existing } = await supabase
    .from("work_order_labor_entries")
    .select("id")
    .eq("work_order_id", workOrderId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (existing) return existing as { id: string };

  const { data: inserted, error } = await supabase
    .from("work_order_labor_entries")
    .insert({
      work_order_id: workOrderId,
      technician_id: technicianId,
      created_by_user_id: actorId,
      started_at: startedAt,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) return null;
  return (inserted as { id: string } | null) ?? null;
}

async function stopLaborSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    workOrderId,
    endedAt,
  }: {
    workOrderId: string;
    endedAt: string;
  }
): Promise<{ id: string; duration_minutes: number } | null> {
  const { data: active } = await supabase
    .from("work_order_labor_entries")
    .select("id, started_at")
    .eq("work_order_id", workOrderId)
    .eq("is_active", true)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!active) return null;

  const startedAt = (active as { started_at: string }).started_at;
  const durationMinutes = diffMinutes(startedAt, endedAt);
  const { data: updated, error } = await supabase
    .from("work_order_labor_entries")
    .update({
      ended_at: endedAt,
      duration_minutes: durationMinutes,
      is_active: false,
    })
    .eq("id", (active as { id: string }).id)
    .select("id, duration_minutes")
    .single();
  if (error) return null;
  return (
    (updated as { id: string; duration_minutes?: number } | null) != null
      ? {
          id: (updated as { id: string }).id,
          duration_minutes: Number(
            (updated as { duration_minutes?: number }).duration_minutes ?? durationMinutes
          ),
        }
      : null
  );
}

async function getTotalLaborMinutes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workOrderId: string
): Promise<number> {
  const { data: rows } = await supabase
    .from("work_order_labor_entries")
    .select("started_at, ended_at, duration_minutes")
    .eq("work_order_id", workOrderId);
  return (rows ?? []).reduce((sum, row) => {
    const typed = row as {
      started_at?: string | null;
      ended_at?: string | null;
      duration_minutes?: number | null;
    };
    if (typed.duration_minutes != null) return sum + Number(typed.duration_minutes);
    if (typed.started_at && typed.ended_at) return sum + diffMinutes(typed.started_at, typed.ended_at);
    return sum;
  }, 0);
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

const SLA_PRIORITIES = ["low", "medium", "high", "urgent", "emergency"] as const;
type SlaPriority = (typeof SLA_PRIORITIES)[number];

const DEFAULT_SLA_RESPONSE_TARGET_MINUTES: Record<SlaPriority, number> = {
  emergency: 60,
  urgent: 120,
  high: 240,
  medium: 1440,
  low: 4320,
};

const SUPPORTED_ATTACHMENT_MIME_TYPES = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

function isSupportedAttachmentMimeType(mimeType: string): boolean {
  const normalized = mimeType.toLowerCase();
  return normalized.startsWith("image/") || SUPPORTED_ATTACHMENT_MIME_TYPES.has(normalized);
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith("image/");
}

export type SaveWorkOrderOptions = {
  portalContext: { tenantId: string; companyId: string };
};

export async function saveWorkOrder(
  _prev: WorkOrderFormState,
  formData: FormData,
  options?: SaveWorkOrderOptions
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();

  if (!title) return { error: "Title is required." };
  if (!companyId) return { error: "Company is required." };

  let tenantId: string;
  if (options?.portalContext) {
    tenantId = options.portalContext.tenantId;
    if (companyId !== options.portalContext.companyId) return { error: "Invalid company." };
    const allowed = await companyBelongsToTenant(companyId, tenantId);
    if (!allowed) return { error: "Invalid company." };
  } else {
    const resolvedTenantId = await getTenantIdForUser(supabase);
    if (!resolvedTenantId) return { error: "Unauthorized." };
    tenantId = resolvedTenantId;
    const allowed = await companyBelongsToTenant(companyId, tenantId);
    if (!allowed) return { error: "Invalid company." };
  }

  const propertyId = (formData.get("property_id") as string)?.trim() || null;
  const buildingId = (formData.get("building_id") as string)?.trim() || null;
  const unitId = (formData.get("unit_id") as string)?.trim() || null;
  const assetId = (formData.get("asset_id") as string)?.trim() || null;
  const hasRequestIdField = formData.has("request_id");
  const requestId = hasRequestIdField
    ? (formData.get("request_id") as string | null)?.trim() || null
    : null;
  const customerIdForm = (formData.get("customer_id") as string)?.trim() || null;

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
  if (hasRequestIdField && requestId) {
    const { data: requestRow } = await supabase
      .from("work_requests")
      .select("id, tenant_id, company_id")
      .eq("id", requestId)
      .maybeSingle();
    if (!requestRow) return { error: "Selected work request was not found." };
    if ((requestRow as { tenant_id?: string | null }).tenant_id !== tenantId) {
      return { error: "Selected work request is out of scope." };
    }
    const requestCompanyId = (requestRow as { company_id?: string | null }).company_id ?? null;
    if (requestCompanyId && requestCompanyId !== companyId) {
      return { error: "Selected work request belongs to a different company." };
    }
  }

  const hierarchyError = await validateLocationHierarchy(supabase, {
    companyId,
    propertyId,
    buildingId,
    unitId,
  });
  if (hierarchyError) return { error: hierarchyError };
  let resolvedPropertyId = propertyId;
  let resolvedBuildingId = buildingId;
  let resolvedUnitId = unitId;
  if (assetId) {
    const resolvedAsset = await resolveAssetLocation(supabase, assetId);
    if (!resolvedAsset) return { error: "Selected asset was not found." };
    if (resolvedAsset.asset.company_id !== companyId) {
      return { error: "Selected asset does not belong to the selected company." };
    }
    if (
      propertyId &&
      resolvedAsset.effectivePropertyId !== null &&
      resolvedAsset.effectivePropertyId !== propertyId
    )
      return { error: "Selected asset does not match the selected property." };
    if (
      buildingId &&
      resolvedAsset.effectiveBuildingId !== null &&
      resolvedAsset.effectiveBuildingId !== buildingId
    )
      return { error: "Selected asset does not match the selected building." };
    if (
      unitId &&
      resolvedAsset.effectiveUnitId !== null &&
      resolvedAsset.effectiveUnitId !== unitId
    )
      return { error: "Selected asset does not match the selected unit." };
    // Inherit location from asset when form did not set property/building/unit
    resolvedPropertyId = resolvedPropertyId || (resolvedAsset.effectivePropertyId ?? null);
    resolvedBuildingId = resolvedBuildingId || (resolvedAsset.effectiveBuildingId ?? null);
    resolvedUnitId = resolvedUnitId || (resolvedAsset.effectiveUnitId ?? null);
  }
  // Inherit building_id and property_id from unit when unit is selected but those are missing
  if (resolvedUnitId && (!resolvedBuildingId || !resolvedPropertyId)) {
    const { data: u } = await supabase
      .from("units")
      .select("building_id")
      .eq("id", resolvedUnitId)
      .maybeSingle();
    if (u?.building_id) {
      resolvedBuildingId = resolvedBuildingId || u.building_id;
      if (!resolvedPropertyId) {
        const { data: b } = await supabase
          .from("buildings")
          .select("property_id")
          .eq("id", u.building_id)
          .maybeSingle();
        if (b?.property_id) resolvedPropertyId = b.property_id;
      }
    }
  }
  // Inherit property_id from building when building is selected but property is missing
  if (resolvedBuildingId && !resolvedPropertyId) {
    const { data: b } = await supabase
      .from("buildings")
      .select("property_id")
      .eq("id", resolvedBuildingId)
      .maybeSingle();
    if (b?.property_id) resolvedPropertyId = b.property_id;
  }
  const assignedTechnicianId =
    (formData.get("assigned_technician_id") as string)?.trim() || null;
  const assignedCrewId = (formData.get("assigned_crew_id") as string)?.trim() || null;
  const assignedVendorId = (formData.get("assigned_vendor_id") as string)?.trim() || null;
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
  const actorId = options?.portalContext ? null : await getActorId(supabase);

  const assignmentValidationError = await validateAssignmentTargets(supabase, {
    tenantId,
    companyId,
    technicianId: assignedTechnicianId,
    crewId: assignedCrewId,
    vendorId: assignedVendorId,
  });
  if (assignmentValidationError) return { error: assignmentValidationError };

  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    company_id: companyId,
    customer_id: customerIdForm || null,
    property_id: resolvedPropertyId || null,
    building_id: resolvedBuildingId || null,
    unit_id: resolvedUnitId || null,
    asset_id: assetId || null,
    title,
    description: (formData.get("description") as string)?.trim() || null,
    safety_notes: (formData.get("safety_notes") as string)?.trim() || null,
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
    vendor_id: assignedVendorId,
    estimated_hours: estimatedHoursRaw ? parseFloat(estimatedHoursRaw) : null,
    estimated_technicians: estimatedTechniciansRaw ? parseInt(estimatedTechniciansRaw, 10) : null,
    billable,
    nte_amount: nteAmountRaw ? parseFloat(nteAmountRaw) : null,
  };
  if (hasRequestIdField) {
    payload.request_id = requestId;
  }
  payload.created_by_user_id = actorId;
  if (options?.portalContext) {
    payload.source_type = "portal";
  }

  const scheduleExists = Boolean(
    payload.scheduled_date || payload.scheduled_start || payload.scheduled_end
  );
  const assignmentExists = Boolean(
    payload.assigned_technician_id || payload.assigned_crew_id || payload.vendor_id
  );
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
    // Prevent edits to terminal-state work orders. Use status change actions instead.
    const currentStatus = String((row as Record<string, unknown>).status ?? "");
    if (TERMINAL_STATUSES.has(currentStatus)) {
      return { error: "Cannot edit a completed or cancelled work order." };
    }
    const beforeState = row as Record<string, unknown>;
    const updateWithSafety = await supabase
      .from("work_orders")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    const { safety_notes: _ignoredSafetyNotes, ...payloadWithoutSafetyNotes } = payload;
    const updateLegacy =
      updateWithSafety.error &&
      updateWithSafety.error.message.toLowerCase().includes("safety_notes")
        ? await supabase
            .from("work_orders")
            .update(payloadWithoutSafetyNotes)
            .eq("id", id)
            .select("*")
            .single()
        : null;
    const updated = updateLegacy?.data ?? updateWithSafety.data;
    const error = updateLegacy?.error ?? updateWithSafety.error;
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
    const locationInherited =
      resolvedPropertyId !== propertyId ||
      resolvedBuildingId !== buildingId ||
      resolvedUnitId !== unitId;
    if (locationInherited) {
      await insertActivityLog(supabase, {
        tenantId,
        companyId: (afterState.company_id as string) ?? companyId,
        entityType: "work_order",
        entityId: id,
        actionType: "work_order_location_resolved",
        performedBy: actorId,
        afterState: {
          property_id: afterState.property_id,
          building_id: afterState.building_id,
          unit_id: afterState.unit_id,
          asset_id: afterState.asset_id,
          latitude: afterState.latitude,
          longitude: afterState.longitude,
        },
        metadata: { source: "saveWorkOrder", inherited: true },
      });
    }

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
    const insertWithSafety = await supabase
      .from("work_orders")
      .insert(payload)
      .select("*")
      .single();
    const { safety_notes: _ignoredSafetyNotes, ...payloadWithoutSafetyNotes } = payload;
    const insertLegacy =
      insertWithSafety.error &&
      insertWithSafety.error.message.toLowerCase().includes("safety_notes")
        ? await supabase
            .from("work_orders")
            .insert(payloadWithoutSafetyNotes)
            .select("*")
            .single()
        : null;
    const inserted = insertLegacy?.data ?? insertWithSafety.data;
    const error = insertLegacy?.error ?? insertWithSafety.error;
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
    const insertedId = (inserted as { id: string }).id;
    const insertedRecord = inserted as Record<string, unknown>;
    const woNumber = (insertedRecord.work_order_number as string | undefined);

    // Notify creator.
    if (actorId) {
      await createNotification(supabase, {
        companyId,
        userId: actorId,
        eventType: "work_order.created",
        title: `Work order created: ${title}`,
        message: woNumber,
        entityType: "work_order",
        entityId: insertedId,
        metadata: { work_order_number: woNumber },
      });
    }

    // If the work order was created already-assigned, notify the assigned technician
    // so they don't miss it. The creator notification above goes to the dispatcher;
    // the technician needs a separate signal.
    const assignedTechId = (insertedRecord.assigned_technician_id as string | null) ?? null;
    if (assignedTechId && assignedTechId !== actorId) {
      // Look up the user_id linked to this technician record.
      const { data: techRow } = await supabase
        .from("technicians")
        .select("user_id")
        .eq("id", assignedTechId)
        .maybeSingle();
      const techUserId = (techRow as { user_id?: string | null } | null)?.user_id ?? null;
      if (techUserId) {
        await createNotification(supabase, {
          companyId,
          userId: techUserId,
          eventType: "work_order.assigned",
          title: `You have been assigned: ${title}`,
          message: woNumber,
          entityType: "work_order",
          entityId: insertedId,
          metadata: { work_order_number: woNumber, assigned_by: actorId },
        }).catch(() => { /* Non-fatal */ });
      }
    }
    const locationInherited =
      resolvedPropertyId !== propertyId ||
      resolvedBuildingId !== buildingId ||
      resolvedUnitId !== unitId;
    if (locationInherited) {
      await insertActivityLog(supabase, {
        tenantId,
        companyId,
        entityType: "work_order",
        entityId: (inserted as { id: string }).id,
        actionType: "work_order_location_resolved",
        performedBy: actorId,
        afterState: {
          property_id: insertedRecord.property_id,
          building_id: insertedRecord.building_id,
          unit_id: insertedRecord.unit_id,
          asset_id: insertedRecord.asset_id,
          latitude: insertedRecord.latitude,
          longitude: insertedRecord.longitude,
        },
        metadata: { source: "saveWorkOrder", inherited: true },
      });
    }
    revalidatePath("/work-orders");
    revalidatePath("/dispatch");
    return {
      success: true,
      workOrderId: (inserted as { id: string }).id,
      workOrderNumber: (inserted as { work_order_number?: string }).work_order_number ?? undefined,
    };
  }
  revalidatePath("/work-orders");
  revalidatePath("/dispatch");
  return { success: true };
}

export async function deleteWorkOrder(id: string): Promise<WorkOrderFormState> {
  // Require explicit delete permission — tenant membership alone is not enough.
  try {
    await requirePermission("work_orders.delete");
  } catch {
    return { error: "You do not have permission to delete work orders." };
  }

  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id, assigned_technician_id, assigned_crew_id, work_order_number, title, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  // Capture snapshot before deletion for audit trail.
  const snapshot = row as Record<string, unknown>;

  const { error } = await supabase.from("work_orders").delete().eq("id", id);
  if (error) return { error: error.message };

  // Write audit/activity log so deletions are traceable.
  const actorId = (await supabase.auth.getUser()).data.user?.id ?? null;
  await insertActivityLog(supabase, {
    tenantId,
    companyId: snapshot.company_id as string,
    entityType: "work_order",
    entityId: id,
    actionType: "work_order_deleted",
    performedBy: actorId,
    beforeState: snapshot,
    metadata: {
      work_order_number: snapshot.work_order_number,
      title: snapshot.title,
      status: snapshot.status,
    },
  }).catch(() => { /* Non-fatal: don't block delete response on audit log failure */ });

  revalidatePath("/work-orders");
  return { success: true };
}

export async function updateWorkOrderStatus(
  id: string,
  newStatus: string
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  if (!isSupportedStatus(newStatus)) return { error: "Invalid status." };
  const normalizedStatus = normalizeStatus(newStatus);
  if (normalizedStatus === "completed") {
    return { error: "Use Complete Work Order to mark work orders as completed." };
  }

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
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (beforeState.assigned_technician_id as string | null | undefined) ?? null,
      assigned_crew_id:
        (beforeState.assigned_crew_id as string | null | undefined) ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }
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
  const companyId = (afterState.company_id as string) ?? (beforeState.company_id as string);
  const actorTechnicianId = await resolveActorTechnicianIdForCompany(supabase, {
    actorId,
    companyId: companyId ?? null,
  });
  if (
    toComparableStatus(beforeState.status as string | null) !== "in_progress" &&
    toComparableStatus(normalizedStatus) === "in_progress"
  ) {
    await startLaborSession(supabase, {
      workOrderId: id,
      technicianId: actorTechnicianId,
      actorId,
      startedAt:
        (afterState.started_at as string | null) ??
        (updatePayload.started_at as string | undefined) ??
        new Date().toISOString(),
    });
  }
  if (
    toComparableStatus(beforeState.status as string | null) === "in_progress" &&
    ["on_hold", "cancelled"].includes(toComparableStatus(normalizedStatus))
  ) {
    await stopLaborSession(supabase, {
      workOrderId: id,
      endedAt:
        (afterState.last_paused_at as string | null) ??
        new Date().toISOString(),
    });
  }

  await insertActivityLog(supabase, {
    tenantId,
    companyId,
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
    await insertActivityLog(supabase, {
      tenantId,
      companyId: (afterState.company_id as string) ?? (beforeState.company_id as string),
      entityType: "work_order",
      entityId: id,
      actionType: "work_order.started",
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
    await insertActivityLog(supabase, {
      tenantId,
      companyId: (afterState.company_id as string) ?? (beforeState.company_id as string),
      entityType: "work_order",
      entityId: id,
      actionType: "work_order.paused",
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
  revalidatePath("/technician/jobs");
  revalidatePath("/technician/work");
  revalidatePath(`/technician/jobs/${id}`);
  revalidatePath("/portal/work-orders");
  revalidatePath(`/portal/work-orders/${id}`);
  return { success: true };
}

/** Bulk update status for multiple work orders. Fails fast on first error. */
export async function bulkUpdateWorkOrderStatus(
  ids: string[],
  newStatus: string
): Promise<WorkOrderFormState> {
  if (ids.length === 0) return { error: "No work orders selected." };
  if (!isSupportedStatus(newStatus)) return { error: "Invalid status." };
  const normalizedStatus = normalizeStatus(newStatus);
  if (normalizedStatus === "completed") {
    return { error: "Use Complete Work Order to mark work orders as completed." };
  }
  for (const id of ids) {
    const result = await updateWorkOrderStatus(id, newStatus);
    if (result.error) return result;
  }
  return { success: true };
}

/** Bulk delete work orders. Fails fast on first error. */
export async function bulkDeleteWorkOrders(ids: string[]): Promise<WorkOrderFormState> {
  if (ids.length === 0) return { error: "No work orders selected." };
  for (const id of ids) {
    const result = await deleteWorkOrder(id);
    if (result.error) return result;
  }
  return { success: true };
}

/** Log a dispatch rebalance event (schedule optimization applied). */
export async function logDispatchRebalance(
  movedJobIds: string[],
  selectedDate: string,
  companyId: string | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const actorId = await getActorId(supabase);
  await insertActivityLog(supabase, {
    tenantId,
    companyId: companyId ?? undefined,
    entityType: "dispatch",
    entityId: `rebalance-${selectedDate}`,
    actionType: "schedule_rebalanced",
    performedBy: actorId,
    metadata: {
      message: "Schedule rebalanced by dispatcher",
      movedJobIds,
      selectedDate,
    },
  });
  return {};
}

export type WorkOrderSlaPolicyInput = {
  priority: SlaPriority;
  response_target_minutes: number;
};

export async function upsertWorkOrderSlaPolicies(
  companyId: string,
  policies: WorkOrderSlaPolicyInput[]
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  if (!companyId) return { error: "Company is required." };
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const actorId = await getActorId(supabase);

  const incoming = new Map<SlaPriority, number>();
  for (const policy of policies) {
    if (!SLA_PRIORITIES.includes(policy.priority)) continue;
    const minutes = Number(policy.response_target_minutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return { error: `Response target for ${policy.priority} must be greater than zero.` };
    }
    incoming.set(policy.priority, Math.round(minutes));
  }

  const upsertRows = SLA_PRIORITIES.map((priority) => ({
    company_id: companyId,
    priority,
    response_target_minutes:
      incoming.get(priority) ?? DEFAULT_SLA_RESPONSE_TARGET_MINUTES[priority],
  }));

  const { error } = await supabase
    .from("work_order_sla_policies")
    .upsert(upsertRows, { onConflict: "company_id,priority" });
  if (error) return { error: error.message };

  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order_sla_policy",
    entityId: companyId,
    actionType: "work_order_sla_policy_updated",
    performedBy: actorId,
    metadata: {
      policies: upsertRows,
      source: "upsertWorkOrderSlaPolicies",
    },
  });

  revalidatePath("/work-orders");
  revalidatePath("/dispatch");
  return { success: true };
}

export type WorkOrderAssignmentPayload = {
  assigned_technician_id: string | null;
  assigned_crew_id: string | null;
  assigned_vendor_id?: string | null;
  scheduled_date?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
};

export async function updateWorkOrderAssignment(
  id: string,
  payload: WorkOrderAssignmentPayload
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
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
  const nextVendorId = payload.assigned_vendor_id || null;
  const assignmentValidationError = await validateAssignmentTargets(supabase, {
    tenantId,
    companyId: (beforeState.company_id as string) ?? "",
    technicianId: nextTechnicianId,
    crewId: nextCrewId,
    vendorId: nextVendorId,
  });
  if (assignmentValidationError) return { error: assignmentValidationError };
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
  const hasAssignment = Boolean(nextTechnicianId || nextCrewId || nextVendorId);
  const statusComparable = toComparableStatus(status);
  let nextStatus = normalizeStatus(status);
  if (["new", "ready_to_schedule", "scheduled", "draft"].includes(statusComparable)) {
    if (hasSchedule && hasAssignment) nextStatus = "scheduled";
    else nextStatus = "ready_to_schedule";
  }

  const update: Record<string, unknown> = {
    assigned_technician_id: nextTechnicianId,
    assigned_crew_id: nextCrewId,
    vendor_id: nextVendorId,
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
    beforeState.assigned_technician_id ||
      beforeState.assigned_crew_id ||
      beforeState.vendor_id
  );
  const beforeHadSchedule = Boolean(
    beforeState.scheduled_date || beforeState.scheduled_start || beforeState.scheduled_end
  );
  const assignmentChanged =
    (beforeState.assigned_technician_id as string | null) !== nextTechnicianId ||
    (beforeState.assigned_crew_id as string | null) !== nextCrewId ||
    (beforeState.vendor_id as string | null) !== nextVendorId;
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
        vendor_id: beforeState.vendor_id as string | null,
      },
      afterState: {
        assigned_technician_id: nextTechnicianId,
        assigned_crew_id: nextCrewId,
        vendor_id: nextVendorId,
      },
      metadata: { source: "updateWorkOrderAssignment" },
    });
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: beforeHadAssignment ? "work_order.reassigned" : "work_order.assigned",
      performedBy: actorId,
      beforeState: {
        assigned_technician_id: beforeState.assigned_technician_id as string | null,
        assigned_crew_id: beforeState.assigned_crew_id as string | null,
        vendor_id: beforeState.vendor_id as string | null,
      },
      afterState: {
        assigned_technician_id: nextTechnicianId,
        assigned_crew_id: nextCrewId,
        vendor_id: nextVendorId,
      },
      metadata: { source: "updateWorkOrderAssignment", transport: "dispatch" },
    });

    try {
      const workOrderLabel =
        (afterState.work_order_number as string | null) ??
        (afterState.title as string | null) ??
        "Work order";
      const msg = `${workOrderLabel} was assigned.`;
      await dispatchNotificationEvent(supabase, {
        tenantId,
        companyId,
        eventType: "work_order.assigned",
        entityType: "work_order",
        entityId: id,
        title: msg,
        message: msg,
        includeAllTenantMembers: true,
      });
      const recipients = await getCompanyAlertRecipients(
        supabase,
        companyId ? [companyId] : []
      );
      await sendEmailAlert({
        subject: "Work order assigned",
        message: `${workOrderLabel} was assigned and scheduled for execution.`,
        recipients,
      });
    } catch {
      // Notification delivery is best-effort and should not block assignment updates.
    }
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
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: "dispatch.route_updated",
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
      metadata: { source: "updateWorkOrderAssignment", route_update: true },
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
        vendor_id: beforeState.vendor_id as string | null,
        scheduled_date: beforeState.scheduled_date as string | null,
        scheduled_start: beforeState.scheduled_start as string | null,
        scheduled_end: beforeState.scheduled_end as string | null,
      },
      afterState: {
        assigned_technician_id: null,
        assigned_crew_id: null,
        vendor_id: null,
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
  revalidatePath("/technician/jobs");
  revalidatePath("/technician/work");
  revalidatePath(`/technician/jobs/${id}`);
  revalidatePath("/portal/work-orders");
  revalidatePath(`/portal/work-orders/${id}`);
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
  vendor_cost?: number | null;
  follow_up_required?: boolean;
  customer_visible_summary?: string | null;
  internal_completion_notes?: string | null;
  completed_by_technician_id?: string | null;
  completion_status?: string | null;
  enforce_checklist_completion?: boolean;
};

const VALID_COMPLETION_STATUSES = ["successful", "partially_completed", "deferred", "unable_to_complete"] as const;

export async function completeWorkOrder(
  id: string,
  payload: WorkOrderCompletionPayload
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const resolutionSummary = (payload.resolution_summary ?? "").trim();
  if (!resolutionSummary) return { error: "Resolution summary is required." };
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
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (beforeState.assigned_technician_id as string | null | undefined) ?? null,
      assigned_crew_id:
        (beforeState.assigned_crew_id as string | null | undefined) ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }
  if (String(beforeState.status ?? "") === "cancelled") {
    return { error: "Cancelled work orders cannot be completed." };
  }
  if (!beforeState.started_at) {
    return { error: "Work order must be started before it can be completed." };
  }
  if (payload.enforce_checklist_completion) {
    const { count } = await supabase
      .from("work_order_checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("work_order_id", id)
      .eq("completed", false);
    if (Number(count ?? 0) > 0) {
      return {
        error: `Complete required checklist items before closing this job. ${count} item(s) remaining.`,
      };
    }
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
    vendor_cost: payload.vendor_cost ?? null,
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
  const actorTechnicianId = await resolveActorTechnicianIdForCompany(supabase, {
    actorId,
    companyId: companyId ?? null,
  });
  const closedLaborSession = await stopLaborSession(supabase, {
    workOrderId: id,
    endedAt: completedAt,
  });
  const totalLaborMinutes = await getTotalLaborMinutes(supabase, id);
  const derivedActualHours =
    totalLaborMinutes > 0 ? Number((totalLaborMinutes / 60).toFixed(2)) : null;
  const finalActualHours = payload.actual_hours ?? derivedActualHours;
  if (
    finalActualHours != null &&
    Number(afterState.actual_hours ?? NaN) !== finalActualHours
  ) {
    await supabase
      .from("work_orders")
      .update({ actual_hours: finalActualHours })
      .eq("id", id);
    afterState.actual_hours = finalActualHours;
  }

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
      actual_hours: finalActualHours,
      vendor_cost: payload.vendor_cost ?? null,
      completion_status: completionStatus,
    },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: id,
    actionType: "work_order.completed",
    performedBy: actorId,
    metadata: {
      completed_at: completedAt,
      actual_hours: finalActualHours,
      vendor_cost: payload.vendor_cost ?? null,
      completion_status: completionStatus,
    },
  });
  if (closedLaborSession || totalLaborMinutes > 0) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "work_order",
      entityId: id,
      actionType: "labor_logged",
      performedBy: actorId,
      metadata: {
        technician_id: payload.completed_by_technician_id ?? actorTechnicianId,
        total_labor_minutes: totalLaborMinutes,
        total_labor_hours: finalActualHours,
        closed_labor_entry_id: closedLaborSession?.id ?? null,
      },
    });
  }
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
    try {
      await calculateAssetHealth(assetId);
    } catch {
      // Keep completion flow resilient even if intelligence recalculation fails.
    }
    revalidateAssetIntelligenceCaches({ assetId, companyId });
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
  revalidatePath("/technician/jobs");
  revalidatePath("/technician/work");
  revalidatePath(`/technician/jobs/${id}`);
  revalidatePath("/portal/work-orders");
  revalidatePath(`/portal/work-orders/${id}`);
  if (assetId) {
    revalidatePath("/assets");
    revalidatePath(`/assets/${assetId}`);
    revalidatePath("/assets/intelligence");
  }
  return { success: true };
}

export type WorkOrderLaborLogPayload = {
  start_time: string;
  end_time: string;
  labor_hours?: number | null;
  notes?: string | null;
  technician_id?: string | null;
};

export async function logWorkOrderLabor(
  workOrderId: string,
  payload: WorkOrderLaborLogPayload
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const actorId = await getActorId(supabase);
  const { data: workOrder } = await supabase
    .from("work_orders")
    .select("company_id, status, assigned_technician_id, assigned_crew_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!workOrder) return { error: "Work order not found." };
  const companyId = (workOrder as { company_id?: string | null }).company_id ?? null;
  if (!companyId) return { error: "Work order company is missing." };
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (workOrder as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
      assigned_crew_id:
        (workOrder as { assigned_crew_id?: string | null }).assigned_crew_id ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }
  if ((workOrder as { status?: string | null }).status === "cancelled") {
    return { error: "Cannot log labor on cancelled work orders." };
  }

  const startIso = payload.start_time ? new Date(payload.start_time).toISOString() : null;
  const endIso = payload.end_time ? new Date(payload.end_time).toISOString() : null;
  if (!startIso || !endIso) {
    return { error: "Start time and end time are required." };
  }
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    return { error: "End time must be after start time." };
  }

  const durationMinutes = Number.isFinite(payload.labor_hours)
    ? Math.max(0, Math.round(Number(payload.labor_hours) * 60))
    : diffMinutes(startIso, endIso);
  if (durationMinutes <= 0) {
    return { error: "Labor duration must be greater than zero." };
  }

  const resolvedTechnicianId =
    payload.technician_id ||
    (await resolveActorTechnicianIdForCompany(supabase, { actorId, companyId }));
  const notes = (payload.notes ?? "").trim() || null;

  const { data: inserted, error } = await supabase
    .from("work_order_labor_entries")
    .insert({
      work_order_id: workOrderId,
      technician_id: resolvedTechnicianId,
      created_by_user_id: actorId,
      started_at: startIso,
      ended_at: endIso,
      duration_minutes: durationMinutes,
      notes,
      is_active: false,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "labor_logged",
    performedBy: actorId,
    metadata: {
      labor_entry_id: (inserted as { id?: string } | null)?.id ?? null,
      technician_id: resolvedTechnicianId,
      start_time: startIso,
      end_time: endIso,
      duration_minutes: durationMinutes,
      duration_hours: Number((durationMinutes / 60).toFixed(2)),
      notes,
    },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "labor.logged",
    performedBy: actorId,
    metadata: {
      labor_entry_id: (inserted as { id?: string } | null)?.id ?? null,
      technician_id: resolvedTechnicianId,
      start_time: startIso,
      end_time: endIso,
      duration_minutes: durationMinutes,
      duration_hours: Number((durationMinutes / 60).toFixed(2)),
      notes,
    },
  });

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath(`/technicians/work-queue/${workOrderId}`);
  revalidatePath(`/technician/jobs/${workOrderId}`);
  revalidatePath("/technician/work");
  revalidatePath(`/portal/work-orders/${workOrderId}`);
  revalidatePath("/portal/work-orders");
  return { success: true };
}

export async function addWorkOrderNote(
  workOrderId: string,
  body: string,
  noteType: "internal" | "customer_visible" | "completion" = "internal",
  technicianId: string | null = null
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (row as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
      assigned_crew_id:
        (row as { assigned_crew_id?: string | null }).assigned_crew_id ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }
  const resolvedTechnicianId =
    technicianId ||
    (await resolveActorTechnicianIdForCompany(supabase, {
      actorId,
      companyId: (row as { company_id?: string | null }).company_id ?? null,
    }));
  const { error } = await supabase.from("work_order_notes").insert({
    work_order_id: workOrderId,
    body: body.trim(),
    note_type: noteType,
    created_by_id: actorId,
    technician_id: resolvedTechnicianId,
  });
  if (error) return { error: error.message };
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (row as { company_id: string }).company_id,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "work_order_note_added",
    performedBy: actorId,
    metadata: {
      note_type: noteType,
      technician_id: resolvedTechnicianId,
      body_excerpt: body.trim().slice(0, 180),
    },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (row as { company_id: string }).company_id,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "note.added",
    performedBy: actorId,
    metadata: {
      note_type: noteType,
      technician_id: resolvedTechnicianId,
      body_excerpt: body.trim().slice(0, 180),
    },
  });

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath(`/technicians/work-queue/${workOrderId}`);
  revalidatePath(`/technician/jobs/${workOrderId}`);
  revalidatePath("/technician/work");
  revalidatePath(`/portal/work-orders/${workOrderId}`);
  revalidatePath("/portal/work-orders");
  return { success: true };
}

export async function uploadWorkOrderAttachment(
  workOrderId: string,
  payload: {
    fileDataUrl: string;
    fileName: string;
    mimeType: string;
    caption?: string | null;
    technicianId?: string | null;
    restrictToImages?: boolean;
  }
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("work_orders")
    .select("company_id, asset_id, assigned_technician_id, assigned_crew_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!row) return { error: "Work order not found." };
  const companyId = (row as { company_id?: string | null }).company_id ?? null;
  if (!companyId) return { error: "Work order company is missing." };
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (row as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
      assigned_crew_id:
        (row as { assigned_crew_id?: string | null }).assigned_crew_id ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }

  const dataUrl = (payload.fileDataUrl ?? "").trim();
  const mimeType = (payload.mimeType ?? "").trim().toLowerCase();
  if (!dataUrl.startsWith("data:")) {
    return { error: "Invalid attachment format." };
  }
  if (!mimeType || !isSupportedAttachmentMimeType(mimeType)) {
    return {
      error:
        "Unsupported attachment type. Allowed: images, PDF, Word documents, and plain text files.",
    };
  }
  if (payload.restrictToImages && !isImageMimeType(mimeType)) {
    return { error: "Only image uploads are supported." };
  }
  const maxLength = isImageMimeType(mimeType) ? 8_000_000 : 12_000_000;
  if (dataUrl.length > maxLength) {
    return {
      error: isImageMimeType(mimeType)
        ? "Image is too large. Please use an image under 6MB."
        : "Attachment is too large. Please use a file under 9MB.",
    };
  }

  const name = sanitizeFileName(payload.fileName || "attachment") || "attachment";
  const caption = (payload.caption ?? "").trim() || null;
  const resolvedTechnicianId =
    payload.technicianId ||
    (await resolveActorTechnicianIdForCompany(supabase, { actorId, companyId }));

  const { data: inserted, error } = await supabase
    .from("work_order_attachments")
    .insert({
      work_order_id: workOrderId,
      file_name: name,
      file_url: dataUrl,
      file_type: mimeType,
      uploaded_by_user_id: actorId,
      uploaded_by: actorId,
      uploaded_at: new Date().toISOString(),
      technician_id: resolvedTechnicianId,
      caption,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const isImage = isImageMimeType(mimeType);
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: isImage ? "work_order_photo_uploaded" : "work_order_attachment_uploaded",
    performedBy: actorId,
    metadata: {
      attachment_id: (inserted as { id?: string } | null)?.id ?? null,
      file_name: name,
      mime_type: mimeType,
      technician_id: resolvedTechnicianId,
      caption,
    },
  });
  if (isImage && (row as { asset_id?: string | null }).asset_id) {
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "asset",
      entityId: (row as { asset_id: string }).asset_id,
      actionType: "asset_service_photo_added",
      performedBy: actorId,
      metadata: {
        work_order_id: workOrderId,
        attachment_id: (inserted as { id?: string } | null)?.id ?? null,
        technician_id: resolvedTechnicianId,
      },
    });
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath(`/technicians/work-queue/${workOrderId}`);
  revalidatePath(`/technician/jobs/${workOrderId}`);
  revalidatePath("/technician/work");
  revalidatePath(`/portal/work-orders/${workOrderId}`);
  revalidatePath("/portal/work-orders");
  revalidatePath("/assets");
  if ((row as { asset_id?: string | null }).asset_id) {
    revalidatePath(`/assets/${(row as { asset_id: string }).asset_id}`);
  }
  return { success: true };
}

export async function uploadWorkOrderPhoto(
  workOrderId: string,
  payload: {
    fileDataUrl: string;
    fileName: string;
    mimeType: string;
    caption?: string | null;
    technicianId?: string | null;
  }
): Promise<WorkOrderFormState> {
  return uploadWorkOrderAttachment(workOrderId, {
    ...payload,
    restrictToImages: true,
  });
}

export async function toggleWorkOrderChecklistItem(
  itemId: string,
  completed: boolean
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const actorId = await getActorId(supabase);
  const { data: item } = await supabase
    .from("work_order_checklist_items")
    .select("work_order_id, label, completed")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "Checklist item not found." };
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id, assigned_technician_id, assigned_crew_id")
    .eq("id", item.work_order_id)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(wo.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (wo as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
      assigned_crew_id:
        (wo as { assigned_crew_id?: string | null }).assigned_crew_id ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }
  const { error } = await supabase
    .from("work_order_checklist_items")
    .update({ completed })
    .eq("id", itemId);
  if (error) return { error: error.message };
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (wo as { company_id: string }).company_id,
    entityType: "work_order",
    entityId: item.work_order_id,
    actionType: "work_order_checklist_toggled",
    performedBy: actorId,
    metadata: {
      checklist_item_id: itemId,
      label: (item as { label?: string | null }).label ?? null,
      completed,
      previous_completed: (item as { completed?: boolean | null }).completed ?? null,
    },
  });
  revalidatePath(`/work-orders/${item.work_order_id}`);
  revalidatePath(`/technicians/work-queue/${item.work_order_id}`);
  revalidatePath(`/technician/jobs/${item.work_order_id}`);
  revalidatePath("/technician/work");
  revalidatePath(`/portal/work-orders/${item.work_order_id}`);
  revalidatePath("/portal/work-orders");
  return { success: true };
}

export async function addWorkOrderChecklistItem(
  workOrderId: string,
  label: string
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const trimmed = (label ?? "").trim();
  if (!trimmed) return { error: "Label is required." };
  const actorId = await getActorId(supabase);
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id, assigned_technician_id, assigned_crew_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant(wo.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (wo as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
      assigned_crew_id:
        (wo as { assigned_crew_id?: string | null }).assigned_crew_id ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }
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
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (wo as { company_id: string }).company_id,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "work_order_checklist_item_added",
    performedBy: actorId,
    metadata: {
      label: trimmed,
      sort_order: sortOrder,
    },
  });
  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath(`/technicians/work-queue/${workOrderId}`);
  revalidatePath(`/technician/jobs/${workOrderId}`);
  revalidatePath("/technician/work");
  revalidatePath(`/portal/work-orders/${workOrderId}`);
  revalidatePath("/portal/work-orders");
  return { success: true };
}

export type AddPartUsagePayload = {
  inventory_item_id?: string | null;
  product_id?: string | null;
  stock_location_id?: string | null;
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
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  if (payload.quantity_used <= 0) return { error: "Quantity must be greater than zero." };
  const actorId = await getActorId(supabase);
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id, status, asset_id, assigned_technician_id, assigned_crew_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const allowed = await companyBelongsToTenant((wo as { company_id: string }).company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  const portalGuard = await resolvePortalTechnicianGuard(supabase);
  if (
    !portalGuardHasWorkOrderAccess(portalGuard, {
      assigned_technician_id:
        (wo as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
      assigned_crew_id:
        (wo as { assigned_crew_id?: string | null }).assigned_crew_id ?? null,
    })
  ) {
    return { error: "Unauthorized." };
  }

  const companyId = (wo as { company_id: string }).company_id;
  let unitCost = payload.unit_cost;
  let partName = payload.part_name_snapshot ?? null;
  let sku = payload.sku_snapshot ?? null;
  let unitOfMeasure = payload.unit_of_measure ?? null;
  let resolvedProductId = payload.product_id ?? null;
  const resolvedStockLocationId = payload.stock_location_id ?? null;

  if (resolvedProductId) {
    const { data: product } = await supabase
      .from("products")
      .select("id, company_id, name, sku, unit_of_measure, default_cost")
      .eq("id", resolvedProductId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!product) return { error: "Product not found or access denied." };
    const productRow = product as {
      name?: string | null;
      sku?: string | null;
      unit_of_measure?: string | null;
      default_cost?: number | null;
    };
    if (unitCost == null && productRow.default_cost != null) unitCost = Number(productRow.default_cost);
    if (!partName) partName = productRow.name ?? null;
    if (!sku) sku = productRow.sku ?? null;
    if (!unitOfMeasure) unitOfMeasure = productRow.unit_of_measure ?? null;
  }

  if (payload.inventory_item_id && !resolvedProductId) {
    const { data: item } = await supabase
      .from("inventory_items")
      .select("id, product_id, name, sku, unit, cost, quantity")
      .eq("id", payload.inventory_item_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!item) return { error: "Inventory item not found or access denied." };
    const inv = item as {
      product_id?: string | null;
      name: string;
      sku?: string | null;
      unit?: string | null;
      cost?: number | null;
      quantity?: number;
    };
    if (inv.product_id) resolvedProductId = inv.product_id;
    if (unitCost == null && inv.cost != null) unitCost = inv.cost;
    if (!partName) partName = inv.name;
    if (!sku) sku = inv.sku ?? null;
    if (!unitOfMeasure) unitOfMeasure = inv.unit ?? null;
  }

  if (payload.deduct_inventory && !resolvedProductId) {
    return { error: "Selected part is not mapped to a product record and cannot be deducted from inventory." };
  }

  if (resolvedStockLocationId) {
    const { data: stockLocation } = await supabase
      .from("stock_locations")
      .select("id, company_id, active")
      .eq("id", resolvedStockLocationId)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!stockLocation) return { error: "Stock location not found or access denied." };
    if ((stockLocation as { active?: boolean | null }).active === false) {
      return { error: "Stock location is inactive." };
    }
  }

  if (payload.deduct_inventory && resolvedProductId && !resolvedStockLocationId) {
    return { error: "Select a stock location before deducting inventory." };
  }

  const finalUnitCost = unitCost ?? 0;
  const totalCost = payload.quantity_used * finalUnitCost;

  const { data: inserted, error: insertError } = await supabase
    .from("work_order_part_usage")
    .insert({
      work_order_id: workOrderId,
      inventory_item_id: payload.inventory_item_id || null,
      product_id: resolvedProductId,
      stock_location_id: resolvedStockLocationId,
      part_name_snapshot: partName,
      sku_snapshot: sku,
      unit_of_measure: unitOfMeasure,
      quantity_used: payload.quantity_used,
      unit_cost: finalUnitCost,
      unit_cost_snapshot: finalUnitCost,
      total_cost: totalCost,
      notes: payload.notes || null,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };
  if (!inserted?.id) return { error: "Failed to create part usage." };

  if (payload.deduct_inventory && resolvedProductId && resolvedStockLocationId) {
    const { error: txError } = await supabase.rpc("record_inventory_transaction", {
      p_company_id: companyId,
      p_product_id: resolvedProductId,
      p_stock_location_id: resolvedStockLocationId,
      p_quantity_change: -payload.quantity_used,
      p_transaction_type: "part_used_on_work_order",
      p_reference_type: "work_order",
      p_reference_id: workOrderId,
      p_notes: payload.notes || `Work order ${workOrderId}`,
      p_idempotency_key: `wo-part:${inserted.id}`,
      p_unit_cost_snapshot: finalUnitCost,
    });
    if (txError) {
      await supabase.from("work_order_part_usage").delete().eq("id", inserted.id);
      return { error: `Failed to deduct inventory: ${txError.message}` };
    }
  }

  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "work_order_part_added",
    performedBy: actorId,
    metadata: {
      part_usage_id: inserted.id,
      inventory_item_id: payload.inventory_item_id ?? null,
      product_id: resolvedProductId,
      stock_location_id: resolvedStockLocationId,
      part_name_snapshot: partName,
      quantity_used: payload.quantity_used,
      unit_cost: finalUnitCost,
      total_cost: totalCost,
      technician_id: (wo as { assigned_technician_id?: string | null }).assigned_technician_id ?? null,
    },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "part_used_on_work_order",
    performedBy: actorId,
    metadata: {
      part_usage_id: inserted.id,
      product_id: resolvedProductId,
      stock_location_id: resolvedStockLocationId,
      quantity_used: payload.quantity_used,
      unit_cost_snapshot: finalUnitCost,
      total_cost: totalCost,
    },
  });
  await insertActivityLog(supabase, {
    tenantId,
    companyId,
    entityType: "work_order",
    entityId: workOrderId,
    actionType: "parts.consumed",
    performedBy: actorId,
    metadata: {
      part_usage_id: inserted.id,
      product_id: resolvedProductId,
      stock_location_id: resolvedStockLocationId,
      quantity_used: payload.quantity_used,
      unit_cost_snapshot: finalUnitCost,
      total_cost: totalCost,
    },
  });

  const assetId = (wo as { asset_id?: string | null }).asset_id ?? null;
  if (assetId) {
    try {
      await calculateAssetHealth(assetId);
    } catch {
      // Keep part usage logging resilient even if intelligence recalculation fails.
    }
    revalidateAssetIntelligenceCaches({ assetId, companyId });
    revalidatePath("/assets/intelligence");
  }

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath(`/technicians/work-queue/${workOrderId}`);
  revalidatePath(`/technician/jobs/${workOrderId}`);
  revalidatePath("/technician/work");
  revalidatePath(`/portal/work-orders/${workOrderId}`);
  revalidatePath("/portal/work-orders");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Work order material lines (plan, reserve, issue)
// ---------------------------------------------------------------------------

function deriveMaterialLineStatus(
  required: number,
  reserved: number,
  issued: number
): "needed" | "partially_reserved" | "reserved" | "partially_issued" | "issued" | "backordered" {
  if (required <= 0) return "needed";
  if (issued >= required) return "issued";
  if (issued > 0) return "partially_issued";
  if (reserved >= required) return "reserved";
  if (reserved > 0) return "partially_reserved";
  return "needed";
}

export type WorkOrderMaterialLineWithAvailability = {
  id: string;
  work_order_id: string;
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  required_quantity: number;
  reserved_quantity: number;
  issued_quantity: number;
  stock_location_id: string | null;
  stock_location_name: string | null;
  unit_cost_snapshot: number | null;
  status: string;
  available_at_location: number | null;
  on_hand_at_location: number | null;
  reserved_total_at_location: number | null;
};

export async function getWorkOrderMaterialLinesWithAvailability(
  workOrderId: string
): Promise<{ data: WorkOrderMaterialLineWithAvailability[] | null; error: string | null }> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { data: null, error: "Unauthorized." };
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return { data: null, error: "Work order not found." };
  const companyId = (wo as { company_id: string }).company_id;
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { data: null, error: "Unauthorized." };

  const { data: lines, error: linesError } = await supabase
    .from("work_order_material_lines")
    .select(
      "id, work_order_id, product_id, required_quantity, reserved_quantity, issued_quantity, stock_location_id, unit_cost_snapshot, status, products(name, sku), stock_locations(name)"
    )
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });
  if (linesError) return { data: null, error: linesError.message };

  const list = (lines ?? []) as Array<{
    id: string;
    work_order_id: string;
    product_id: string;
    required_quantity: number;
    reserved_quantity: number;
    issued_quantity: number;
    stock_location_id: string | null;
    unit_cost_snapshot: number | null;
    status: string;
    products?: { name?: string; sku?: string | null } | unknown;
    stock_locations?: { name?: string } | unknown;
  }>;

  const productLocationPairs = list
    .filter((l) => l.stock_location_id)
    .map((l) => ({ product_id: l.product_id, stock_location_id: l.stock_location_id! }));
  const availabilityMap = new Map<string, { on_hand: number; reserved: number }>();
  const uniqueProductIds = Array.from(
    new Set(productLocationPairs.map((pair) => pair.product_id))
  );
  const uniqueStockLocationIds = Array.from(
    new Set(productLocationPairs.map((pair) => pair.stock_location_id))
  );

  if (uniqueProductIds.length > 0 && uniqueStockLocationIds.length > 0) {
    const [{ data: balances }, { data: reservationRows }] = await Promise.all([
      supabase
        .from("inventory_balances")
        .select("product_id, stock_location_id, quantity_on_hand")
        .in("product_id", uniqueProductIds)
        .in("stock_location_id", uniqueStockLocationIds),
      supabase
        .from("inventory_reservations")
        .select("product_id, stock_location_id, quantity")
        .in("product_id", uniqueProductIds)
        .in("stock_location_id", uniqueStockLocationIds),
    ]);

    for (const row of balances ?? []) {
      const record = row as {
        product_id?: string | null;
        stock_location_id?: string | null;
        quantity_on_hand?: number | null;
      };
      if (!record.product_id || !record.stock_location_id) continue;
      const key = `${record.product_id}:${record.stock_location_id}`;
      const existing = availabilityMap.get(key);
      availabilityMap.set(key, {
        on_hand: Number(record.quantity_on_hand ?? 0),
        reserved: existing?.reserved ?? 0,
      });
    }
    for (const row of reservationRows ?? []) {
      const record = row as {
        product_id?: string | null;
        stock_location_id?: string | null;
        quantity?: number | null;
      };
      if (!record.product_id || !record.stock_location_id) continue;
      const key = `${record.product_id}:${record.stock_location_id}`;
      const existing = availabilityMap.get(key);
      availabilityMap.set(key, {
        on_hand: existing?.on_hand ?? 0,
        reserved: (existing?.reserved ?? 0) + Number(record.quantity ?? 0),
      });
    }
  }

  const result: WorkOrderMaterialLineWithAvailability[] = list.map((l) => {
    const req = Number(l.required_quantity ?? 0);
    const res = Number(l.reserved_quantity ?? 0);
    const iss = Number(l.issued_quantity ?? 0);
    const status = deriveMaterialLineStatus(req, res, iss);
    const product = Array.isArray(l.products) ? l.products[0] : l.products;
    const loc = Array.isArray(l.stock_locations) ? l.stock_locations[0] : l.stock_locations;
    let available_at_location: number | null = null;
    let on_hand_at_location: number | null = null;
    let reserved_total_at_location: number | null = null;
    if (l.stock_location_id) {
      const key = `${l.product_id}:${l.stock_location_id}`;
      const av = availabilityMap.get(key);
      if (av) {
        on_hand_at_location = av.on_hand;
        reserved_total_at_location = av.reserved;
        available_at_location = Math.max(0, av.on_hand - av.reserved);
      }
    }
    return {
      id: l.id,
      work_order_id: l.work_order_id,
      product_id: l.product_id,
      product_name:
        product && typeof product === "object" && "name" in (product as object)
          ? (product as { name?: string }).name ?? null
          : null,
      product_sku:
        product && typeof product === "object" && "sku" in (product as object)
          ? (product as { sku?: string | null }).sku ?? null
          : null,
      required_quantity: req,
      reserved_quantity: res,
      issued_quantity: iss,
      stock_location_id: l.stock_location_id ?? null,
      stock_location_name:
        loc && typeof loc === "object" && "name" in (loc as object)
          ? (loc as { name?: string }).name ?? null
          : null,
      unit_cost_snapshot: l.unit_cost_snapshot ?? null,
      status,
      available_at_location,
      on_hand_at_location,
      reserved_total_at_location,
    };
  });

  return { data: result, error: null };
}

export async function getAvailabilityForProduct(
  companyId: string,
  productId: string,
  stockLocationId?: string | null
): Promise<{
  data:
    | { on_hand: number; reserved: number; available: number }
    | { by_location: Array<{ stock_location_id: string; location_name: string; on_hand: number; reserved: number; available: number }> };
  error: string | null;
}> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { data: null as never, error: "Unauthorized." };
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { data: null as never, error: "Unauthorized." };

  if (stockLocationId) {
    const { data: bal } = await supabase
      .from("inventory_balances")
      .select("quantity_on_hand")
      .eq("product_id", productId)
      .eq("stock_location_id", stockLocationId)
      .maybeSingle();
    const on_hand = Number((bal as { quantity_on_hand?: number } | null)?.quantity_on_hand ?? 0);
    const { data: resRows } = await supabase
      .from("inventory_reservations")
      .select("quantity")
      .eq("product_id", productId)
      .eq("stock_location_id", stockLocationId);
    const reserved = (resRows ?? []).reduce(
      (sum, r) => sum + Number((r as { quantity?: number }).quantity ?? 0),
      0
    );
    return {
      data: { on_hand, reserved, available: Math.max(0, on_hand - reserved) },
      error: null,
    };
  }

  const { data: balances } = await supabase
    .from("inventory_balances")
    .select("stock_location_id, quantity_on_hand, stock_locations(name)")
    .eq("product_id", productId);
  const { data: resRows } = await supabase
    .from("inventory_reservations")
    .select("stock_location_id, quantity")
    .eq("product_id", productId);
  const reservedByLoc = new Map<string, number>();
  for (const r of resRows ?? []) {
    const sid = (r as { stock_location_id?: string }).stock_location_id ?? "";
    reservedByLoc.set(sid, (reservedByLoc.get(sid) ?? 0) + Number((r as { quantity?: number }).quantity ?? 0));
  }
  const by_location = (balances ?? []).map((b) => {
    const sid = (b as { stock_location_id: string }).stock_location_id;
    const on_hand = Number((b as { quantity_on_hand?: number }).quantity_on_hand ?? 0);
    const reserved = reservedByLoc.get(sid) ?? 0;
    const loc = Array.isArray((b as { stock_locations?: unknown }).stock_locations)
      ? ((b as { stock_locations: unknown[] }).stock_locations[0] as { name?: string })
      : (b as { stock_locations?: { name?: string } }).stock_locations;
    return {
      stock_location_id: sid,
      location_name: loc?.name ?? "Location",
      on_hand,
      reserved,
      available: Math.max(0, on_hand - reserved),
    };
  });
  return { data: { by_location }, error: null };
}

export async function addWorkOrderMaterialLine(
  workOrderId: string,
  input: { product_id: string; required_quantity: number; stock_location_id?: string | null; unit_cost_snapshot?: number | null }
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: wo } = await supabase
    .from("work_orders")
    .select("company_id")
    .eq("id", workOrderId)
    .maybeSingle();
  if (!wo) return { error: "Work order not found." };
  const companyId = (wo as { company_id: string }).company_id;
  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Unauthorized." };
  if (!Number.isFinite(input.required_quantity) || input.required_quantity <= 0) {
    return { error: "Required quantity must be greater than zero." };
  }
  const { data: product } = await supabase
    .from("products")
    .select("id, company_id")
    .eq("id", input.product_id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!product) return { error: "Product not found." };
  if (input.stock_location_id) {
    const { data: loc } = await supabase
      .from("stock_locations")
      .select("id, company_id, active")
      .eq("id", input.stock_location_id)
      .eq("company_id", companyId)
      .maybeSingle();
    if (!loc || (loc as { active?: boolean }).active === false) return { error: "Stock location not found or inactive." };
  }
  const { error } = await supabase.from("work_order_material_lines").insert({
    work_order_id: workOrderId,
    product_id: input.product_id,
    required_quantity: input.required_quantity,
    reserved_quantity: 0,
    issued_quantity: 0,
    stock_location_id: input.stock_location_id ?? null,
    unit_cost_snapshot: input.unit_cost_snapshot ?? null,
    status: "needed",
  });
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${workOrderId}`);
  return { success: true };
}

export async function updateWorkOrderMaterialLine(
  lineId: string,
  input: { required_quantity?: number; stock_location_id?: string | null }
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: line } = await supabase
    .from("work_order_material_lines")
    .select("id, work_order_id, issued_quantity, reserved_quantity, required_quantity, work_orders(company_id)")
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return { error: "Material line not found." };
  const wo = (line as { work_orders?: { company_id?: string } }).work_orders;
  const companyId = Array.isArray(wo) ? wo[0]?.company_id : (wo as { company_id?: string } | null)?.company_id;
  if (!companyId || !(await companyBelongsToTenant(companyId, tenantId))) return { error: "Unauthorized." };
  const issued = Number((line as { issued_quantity?: number }).issued_quantity ?? 0);
  const reserved = Number((line as { reserved_quantity?: number }).reserved_quantity ?? 0);
  const required = Number((line as { required_quantity?: number }).required_quantity ?? 0);
  const currentLocationId = (line as { stock_location_id?: string | null }).stock_location_id ?? null;
  if (issued > 0) return { error: "Cannot update a line that has issued quantity. Adjust issued quantities first." };
  if (
    reserved > 0 &&
    input.stock_location_id !== undefined &&
    (input.stock_location_id ?? null) !== currentLocationId
  ) {
    return { error: "Release reservation before changing stock location." };
  }
  const updates: { required_quantity?: number; reserved_quantity?: number; stock_location_id?: string | null; status?: string } = {};
  let newRequired = required;
  let newReserved = reserved;
  if (input.required_quantity != null) {
    if (!Number.isFinite(input.required_quantity) || input.required_quantity < 0)
      return { error: "Required quantity must be zero or greater." };
    updates.required_quantity = input.required_quantity;
    newRequired = input.required_quantity;
    if (reserved > input.required_quantity) {
      updates.reserved_quantity = input.required_quantity;
      newReserved = input.required_quantity;
    }
  }
  if (input.stock_location_id !== undefined) updates.stock_location_id = input.stock_location_id ?? null;
  updates.status = deriveMaterialLineStatus(newRequired, newReserved, issued);
  if (newReserved < reserved) {
    const { data: resRow } = await supabase
      .from("inventory_reservations")
      .select("id, quantity")
      .eq("work_order_material_line_id", lineId)
      .maybeSingle();
    if (resRow) {
      const cur = Number((resRow as { quantity?: number }).quantity ?? 0);
      const newQty = Math.max(0, cur - (reserved - newReserved));
      if (newQty === 0) {
        await supabase.from("inventory_reservations").delete().eq("id", (resRow as { id: string }).id);
      } else {
        await supabase
          .from("inventory_reservations")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", (resRow as { id: string }).id);
      }
    }
  }
  const { error } = await supabase.from("work_order_material_lines").update(updates).eq("id", lineId);
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${(line as { work_order_id: string }).work_order_id}`);
  return { success: true };
}

export async function removeWorkOrderMaterialLine(lineId: string): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: line } = await supabase
    .from("work_order_material_lines")
    .select("id, work_order_id, issued_quantity, work_orders(company_id)")
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return { error: "Material line not found." };
  const wo = (line as { work_orders?: { company_id?: string } }).work_orders;
  const companyId = Array.isArray(wo) ? wo[0]?.company_id : (wo as { company_id?: string } | null)?.company_id;
  if (!companyId || !(await companyBelongsToTenant(companyId, tenantId))) return { error: "Unauthorized." };
  const issued = Number((line as { issued_quantity?: number }).issued_quantity ?? 0);
  if (issued > 0) return { error: "Cannot remove a line that has issued quantity." };
  await supabase.from("inventory_reservations").delete().eq("work_order_material_line_id", lineId);
  const { error } = await supabase.from("work_order_material_lines").delete().eq("id", lineId);
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${(line as { work_order_id: string }).work_order_id}`);
  return { success: true };
}

export async function reserveWorkOrderMaterial(
  lineId: string,
  quantity: number
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Reserve quantity must be greater than zero." };
  const { data: line } = await supabase
    .from("work_order_material_lines")
    .select(
      "id, work_order_id, product_id, stock_location_id, required_quantity, reserved_quantity, issued_quantity, work_orders(company_id)"
    )
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return { error: "Material line not found." };
  const wo = (line as { work_orders?: { company_id?: string } }).work_orders;
  const companyId = Array.isArray(wo) ? wo[0]?.company_id : (wo as { company_id?: string } | null)?.company_id;
  if (!companyId || !(await companyBelongsToTenant(companyId, tenantId))) return { error: "Unauthorized." };
  const stockLocationId = (line as { stock_location_id?: string | null }).stock_location_id;
  if (!stockLocationId) return { error: "Select a stock location on the material line before reserving." };
  const required = Number((line as { required_quantity?: number }).required_quantity ?? 0);
  const currentReserved = Number((line as { reserved_quantity?: number }).reserved_quantity ?? 0);
  const productId = (line as { product_id: string }).product_id;
  const needToReserve = Math.min(quantity, Math.max(0, required - currentReserved));
  if (needToReserve <= 0) return { error: "No additional quantity to reserve for this line." };
  const { data: bal } = await supabase
    .from("inventory_balances")
    .select("quantity_on_hand")
    .eq("product_id", productId)
    .eq("stock_location_id", stockLocationId)
    .maybeSingle();
  const onHand = Number((bal as { quantity_on_hand?: number } | null)?.quantity_on_hand ?? 0);
  const { data: resRows } = await supabase
    .from("inventory_reservations")
    .select("quantity")
    .eq("product_id", productId)
    .eq("stock_location_id", stockLocationId);
  const totalReserved = (resRows ?? []).reduce(
    (sum, r) => sum + Number((r as { quantity?: number }).quantity ?? 0),
    0
  );
  const available = Math.max(0, onHand - totalReserved);
  const toReserve = Math.min(needToReserve, available);
  if (toReserve <= 0) return { error: "No quantity available to reserve at this location." };
  const newLineReserved = currentReserved + toReserve;
  const { data: existingRes } = await supabase
    .from("inventory_reservations")
    .select("id, quantity")
    .eq("work_order_material_line_id", lineId)
    .maybeSingle();
  if (existingRes) {
    const newQty = Number((existingRes as { quantity?: number }).quantity ?? 0) + toReserve;
    const { error: upErr } = await supabase
      .from("inventory_reservations")
      .update({ quantity: newQty, updated_at: new Date().toISOString() })
      .eq("id", (existingRes as { id: string }).id);
    if (upErr) return { error: upErr.message };
  } else {
    const { error: insErr } = await supabase.from("inventory_reservations").insert({
      work_order_material_line_id: lineId,
      product_id: productId,
      stock_location_id: stockLocationId,
      quantity: toReserve,
    });
    if (insErr) return { error: insErr.message };
  }
  const status = deriveMaterialLineStatus(required, newLineReserved, Number((line as { issued_quantity?: number }).issued_quantity ?? 0));
  const { error: lineErr } = await supabase
    .from("work_order_material_lines")
    .update({ reserved_quantity: newLineReserved, status, updated_at: new Date().toISOString() })
    .eq("id", lineId);
  if (lineErr) return { error: lineErr.message };
  revalidatePath(`/work-orders/${(line as { work_order_id: string }).work_order_id}`);
  return { success: true };
}

export async function releaseWorkOrderReservation(
  lineId: string,
  quantity?: number
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: line } = await supabase
    .from("work_order_material_lines")
    .select(
      "id, work_order_id, product_id, required_quantity, reserved_quantity, issued_quantity, work_orders(company_id)"
    )
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return { error: "Material line not found." };
  const wo = (line as { work_orders?: { company_id?: string } }).work_orders;
  const companyId = Array.isArray(wo) ? wo[0]?.company_id : (wo as { company_id?: string } | null)?.company_id;
  if (!companyId || !(await companyBelongsToTenant(companyId, tenantId))) return { error: "Unauthorized." };
  const currentReserved = Number((line as { reserved_quantity?: number }).reserved_quantity ?? 0);
  const toRelease = quantity != null
    ? Math.min(quantity, currentReserved)
    : currentReserved;
  if (toRelease <= 0) return { success: true };
  const { data: resRow } = await supabase
    .from("inventory_reservations")
    .select("id, quantity")
    .eq("work_order_material_line_id", lineId)
    .maybeSingle();
  if (resRow) {
    const cur = Number((resRow as { quantity?: number }).quantity ?? 0);
    const newQty = Math.max(0, cur - toRelease);
    if (newQty === 0) {
      await supabase.from("inventory_reservations").delete().eq("id", (resRow as { id: string }).id);
    } else {
      await supabase
        .from("inventory_reservations")
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq("id", (resRow as { id: string }).id);
    }
  }
  const newLineReserved = Math.max(0, currentReserved - toRelease);
  const required = Number((line as { required_quantity?: number }).required_quantity ?? 0);
  const issued = Number((line as { issued_quantity?: number }).issued_quantity ?? 0);
  const status = deriveMaterialLineStatus(required, newLineReserved, issued);
  const { error } = await supabase
    .from("work_order_material_lines")
    .update({ reserved_quantity: newLineReserved, status, updated_at: new Date().toISOString() })
    .eq("id", lineId);
  if (error) return { error: error.message };
  revalidatePath(`/work-orders/${(line as { work_order_id: string }).work_order_id}`);
  return { success: true };
}

export async function issueWorkOrderMaterial(
  lineId: string,
  quantity: number
): Promise<WorkOrderFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Issue quantity must be greater than zero." };
  const { data: line } = await supabase
    .from("work_order_material_lines")
    .select(
      "id, work_order_id, product_id, stock_location_id, required_quantity, reserved_quantity, issued_quantity, unit_cost_snapshot, work_orders(company_id)"
    )
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return { error: "Material line not found." };
  const wo = (line as { work_orders?: { company_id?: string } }).work_orders;
  const companyId = Array.isArray(wo) ? wo[0]?.company_id : (wo as { company_id?: string } | null)?.company_id;
  if (!companyId || !(await companyBelongsToTenant(companyId, tenantId))) return { error: "Unauthorized." };
  const workOrderId = (line as { work_order_id: string }).work_order_id;
  const stockLocationId = (line as { stock_location_id?: string | null }).stock_location_id;
  if (!stockLocationId) return { error: "Material line has no stock location. Set location before issuing." };
  const reserved = Number((line as { reserved_quantity?: number }).reserved_quantity ?? 0);
  const issued = Number((line as { issued_quantity?: number }).issued_quantity ?? 0);
  const canIssue = Math.min(quantity, Math.max(0, reserved - issued));
  if (canIssue <= 0) return { error: "No reserved quantity available to issue. Reserve first." };
  const productId = (line as { product_id: string }).product_id;
  const unitCost = (line as { unit_cost_snapshot?: number | null }).unit_cost_snapshot ?? null;
  const finalUnitCost = unitCost ?? 0;
  const { data: product } = await supabase
    .from("products")
    .select("name, sku, unit_of_measure, default_cost")
    .eq("id", productId)
    .maybeSingle();
  const partName = (product as { name?: string } | null)?.name ?? null;
  const sku = (product as { sku?: string | null } | null)?.sku ?? null;
  const unitOfMeasure = (product as { unit_of_measure?: string | null } | null)?.unit_of_measure ?? null;
  const costToUse = unitCost ?? (product as { default_cost?: number | null })?.default_cost ?? 0;

  const { error: txError } = await supabase.rpc("record_inventory_transaction", {
    p_company_id: companyId,
    p_product_id: productId,
    p_stock_location_id: stockLocationId,
    p_quantity_change: -canIssue,
    p_transaction_type: "work_order_issue",
    p_reference_type: "work_order_material_line",
    p_reference_id: lineId,
    p_notes: `Work order ${workOrderId} material issue`,
    p_idempotency_key: `wo-material-issue:${lineId}:${issued + canIssue}`,
    p_unit_cost_snapshot: costToUse,
  });
  if (txError) return { error: `Inventory issue failed: ${txError.message}` };

  const { data: usageRow, error: usageErr } = await supabase
    .from("work_order_part_usage")
    .insert({
      work_order_id: workOrderId,
      product_id: productId,
      stock_location_id: stockLocationId,
      part_name_snapshot: partName,
      sku_snapshot: sku,
      unit_of_measure: unitOfMeasure,
      quantity_used: canIssue,
      unit_cost: costToUse,
      unit_cost_snapshot: costToUse,
      total_cost: canIssue * costToUse,
    })
    .select("id")
    .single();
  if (usageErr) return { error: usageErr.message };

  const newIssued = issued + canIssue;
  const newReserved = reserved - canIssue;
  const required = Number((line as { required_quantity?: number }).required_quantity ?? 0);
  const status = deriveMaterialLineStatus(required, newReserved, newIssued);

  const { data: resRow } = await supabase
    .from("inventory_reservations")
    .select("id, quantity")
    .eq("work_order_material_line_id", lineId)
    .maybeSingle();
  if (resRow) {
    const cur = Number((resRow as { quantity?: number }).quantity ?? 0);
    const newQty = Math.max(0, cur - canIssue);
    if (newQty === 0) {
      await supabase.from("inventory_reservations").delete().eq("id", (resRow as { id: string }).id);
    } else {
      await supabase
        .from("inventory_reservations")
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq("id", (resRow as { id: string }).id);
    }
  }

  const { error: lineErr } = await supabase
    .from("work_order_material_lines")
    .update({
      reserved_quantity: newReserved,
      issued_quantity: newIssued,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lineId);
  if (lineErr) return { error: lineErr.message };

  revalidatePath(`/work-orders/${workOrderId}`);
  revalidatePath(`/technicians/work-queue/${workOrderId}`);
  return { success: true };
}

/** Export work orders by IDs to CSV. Returns CSV string or error. Scoped to tenant. */
export async function exportWorkOrdersCsv(
  ids: string[]
): Promise<{ data?: string; error?: string }> {
  if (ids.length === 0) return { error: "No work orders to export." };
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);
  if (companyIds.length === 0) return { error: "No companies found." };
  const { data: rows, error } = await supabase
    .from("work_orders")
    .select(
      "id, work_order_number, title, status, priority, category, due_date, scheduled_date, source_type, created_at, updated_at, completed_at"
    )
    .in("id", ids)
    .in("company_id", companyIds);
  if (error) return { error: error.message };
  const list = (rows ?? []) as Record<string, unknown>[];
  const headers = [
    "Work Order #",
    "Title",
    "Status",
    "Priority",
    "Category",
    "Due Date",
    "Scheduled Date",
    "Source",
    "Created",
    "Updated",
    "Completed",
  ];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...list.map((r) =>
      [
        escape(r.work_order_number),
        escape(r.title),
        escape(r.status),
        escape(r.priority),
        escape(r.category),
        escape(r.due_date),
        escape(r.scheduled_date),
        escape(r.source_type),
        escape(r.created_at),
        escape(r.updated_at),
        escape(r.completed_at),
      ].join(",")
    ),
  ];
  return { data: lines.join("\r\n") };
}
