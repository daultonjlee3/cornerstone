"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { geocodeAddress } from "@/src/lib/geocoding";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type PropertyFormState = { error?: string; success?: boolean };

/** Verify company belongs to current tenant */
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

export async function saveProperty(
  _prev: PropertyFormState,
  formData: FormData
): Promise<PropertyFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const propertyName = (formData.get("property_name") as string)?.trim();

  if (!propertyName) return { error: "Property name is required." };
  if (!companyId) return { error: "Company is required." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  let addressLine1 = (formData.get("address_line1") as string)?.trim() || null;
  let city = (formData.get("city") as string)?.trim() || null;
  let state = (formData.get("state") as string)?.trim() || null;
  let zip = (formData.get("zip") as string)?.trim() || null;
  let country = (formData.get("country") as string)?.trim() || null;
  const latRaw = (formData.get("latitude") as string)?.trim();
  const lonRaw = (formData.get("longitude") as string)?.trim();
  let lat = latRaw ? parseFloat(latRaw) : null;
  let lon = lonRaw ? parseFloat(lonRaw) : null;

  // On manual save without coordinates, attempt to geocode from address text
  const hasAddressText = [addressLine1, city, state, zip, country].some(Boolean);
  if (hasAddressText && (lat == null || !Number.isFinite(lat) || lon == null || !Number.isFinite(lon))) {
    const parts = [addressLine1, city, state, zip, country].filter(Boolean);
    const geocoded = await geocodeAddress(parts.join(", "));
    if (geocoded?.latitude != null && geocoded?.longitude != null) {
      lat = geocoded.latitude;
      lon = geocoded.longitude;
      if (geocoded.address_line1 && !addressLine1) addressLine1 = geocoded.address_line1;
      if (geocoded.city && !city) city = geocoded.city;
      if (geocoded.state && !state) state = geocoded.state;
      if (geocoded.postal_code && !zip) zip = geocoded.postal_code;
      if (geocoded.country && !country) country = geocoded.country;
    }
  }

  const payload = {
    name: propertyName,
    property_name: propertyName,
    company_id: companyId,
    address_line1: addressLine1,
    address_line2: (formData.get("address_line2") as string)?.trim() || null,
    city,
    state,
    zip,
    country,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lon != null && Number.isFinite(lon) ? lon : null,
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
  };

  if (id) {
    const { data: prop } = await supabase
      .from("properties")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (!prop) return { error: "Property not found." };
    const allowedUpdate = await companyBelongsToTenant(prop.company_id, tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { error } = await supabase
      .from("properties")
      .update(payload)
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("properties").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/properties");
  return { success: true };
}

export async function deleteProperty(id: string): Promise<PropertyFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { data: prop } = await supabase
    .from("properties")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!prop) return { error: "Property not found." };
  const allowed = await companyBelongsToTenant(prop.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/properties");
  return { success: true };
}
