"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext, companyBelongsToTenant } from "@/src/lib/auth-context";
import { requirePermission } from "@/src/lib/permissions";
import { geocodeAddress } from "@/src/lib/geocoding";
import { deleteMappingsForInternalId } from "@/src/lib/integrations/mappings";
import { DEMO_READ_ONLY_ERROR, isDemoReadOnlyUser } from "@/src/lib/demo/readOnly";
import type { FleetFormState } from "../branches/actions";

export async function saveTruck(
  _prev: FleetFormState,
  formData: FormData
): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);

  const id = (formData.get("id") as string)?.trim() || null;
  const branchId = (formData.get("branch_id") as string)?.trim();
  const unitNumber = (formData.get("unit_number") as string)?.trim();
  const truckType = (formData.get("truck_type") as string)?.trim();
  if (!branchId || !unitNumber || !truckType) {
    return { error: "Branch, unit number, and truck type are required." };
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("id, company_id, tenant_id, latitude, longitude")
    .eq("id", branchId)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();
  if (!branch) return { error: "Invalid branch." };

  const capacityGallons = (formData.get("capacity_gallons") as string)?.trim();
  const capacity =
    capacityGallons && !Number.isNaN(parseFloat(capacityGallons))
      ? { gallons: parseFloat(capacityGallons) }
      : {};

  const payload = {
    branch_id: branchId,
    company_id: (branch as { company_id: string }).company_id,
    tenant_id: auth.tenantId,
    unit_number: unitNumber,
    truck_type: truckType,
    capacity,
    status: (formData.get("status") as string)?.trim() || "active",
    telematics_device_id: (formData.get("telematics_device_id") as string)?.trim() || null,
    home_latitude: parseFloatOrNull(formData.get("home_latitude")) ??
      (branch as { latitude?: number | null }).latitude ??
      null,
    home_longitude: parseFloatOrNull(formData.get("home_longitude")) ??
      (branch as { longitude?: number | null }).longitude ??
      null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  if (id) {
    const { error } = await supabase
      .from("trucks")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", auth.tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("trucks").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/fleet/trucks");
  return { success: true };
}

export async function deleteTruck(id: string): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);
  await deleteMappingsForInternalId(supabase, auth.tenantId, "truck", id);
  const { error } = await supabase
    .from("trucks")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/fleet/trucks");
  return { success: true };
}

export async function saveCustomerSite(
  _prev: FleetFormState,
  formData: FormData
): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!companyId || !name) return { error: "Company and site name are required." };
  if (!(await companyBelongsToTenant(companyId, auth.tenantId, supabase))) {
    return { error: "Invalid company." };
  }

  let latitude = parseFloatOrNull(formData.get("latitude"));
  let longitude = parseFloatOrNull(formData.get("longitude"));
  const addressLine1 = (formData.get("address_line1") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const state = (formData.get("state") as string)?.trim() || null;
  const postalCode = (formData.get("postal_code") as string)?.trim() || null;

  if ((latitude == null || longitude == null) && addressLine1) {
    const geocoded = await geocodeAddress(
      [addressLine1, city, state, postalCode].filter(Boolean).join(", ")
    );
    if (geocoded?.latitude != null && geocoded.longitude != null) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }
  }

  if (latitude == null || longitude == null) {
    return { error: "Site requires coordinates or a geocodable address." };
  }

  const payload = {
    company_id: companyId,
    tenant_id: auth.tenantId,
    name,
    address_line1: addressLine1,
    city,
    state,
    postal_code: postalCode,
    country: (formData.get("country") as string)?.trim() || null,
    latitude,
    longitude,
    customer_id: (formData.get("customer_id") as string)?.trim() || null,
  };

  if (id) {
    const { error } = await supabase
      .from("customer_sites")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", auth.tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("customer_sites").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/fleet/sites");
  return { success: true };
}

export async function deleteCustomerSite(id: string): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);
  await deleteMappingsForInternalId(supabase, auth.tenantId, "customer_site", id);
  const { error } = await supabase
    .from("customer_sites")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/fleet/sites");
  return { success: true };
}

