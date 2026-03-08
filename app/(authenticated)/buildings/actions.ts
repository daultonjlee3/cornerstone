"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BuildingFormState = { error?: string; success?: boolean };

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

async function propertyBelongsToTenant(propertyId: string, tenantId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: prop } = await supabase
    .from("properties")
    .select("company_id")
    .eq("id", propertyId)
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

export async function saveBuilding(
  _prev: BuildingFormState,
  formData: FormData
): Promise<BuildingFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const propertyId = (formData.get("property_id") as string)?.trim();
  const buildingName = (formData.get("building_name") as string)?.trim();

  if (!buildingName) return { error: "Building name is required." };
  if (!propertyId) return { error: "Property is required." };

  const allowed = await propertyBelongsToTenant(propertyId, tenantId);
  if (!allowed) return { error: "Invalid property." };

  const yearBuiltRaw = (formData.get("year_built") as string)?.trim();
  const floorsRaw = (formData.get("floors") as string)?.trim();
  const squareFeetRaw = (formData.get("square_feet") as string)?.trim();

  const payload = {
    building_name: buildingName,
    name: buildingName,
    property_id: propertyId,
    tenant_id: tenantId,
    building_code: (formData.get("building_code") as string)?.trim() || null,
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
    year_built: yearBuiltRaw ? parseInt(yearBuiltRaw, 10) : null,
    floors: floorsRaw ? parseInt(floorsRaw, 10) : null,
    square_feet: squareFeetRaw ? parseFloat(squareFeetRaw) : null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  const supabase = await createClient();
  if (id) {
    const { data: row } = await supabase
      .from("buildings")
      .select("property_id")
      .eq("id", id)
      .maybeSingle();
    if (!row) return { error: "Building not found." };
    const allowedUpdate = await propertyBelongsToTenant(row.property_id, tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { error } = await supabase.from("buildings").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("buildings").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/buildings");
  return { success: true };
}

export async function deleteBuilding(id: string): Promise<BuildingFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("buildings")
    .select("property_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Building not found." };
  const allowed = await propertyBelongsToTenant(row.property_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("buildings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/buildings");
  return { success: true };
}
