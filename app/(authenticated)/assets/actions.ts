"use server";

import { createClient } from "@/src/lib/supabase/server";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { calculateAssetHealth } from "@/src/lib/assets/assetHealthService";
import { revalidateAssetIntelligenceCaches } from "@/src/lib/assets/assetIntelligenceService";
import { getAssetHierarchyNode, wouldCreateAssetCycle } from "@/src/lib/assets/hierarchy";
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

function assetDisplayName(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "Asset";
  return (
    (row.asset_name as string | null) ??
    (row.name as string | null) ??
    "Asset"
  );
}

async function validateParentAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    tenantId,
    companyId,
    assetId,
    parentAssetId,
  }: {
    tenantId: string;
    companyId: string;
    assetId: string | null;
    parentAssetId: string | null;
  }
): Promise<{ error?: string }> {
  if (!parentAssetId) {
    return {};
  }

  if (assetId && assetId === parentAssetId) {
    return { error: "An asset cannot be its own parent." };
  }

  const parent = await getAssetHierarchyNode(supabase, parentAssetId);
  if (!parent) {
    return { error: "Selected parent asset was not found." };
  }
  if (parent.tenant_id && parent.tenant_id !== tenantId) {
    return { error: "Selected parent asset is out of scope." };
  }
  if (parent.company_id !== companyId) {
    return { error: "Selected parent asset must belong to the same company." };
  }

  if (assetId) {
    const createsCycle = await wouldCreateAssetCycle(supabase, assetId, parentAssetId);
    if (createsCycle) {
      return {
        error: "Invalid parent selection. A descendant cannot be selected as parent.",
      };
    }
  }

  return {};
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
  const parentAssetId = (formData.get("parent_asset_id") as string)?.trim() || null;
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

  const parentValidation = await validateParentAssignment(supabase, {
    tenantId,
    companyId,
    assetId: id,
    parentAssetId,
  });
  if (parentValidation.error) return { error: parentValidation.error };

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
    parent_asset_id: parentAssetId,
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
    const beforeParentAssetId = (beforeState.parent_asset_id as string | null) ?? null;
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

    const afterState = updated as Record<string, unknown>;
    const afterParentAssetId = (afterState.parent_asset_id as string | null) ?? null;
    if (beforeParentAssetId !== afterParentAssetId) {
      const assetName = assetDisplayName(afterState);
      if (!beforeParentAssetId && afterParentAssetId) {
        const parent = await getAssetHierarchyNode(supabase, afterParentAssetId);
        const parentName = assetDisplayName(parent as unknown as Record<string, unknown>);
        await insertActivityLog(supabase, {
          tenantId,
          companyId,
          entityType: "asset",
          entityId: id,
          actionType: "asset_sub_asset_linked",
          performedBy: actorId,
          metadata: {
            message: `${assetName} was added as a sub-asset of ${parentName}.`,
            parent_asset_id: afterParentAssetId,
          },
          beforeState: { parent_asset_id: null },
          afterState: { parent_asset_id: afterParentAssetId },
        });
      } else if (beforeParentAssetId && afterParentAssetId) {
        const [previousParent, nextParent] = await Promise.all([
          getAssetHierarchyNode(supabase, beforeParentAssetId),
          getAssetHierarchyNode(supabase, afterParentAssetId),
        ]);
        const previousParentName = assetDisplayName(
          previousParent as unknown as Record<string, unknown>
        );
        const nextParentName = assetDisplayName(nextParent as unknown as Record<string, unknown>);
        await insertActivityLog(supabase, {
          tenantId,
          companyId,
          entityType: "asset",
          entityId: id,
          actionType: "asset_sub_asset_moved",
          performedBy: actorId,
          metadata: {
            message: `${assetName} was moved from ${previousParentName} to ${nextParentName}.`,
            previous_parent_asset_id: beforeParentAssetId,
            parent_asset_id: afterParentAssetId,
          },
          beforeState: { parent_asset_id: beforeParentAssetId },
          afterState: { parent_asset_id: afterParentAssetId },
        });
      } else if (beforeParentAssetId && !afterParentAssetId) {
        const previousParent = await getAssetHierarchyNode(supabase, beforeParentAssetId);
        const previousParentName = assetDisplayName(
          previousParent as unknown as Record<string, unknown>
        );
        await insertActivityLog(supabase, {
          tenantId,
          companyId,
          entityType: "asset",
          entityId: id,
          actionType: "asset_sub_asset_unlinked",
          performedBy: actorId,
          metadata: {
            message: `${assetName} was removed from parent asset ${previousParentName}.`,
            previous_parent_asset_id: beforeParentAssetId,
          },
          beforeState: { parent_asset_id: beforeParentAssetId },
          afterState: { parent_asset_id: null },
        });
      }
      if (beforeParentAssetId) revalidatePath(`/assets/${beforeParentAssetId}`);
      if (afterParentAssetId) revalidatePath(`/assets/${afterParentAssetId}`);
    }
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
    if (parentAssetId) {
      const insertedRecord = inserted as Record<string, unknown>;
      const parent = await getAssetHierarchyNode(supabase, parentAssetId);
      const parentName = assetDisplayName(parent as unknown as Record<string, unknown>);
      await insertActivityLog(supabase, {
        tenantId,
        companyId,
        entityType: "asset",
        entityId: (inserted as { id: string }).id,
        actionType: "asset_sub_asset_linked",
        performedBy: actorId,
        metadata: {
          message: `${assetDisplayName(insertedRecord)} was added as a sub-asset of ${parentName}.`,
          parent_asset_id: parentAssetId,
        },
        beforeState: { parent_asset_id: null },
        afterState: { parent_asset_id: parentAssetId },
      });
      revalidatePath(`/assets/${parentAssetId}`);
    }
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
  const { data: row } = await supabase
    .from("assets")
    .select("company_id, parent_asset_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Asset not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { data: childAsset } = await supabase
    .from("assets")
    .select("id")
    .eq("parent_asset_id", id)
    .limit(1)
    .maybeSingle();
  if (childAsset?.id) {
    return {
      error:
        "This asset has sub-assets. Reassign or unlink child assets before deleting the parent asset.",
    };
  }

  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { error: error.message };
  if (row.parent_asset_id) revalidatePath(`/assets/${row.parent_asset_id}`);
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
