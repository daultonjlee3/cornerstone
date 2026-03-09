"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AssetFormState = { error?: string; success?: boolean };

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

export async function saveAsset(
  _prev: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const assetName = (formData.get("asset_name") as string)?.trim();

  if (!assetName) return { error: "Asset name is required." };
  if (!companyId) return { error: "Company is required." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  const propertyId = (formData.get("property_id") as string)?.trim() || null;
  const buildingId = (formData.get("building_id") as string)?.trim() || null;
  const unitId = (formData.get("unit_id") as string)?.trim() || null;
  const installDateRaw = (formData.get("install_date") as string)?.trim();
  const warrantyExpiresRaw = (formData.get("warranty_expires") as string)?.trim();
  const statusRaw = (formData.get("status") as string)?.trim();
  const status =
    statusRaw === "retired"
      ? "retired"
      : statusRaw === "inactive"
      ? "inactive"
      : "active";

  const payload = {
    name: assetName,
    asset_name: assetName,
    tenant_id: tenantId,
    company_id: companyId,
    property_id: propertyId || null,
    building_id: buildingId || null,
    unit_id: unitId || null,
    asset_tag: (formData.get("asset_tag") as string)?.trim() || null,
    asset_type: (() => {
      const type = (formData.get("asset_type") as string)?.trim() || null;
      const custom = (formData.get("asset_type_custom") as string)?.trim() || null;
      if (type === "Other" && custom) return custom;
      return type;
    })(),
    category: (formData.get("category") as string)?.trim() || null,
    manufacturer: (formData.get("manufacturer") as string)?.trim() || null,
    model: (formData.get("model") as string)?.trim() || null,
    serial_number: (formData.get("serial_number") as string)?.trim() || null,
    install_date: installDateRaw || null,
    warranty_expires: warrantyExpiresRaw || null,
    status,
    condition: (formData.get("condition") as string)?.trim() || null,
    description: (formData.get("description") as string)?.trim() || null,
    location_notes: (formData.get("location_notes") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  const supabase = await createClient();
  if (id) {
    const { data: row } = await supabase.from("assets").select("company_id").eq("id", id).maybeSingle();
    if (!row) return { error: "Asset not found." };
    const allowedUpdate = await companyBelongsToTenant(row.company_id, tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { error } = await supabase.from("assets").update(payload).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath(`/assets/${id}`);
  } else {
    const { error } = await supabase.from("assets").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/assets");
  return { success: true };
}

export async function deleteAsset(id: string): Promise<AssetFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: row } = await supabase.from("assets").select("company_id").eq("id", id).maybeSingle();
  if (!row) return { error: "Asset not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/assets");
  return { success: true };
}

/** Set asset status (active | inactive | retired). */
export async function updateAssetStatus(
  id: string,
  status: "active" | "inactive" | "retired"
): Promise<AssetFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: row } = await supabase.from("assets").select("company_id").eq("id", id).maybeSingle();
  if (!row) return { error: "Asset not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("assets").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/assets");
  revalidatePath(`/assets/${id}`);
  return { success: true };
}
