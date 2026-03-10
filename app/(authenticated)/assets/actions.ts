"use server";

import { createClient } from "@/src/lib/supabase/server";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { calculateAssetHealth } from "@/src/lib/assets/assetHealthService";
import { revalidateAssetIntelligenceCaches } from "@/src/lib/assets/assetIntelligenceService";
import { validateLocationHierarchy } from "@/src/lib/location-hierarchy";
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

async function getActorId(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
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

  const supabase = await createClient();
  const hierarchyError = await validateLocationHierarchy(supabase, {
    companyId,
    propertyId,
    buildingId,
    unitId,
  });
  if (hierarchyError) return { error: hierarchyError };

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
    expected_life_years: (() => {
      const value = Number((formData.get("expected_life_years") as string)?.trim() ?? NaN);
      return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
    })(),
    replacement_cost: (() => {
      const value = Number((formData.get("replacement_cost") as string)?.trim() ?? NaN);
      return Number.isFinite(value) && value >= 0 ? Number(value.toFixed(2)) : null;
    })(),
    warranty_expires: warrantyExpiresRaw || null,
    status,
    condition: (formData.get("condition") as string)?.trim() || null,
    description: (formData.get("description") as string)?.trim() || null,
    location_notes: (formData.get("location_notes") as string)?.trim() || null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  const actorId = await getActorId(supabase);
  if (id) {
    const { data: row } = await supabase.from("assets").select("*").eq("id", id).maybeSingle();
    if (!row) return { error: "Asset not found." };
    const beforeState = row as Record<string, unknown>;
    const allowedUpdate = await companyBelongsToTenant(
      (beforeState.company_id as string) ?? "",
      tenantId
    );
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { data: updated, error } = await supabase
      .from("assets")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { error: error.message };
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "asset",
      entityId: id,
      actionType: "asset_edited",
      performedBy: actorId,
      beforeState,
      afterState: updated as Record<string, unknown>,
    });
    revalidatePath(`/assets/${id}`);
    try {
      await calculateAssetHealth(id);
    } catch {
      // Do not block core asset edits if intelligence recalculation fails.
    }
    revalidateAssetIntelligenceCaches({ assetId: id, companyId });
  } else {
    const { data: inserted, error } = await supabase
      .from("assets")
      .insert(payload)
      .select("*")
      .single();
    if (error) return { error: error.message };
    await insertActivityLog(supabase, {
      tenantId,
      companyId,
      entityType: "asset",
      entityId: (inserted as { id: string }).id,
      actionType: "asset_created",
      performedBy: actorId,
      afterState: inserted as Record<string, unknown>,
    });
    try {
      await calculateAssetHealth((inserted as { id: string }).id);
    } catch {
      // Do not block asset creation if intelligence recalculation fails.
    }
    revalidateAssetIntelligenceCaches({
      assetId: (inserted as { id: string }).id,
      companyId,
    });
  }
  revalidatePath("/assets");
  revalidatePath("/assets/intelligence");
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
  revalidateAssetIntelligenceCaches({ assetId: id, companyId: row.company_id });
  revalidatePath("/assets");
  revalidatePath("/assets/intelligence");
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
  const actorId = await getActorId(supabase);
  const { data: row } = await supabase
    .from("assets")
    .select("id, company_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Asset not found." };
  const allowed = await companyBelongsToTenant(
    (row as { company_id: string }).company_id,
    tenantId
  );
  if (!allowed) return { error: "Unauthorized." };

  const { data: updated, error } = await supabase
    .from("assets")
    .update({ status })
    .eq("id", id)
    .select("id, company_id, status")
    .single();
  if (error) return { error: error.message };
  await insertActivityLog(supabase, {
    tenantId,
    companyId: (row as { company_id: string }).company_id,
    entityType: "asset",
    entityId: id,
    actionType: "asset_edited",
    performedBy: actorId,
    beforeState: { status: (row as { status?: string }).status ?? null },
    afterState: { status: (updated as { status?: string }).status ?? status },
  });
  try {
    await calculateAssetHealth(id);
  } catch {
    // Do not block status transitions if intelligence recalculation fails.
  }
  revalidateAssetIntelligenceCaches({
    assetId: id,
    companyId: (row as { company_id: string }).company_id,
  });
  revalidatePath("/assets");
  revalidatePath("/assets/intelligence");
  revalidatePath(`/assets/${id}`);
  return { success: true };
}
