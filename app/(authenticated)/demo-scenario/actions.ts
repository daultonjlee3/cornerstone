"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type DemoScenarioContext = {
  request: { id: string; title: string };
  workOrder: { id: string; title: string; status: string; assignedTechnicianId: string | null; dispatchDate: string };
  technician: { id: string; name: string };
  completedWorkOrder: { id: string; title: string };
};

// Stable demo dataset identifiers — used to find or create the same records every time.
const DEMO_REQUEST_DESCRIPTION = "HVAC not cooling – Building A";
const DEMO_DISPATCH_TITLE = "HVAC not cooling – Building A";
const DEMO_COMPLETED_TITLE = "Lights out – Gym";
const DEMO_TECH_DISPATCH_NAME = "Mike Johnson";
const DEMO_TECH_COMPLETED_NAME = "Sarah Chen";
const DEMO_ASSET_NAME = "RTU-3";

/** Unique work_order_number per tenant so demo WOs are deterministic and globally unique. */
function demoWorkOrderNumber(tenantId: string, suffix: "DISP" | "DONE"): string {
  const slice = tenantId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `WO-DEMO-SCEN-${slice}-${suffix}`;
}

/**
 * Ensures all demo scenario records exist (asset, technicians, request, dispatch WO, completed WO),
 * then returns the context with exact IDs. No dynamic "first" or "latest" — always the same demo set.
 */
