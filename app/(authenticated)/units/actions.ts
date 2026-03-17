"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type UnitFormState = { error?: string; success?: boolean };

async function buildingBelongsToTenant(buildingId: string, tenantId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: building } = await supabase
    .from("buildings")
    .select("property_id")
    .eq("id", buildingId)
    .maybeSingle();
  if (!building?.property_id) return false;
  const { data: prop } = await supabase
    .from("properties")
    .select("company_id")
    .eq("id", building.property_id)
    .maybeSingle();
  if (!prop?.company_id) return false;
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", prop.company_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return !!company;
}

export async function saveUnit(
  _prev: UnitFormState,
  formData: FormData
): Promise<UnitFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const buildingId = (formData.get("building_id") as string)?.trim();
  const unitName = (formData.get("unit_name") as string)?.trim();

  if (!unitName) return { error: "Unit name is required." };
  if (!buildingId) return { error: "Building is required." };

  const allowed = await buildingBelongsToTenant(buildingId, tenantId);
  if (!allowed) return { error: "Invalid building." };

  const squareFeetRaw = (formData.get("square_feet") as string)?.trim();
  const latRaw = (formData.get("latitude") as string)?.trim();
  const lonRaw = (formData.get("longitude") as string)?.trim();
  const lat = latRaw ? parseFloat(latRaw) : null;
  const lon = lonRaw ? parseFloat(lonRaw) : null;

  const payload = {
    unit_name: unitName,
    name_or_number: unitName,
    building_id: buildingId,
    tenant_id: tenantId,
    address: (formData.get("address") as string)?.trim() || null,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lon != null && Number.isFinite(lon) ? lon : null,
    unit_code: (formData.get("unit_code") as string)?.trim() || null,
    floor: (formData.get("floor") as string)?.trim() || null,
    square_feet: squareFeetRaw ? parseFloat(squareFeetRaw) : null,
    square_footage: squareFeetRaw ? parseFloat(squareFeetRaw) : null,
    occupancy_type: (formData.get("occupancy_type") as string)?.trim() || null,
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  if (id) {
    const { data: row } = await supabase
      .from("units")
      .select("building_id")
      .eq("id", id)
      .maybeSingle();
    if (!row?.building_id) return { error: "Unit not found." };
    const allowedUpdate = await buildingBelongsToTenant(row.building_id, tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { error } = await supabase.from("units").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("units").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/units");
  return { success: true };
}

export async function deleteUnit(id: string): Promise<UnitFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: row } = await supabase
    .from("units")
    .select("building_id")
    .eq("id", id)
    .maybeSingle();
  if (!row?.building_id) return { error: "Unit not found." };
  const allowed = await buildingBelongsToTenant(row.building_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/units");
  return { success: true };
}
