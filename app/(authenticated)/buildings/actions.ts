"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/src/lib/geocoding";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type BuildingFormState = { error?: string; success?: boolean };

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
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
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
  let address = (formData.get("address") as string)?.trim() || null;
  let city = (formData.get("city") as string)?.trim() || null;
  let stateVal = (formData.get("state") as string)?.trim() || null;
  let postalCode = (formData.get("postal_code") as string)?.trim() || null;
  let country = (formData.get("country") as string)?.trim() || null;
  let latRaw = (formData.get("latitude") as string)?.trim();
  let lonRaw = (formData.get("longitude") as string)?.trim();
  let lat = latRaw ? parseFloat(latRaw) : null;
  let lon = lonRaw ? parseFloat(lonRaw) : null;

  const hasAddressText = [address, city, stateVal, postalCode, country].some(Boolean);
  if (hasAddressText && (lat == null || !Number.isFinite(lat) || lon == null || !Number.isFinite(lon))) {
    const parts = [address, city, stateVal, postalCode, country].filter(Boolean);
    const geocoded = await geocodeAddress(parts.join(", "));
    if (geocoded?.latitude != null && geocoded?.longitude != null) {
      lat = geocoded.latitude;
      lon = geocoded.longitude;
      if (geocoded.address_line1 && !address) address = geocoded.address_line1;
      if (geocoded.city && !city) city = geocoded.city;
      if (geocoded.state && !stateVal) stateVal = geocoded.state;
      if (geocoded.postal_code && !postalCode) postalCode = geocoded.postal_code;
      if (geocoded.country && !country) country = geocoded.country;
    }
  }

  const payload = {
    building_name: buildingName,
    name: buildingName,
    property_id: propertyId,
    tenant_id: tenantId,
    address,
    city,
    state: stateVal,
    postal_code: postalCode,
    country,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lon != null && Number.isFinite(lon) ? lon : null,
    building_code: (formData.get("building_code") as string)?.trim() || null,
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
    year_built: yearBuiltRaw ? parseInt(yearBuiltRaw, 10) : null,
    floors: floorsRaw ? parseInt(floorsRaw, 10) : null,
    square_feet: squareFeetRaw ? parseFloat(squareFeetRaw) : null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

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
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
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