export async function ensureAndGetDemoScenarioContextAction(): Promise<{
  error?: string;
  ctx?: DemoScenarioContext;
}> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((c) => (c as { id: string }).id);
  const companyId = companyIds[0] ?? null;
  if (!companyId) return { error: "No company found for this tenant." };

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dispatchWoNum = demoWorkOrderNumber(tenantId, "DISP");
  const completedWoNum = demoWorkOrderNumber(tenantId, "DONE");

  // --- 1) Demo asset (RTU-3) ---
  let demoAssetId: string | null = null;
  let demoPropertyId: string | null = null;
  let demoBuildingId: string | null = null;
  const { data: existingAssetByName } = await supabase
    .from("assets")
    .select("id, property_id, building_id")
    .eq("company_id", companyId)
    .eq("asset_name", DEMO_ASSET_NAME)
    .limit(1)
    .maybeSingle();
  const existingAsset =
    existingAssetByName ??
    (
      await supabase
        .from("assets")
        .select("id, property_id, building_id")
        .eq("company_id", companyId)
        .eq("name", DEMO_ASSET_NAME)
        .limit(1)
        .maybeSingle()
    ).data;
  if (existingAsset?.id) {
    demoAssetId = existingAsset.id as string;
    demoPropertyId = (existingAsset as { property_id?: string | null }).property_id ?? null;
    demoBuildingId = (existingAsset as { building_id?: string | null }).building_id ?? null;
  } else {
    const { data: firstProp } = await supabase
      .from("properties")
      .select("id")
      .eq("company_id", companyId)
      .order("name")
      .limit(1)
      .maybeSingle();
    const propId = (firstProp as { id?: string } | null)?.id ?? null;
    let bldId: string | null = null;
    if (propId) {
      const { data: firstBld } = await supabase
        .from("buildings")
        .select("id")
        .eq("property_id", propId)
        .limit(1)
        .maybeSingle();
      bldId = (firstBld as { id?: string } | null)?.id ?? null;
    }
    const { data: insertedAsset } = await supabase
      .from("assets")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        property_id: propId,
        building_id: bldId,
        name: DEMO_ASSET_NAME,
        asset_name: DEMO_ASSET_NAME,
        asset_type: "HVAC",
        status: "active",
        manufacturer: "Trane",
        model: "M-DEMO-1",
        serial_number: "SN-DEMO-RTU3",
        description: "Demo scenario asset.",
        notes: "Demo",
      })
      .select("id, property_id, building_id")
      .single();
    if (insertedAsset?.id) {
      demoAssetId = insertedAsset.id as string;
      demoPropertyId = (insertedAsset as { property_id?: string | null }).property_id ?? null;
      demoBuildingId = (insertedAsset as { building_id?: string | null }).building_id ?? null;
    }
  }

  // --- 2) Demo technicians (Mike Johnson, Sarah Chen) ---
  async function getOrCreateTechnician(name: string, trade: string, phone: string): Promise<string | null> {
    const { data: byTechName } = await supabase
      .from("technicians")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .eq("technician_name", name)
      .limit(1)
      .maybeSingle();
    const existing = byTechName ?? (await supabase.from("technicians").select("id").eq("company_id", companyId).eq("status", "active").eq("name", name).limit(1).maybeSingle()).data;
    if (existing?.id) return existing.id as string;
    const { data: created } = await supabase
      .from("technicians")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        name,
        technician_name: name,
        email: null,
        phone,
        trade,
        status: "active",
        notes: "Demo scenario technician.",
      })
      .select("id")
      .single();
    return (created as { id?: string } | null)?.id ?? null;
  }
  const techDispatchId = await getOrCreateTechnician(DEMO_TECH_DISPATCH_NAME, "HVAC", "(555) 401-1001");
  const techCompletedId = await getOrCreateTechnician(DEMO_TECH_COMPLETED_NAME, "Electrical", "(555) 401-1002");
  if (!techDispatchId)
    return { error: "Demo technician could not be created. Please try again." };

  // --- 3) Demo work request ---
  let requestId: string | null = null;
  const { data: existingRequest } = await supabase
    .from("work_requests")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("description", DEMO_REQUEST_DESCRIPTION)
    .limit(1)
    .maybeSingle();
  if (existingRequest?.id) {
    requestId = existingRequest.id as string;
  } else {
    const { data: createdReq } = await supabase
      .from("work_requests")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        requester_name: "Demo Operations",
        requester_email: "ops@demo.local",
        location: "Building A / Roof",
        description: DEMO_REQUEST_DESCRIPTION,
        priority: "medium",
        status: "submitted",
        asset_id: demoAssetId,
      })
      .select("id")
      .single();
    requestId = (createdReq as { id?: string } | null)?.id ?? null;
  }
  if (!requestId) return { error: "Demo request could not be created. Please try again." };

  // --- 4) Dispatch work order (in_progress, linked to request, assigned to Mike) ---
  let dispatchWoId: string | null = null;
  let dispatchWoStatus = "in_progress";
  let dispatchWoAssignedId: string | null = techDispatchId;
  let dispatchDate = today;
  const scheduledStart = new Date(`${today}T08:30:00`);
  const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);
  const { data: existingDispatchWo } = await supabase
    .from("work_orders")
    .select("id, status, assigned_technician_id, scheduled_date")
    .eq("tenant_id", tenantId)
    .eq("work_order_number", dispatchWoNum)
    .limit(1)
    .maybeSingle();
  if (existingDispatchWo?.id) {
    dispatchWoId = existingDispatchWo.id as string;
    dispatchWoStatus = (existingDispatchWo as { status?: string }).status ?? "in_progress";
    dispatchWoAssignedId = (existingDispatchWo as { assigned_technician_id?: string | null }).assigned_technician_id ?? techDispatchId;
    dispatchDate =
      (existingDispatchWo as { scheduled_date?: string | null }).scheduled_date ?? today;
  } else {
    const { data: createdWo } = await supabase
      .from("work_orders")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        work_order_number: dispatchWoNum,
        title: DEMO_DISPATCH_TITLE,
        description: `Demo work order: ${DEMO_DISPATCH_TITLE}`,
        status: "in_progress",
        priority: "high",
        category: "repair",
        source_type: "manual",
        asset_id: demoAssetId,
        property_id: demoPropertyId,
        building_id: demoBuildingId,
        request_id: requestId,
        assigned_technician_id: techDispatchId,
        requested_by_name: "Demo Operations",
        requested_by_email: "ops@demo.local",
        requested_at: now.toISOString(),
        scheduled_date: today,
        due_date: today,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        estimated_hours: 1,
      })
      .select("id")
      .single();
    dispatchWoId = (createdWo as { id?: string } | null)?.id ?? null;
  }
  if (!dispatchWoId)
    return { error: "Demo work order could not be created. Please try again." };

  // --- 5) Completed work order (for Step 6 completion view) ---
  let completedWoId: string | null = null;
  const completedAtDate = new Date(`${today}T10:00:00`);
  completedAtDate.setDate(completedAtDate.getDate() - 1);
  const { data: existingCompletedWo } = await supabase
    .from("work_orders")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("work_order_number", completedWoNum)
    .limit(1)
    .maybeSingle();
  if (existingCompletedWo?.id) {
    completedWoId = existingCompletedWo.id as string;
  } else {
    const { data: createdCompleted } = await supabase
      .from("work_orders")
      .insert({
        tenant_id: tenantId,
        company_id: companyId,
        work_order_number: completedWoNum,
        title: DEMO_COMPLETED_TITLE,
        description: `Demo work order: ${DEMO_COMPLETED_TITLE}`,
        status: "completed",
        priority: "medium",
        category: "repair",
        source_type: "manual",
        asset_id: demoAssetId,
        property_id: demoPropertyId,
        building_id: demoBuildingId,
        assigned_technician_id: techCompletedId,
        completed_by_technician_id: techCompletedId,
        requested_by_name: "Demo Operations",
        requested_by_email: "ops@demo.local",
        requested_at: completedAtDate.toISOString(),
        due_date: today,
        completed_at: completedAtDate.toISOString(),
        completion_notes: "Restored power to the gym circuit and verified stable operation.",
        resolution_summary: "Resolved: repair completed successfully.",
        estimated_hours: 1,
        actual_hours: 1,
      })
      .select("id")
      .single();
    completedWoId = (createdCompleted as { id?: string } | null)?.id ?? null;
  }
  if (!completedWoId)
    return { error: "Demo completed work order could not be created. Please try again." };

  const technician = {
    id: techDispatchId,
    name: DEMO_TECH_DISPATCH_NAME,
  };

  return {
    ctx: {
      request: { id: requestId, title: DEMO_REQUEST_DESCRIPTION },
      workOrder: {
        id: dispatchWoId,
        title: DEMO_DISPATCH_TITLE,
        status: dispatchWoStatus,
        assignedTechnicianId: dispatchWoAssignedId,
        dispatchDate,
      },
      technician,
      completedWorkOrder: {
        id: completedWoId,
        title: DEMO_COMPLETED_TITLE,
      },
    },
  };
}
