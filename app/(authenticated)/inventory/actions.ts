"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";

export type InventoryFormState = { error?: string; success?: boolean };

export async function saveStockLocation(
  _prev: InventoryFormState,
  formData: FormData
): Promise<InventoryFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const id = ((formData.get("id") as string | null) ?? "").trim();
  const companyId = ((formData.get("company_id") as string | null) ?? "").trim();
  const name = ((formData.get("name") as string | null) ?? "").trim();
  const locationType = ((formData.get("location_type") as string | null) ?? "").trim() || "warehouse";

  if (!companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };
  if (!name) return { error: "Location name is required." };

  const payload = {
    company_id: companyId,
    name,
    location_type: locationType,
    property_id: ((formData.get("property_id") as string | null) ?? "").trim() || null,
    building_id: ((formData.get("building_id") as string | null) ?? "").trim() || null,
    unit_id: ((formData.get("unit_id") as string | null) ?? "").trim() || null,
    active: (formData.get("active") as string | null) !== "off",
    is_default: (formData.get("is_default") as string | null) === "on",
  };

  const ensureBalancesForDefaultLocation = async (stockLocationId: string) => {
    const { data: products } = await scope.supabase
      .from("products")
      .select("id, reorder_point_default")
      .eq("company_id", companyId);
    if (!products?.length) return;
    const rows = products.map((row) => ({
      product_id: (row as { id: string }).id,
      stock_location_id: stockLocationId,
      quantity_on_hand: 0,
      reorder_point:
        (row as { reorder_point_default?: number | null }).reorder_point_default ?? null,
    }));
    await scope.supabase
      .from("inventory_balances")
      .upsert(rows, { onConflict: "product_id,stock_location_id", ignoreDuplicates: true });
  };

  if (payload.is_default) {
    await scope.supabase
      .from("stock_locations")
      .update({ is_default: false })
      .eq("company_id", companyId);
  }

  if (id) {
    const { data: existing } = await scope.supabase
      .from("stock_locations")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Stock location not found." };
    if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
      return { error: "Unauthorized." };
    }
    const { error } = await scope.supabase.from("stock_locations").update(payload).eq("id", id);
    if (error) return { error: error.message };
    if (payload.is_default) {
      await ensureBalancesForDefaultLocation(id);
    }
  } else {
    const { data: inserted, error } = await scope.supabase
      .from("stock_locations")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    if (payload.is_default && inserted?.id) {
      await ensureBalancesForDefaultLocation((inserted as { id: string }).id);
    }
  }

  revalidatePath("/inventory");
  revalidatePath("/products");
  revalidatePath("/work-orders");
  return { success: true };
}

type InventoryAdjustmentPayload = {
  productId: string;
  stockLocationId: string;
  quantityChange: number;
  notes?: string;
};

export async function recordInventoryAdjustment(
  payload: InventoryAdjustmentPayload
): Promise<InventoryFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (!Number.isFinite(payload.quantityChange) || payload.quantityChange === 0) {
    return { error: "Quantity change must be non-zero." };
  }

  const { data: product } = await scope.supabase
    .from("products")
    .select("id, company_id")
    .eq("id", payload.productId)
    .maybeSingle();
  if (!product) return { error: "Product not found." };

  const companyId = (product as { company_id?: string | null }).company_id ?? null;
  if (!companyId || !companyInScope(companyId, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { error } = await scope.supabase.rpc("record_inventory_transaction", {
    p_company_id: companyId,
    p_product_id: payload.productId,
    p_stock_location_id: payload.stockLocationId,
    p_quantity_change: payload.quantityChange,
    p_transaction_type: "adjustment",
    p_reference_type: "manual_adjustment",
    p_reference_id: null,
    p_notes: payload.notes ?? null,
    p_idempotency_key: null,
  });
  if (error) return { error: error.message };

  revalidatePath("/inventory");
  revalidatePath("/products");
  return { success: true };
}