export async function saveFleetJob(
  _prev: FleetFormState,
  formData: FormData
): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);

  const id = (formData.get("id") as string)?.trim() || null;
  const branchId = (formData.get("branch_id") as string)?.trim();
  const customerSiteId = (formData.get("customer_site_id") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const revenueRaw = (formData.get("revenue_estimate") as string)?.trim();
  const requiredTruckType = (formData.get("required_truck_type") as string)?.trim();

  if (!branchId || !customerSiteId || !title || !requiredTruckType) {
    return { error: "Branch, site, title, and truck type are required." };
  }

  const revenue = parseFloat(revenueRaw);
  if (!Number.isFinite(revenue) || revenue < 0) {
    return { error: "Revenue estimate is required and must be >= 0." };
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("company_id")
    .eq("id", branchId)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();
  if (!branch) return { error: "Invalid branch." };

  const assignedTruckId = (formData.get("assigned_truck_id") as string)?.trim() || null;

  const payload = {
    branch_id: branchId,
    company_id: (branch as { company_id: string }).company_id,
    tenant_id: auth.tenantId,
    customer_site_id: customerSiteId,
    title,
    description: (formData.get("description") as string)?.trim() || null,
    status: (formData.get("status") as string)?.trim() || "unassigned",
    priority: (formData.get("priority") as string)?.trim() || "medium",
    scheduled_start: (formData.get("scheduled_start") as string)?.trim() || null,
    scheduled_end: (formData.get("scheduled_end") as string)?.trim() || null,
    revenue_estimate: revenue,
    required_truck_type: requiredTruckType,
    assigned_truck_id: assignedTruckId,
  };

  if (id) {
    const { error } = await supabase
      .from("fleet_jobs")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", auth.tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("fleet_jobs").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/fleet/jobs");
  return { success: true };
}

export async function deleteFleetJob(id: string): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);
  await deleteMappingsForInternalId(supabase, auth.tenantId, "fleet_job", id);
  const { error } = await supabase
    .from("fleet_jobs")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/fleet/jobs");
  return { success: true };
}

export async function assignTruckToJob(
  jobId: string,
  truckId: string | null
): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);
  const { error } = await supabase
    .from("fleet_jobs")
    .update({
      assigned_truck_id: truckId,
      status: truckId ? "scheduled" : "unassigned",
    })
    .eq("id", jobId)
    .eq("tenant_id", auth.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/fleet/jobs");
  revalidatePath("/dispatch");
  return { success: true };
}

export async function saveFleetOperator(
  _prev: FleetFormState,
  formData: FormData
): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);

  const id = (formData.get("id") as string)?.trim() || null;
  const branchId = (formData.get("branch_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const operatorRole = (formData.get("operator_role") as string)?.trim();
  if (!branchId || !name || !operatorRole) {
    return { error: "Branch, name, and role are required." };
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("company_id")
    .eq("id", branchId)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();
  if (!branch) return { error: "Invalid branch." };

  const payload = {
    branch_id: branchId,
    company_id: (branch as { company_id: string }).company_id,
    tenant_id: auth.tenantId,
    name,
    operator_role: operatorRole,
    is_active: (formData.get("is_active") as string) !== "off",
    hourly_cost: (formData.get("hourly_cost") as string)?.trim()
      ? parseFloat((formData.get("hourly_cost") as string).trim())
      : null,
    overtime_rate: (formData.get("overtime_rate") as string)?.trim()
      ? parseFloat((formData.get("overtime_rate") as string).trim())
      : null,
    shift: (formData.get("shift") as string)?.trim() || null,
  };

  if (id) {
    const { error } = await supabase
      .from("fleet_operators")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", auth.tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("fleet_operators").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/fleet/operators");
  return { success: true };
}

export async function deleteFleetOperator(id: string): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const readOnlyError = await getDemoReadOnlyError(supabase);
  if (readOnlyError) return { error: readOnlyError };
  const auth = await getAuthContext(supabase);
  await deleteMappingsForInternalId(supabase, auth.tenantId, "fleet_operator", id);
  const { error } = await supabase
    .from("fleet_operators")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);
  if (error) return { error: error.message };
  revalidatePath("/fleet/operators");
  return { success: true };
}

function parseFloatOrNull(value: FormDataEntryValue | null): number | null {
  const raw = (value as string | null)?.trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

async function getDemoReadOnlyError(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  return (await isDemoReadOnlyUser(supabase)) ? DEMO_READ_ONLY_ERROR : null;
}
