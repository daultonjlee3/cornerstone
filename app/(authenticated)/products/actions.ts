"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";

export type ProductFormState = { error?: string; success?: boolean };

async function ensureProductDefaultBalance(
  supabase: Awaited<ReturnType<typeof resolveProcurementScope>>["supabase"],
  input: { productId: string; companyId: string; reorderPointDefault: number | null }
) {
  const { data: defaultLocation } = await supabase
    .from("stock_locations")
    .select("id")
    .eq("company_id", input.companyId)
    .eq("is_default", true)
    .maybeSingle();
  if (!defaultLocation) return;

  await supabase.from("inventory_balances").upsert(
    {
      product_id: input.productId,
      stock_location_id: (defaultLocation as { id: string }).id,
      quantity_on_hand: 0,
      reorder_point: input.reorderPointDefault,
    },
    { onConflict: "product_id,stock_location_id", ignoreDuplicates: true }
  );
}

export async function saveProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const companyId = (formData.get("company_id") as string | null)?.trim() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const sku = ((formData.get("sku") as string | null) ?? "").trim() || null;

  if (!name) return { error: "Product name is required." };
  if (!companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };

  const defaultVendorId = ((formData.get("default_vendor_id") as string | null) ?? "").trim() || null;
  if (defaultVendorId) {
    const { data: vendorRow } = await scope.supabase
      .from("vendors")
      .select("id, company_id")
      .eq("id", defaultVendorId)
      .maybeSingle();
    if (!vendorRow) return { error: "Default vendor not found." };
    if ((vendorRow as { company_id?: string | null }).company_id !== companyId) {
      return { error: "Default vendor must belong to the same company." };
    }
  }

  const defaultCostRaw = ((formData.get("default_cost") as string | null) ?? "").trim();
  const reorderPointRaw = ((formData.get("reorder_point_default") as string | null) ?? "").trim();

  const taxableDefault = (formData.get("taxable_default") as string | null) === "on";

  const payload = {
    company_id: companyId,
    name,
    sku,
    description: ((formData.get("description") as string | null) ?? "").trim() || null,
    category: ((formData.get("category") as string | null) ?? "").trim() || null,
    unit_of_measure: ((formData.get("unit_of_measure") as string | null) ?? "").trim() || null,
    default_vendor_id: defaultVendorId,
    default_cost:
      defaultCostRaw === "" || Number.isNaN(Number(defaultCostRaw))
        ? null
        : Number(defaultCostRaw),
    reorder_point_default:
      reorderPointRaw === "" || Number.isNaN(Number(reorderPointRaw))
        ? null
        : Number(reorderPointRaw),
    taxable_default: taxableDefault,
    active: (formData.get("active") as string | null) === "on",
  };

  if (id) {
    const { data: existing } = await scope.supabase
      .from("products")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Product not found." };
    if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
      return { error: "Unauthorized." };
    }

    const { error } = await scope.supabase.from("products").update(payload).eq("id", id);
    if (error) return { error: error.message };
    await ensureProductDefaultBalance(scope.supabase, {
      productId: id,
      companyId,
      reorderPointDefault: payload.reorder_point_default,
    });
  } else {
    const { data: inserted, error } = await scope.supabase
      .from("products")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: error.message };
    await ensureProductDefaultBalance(scope.supabase, {
      productId: (inserted as { id: string }).id,
      companyId,
      reorderPointDefault: payload.reorder_point_default,
    });
  }

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/purchase-orders");
  revalidatePath("/work-orders");
  return { success: true };
}

export async function deleteProduct(id: string): Promise<ProductFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: existing } = await scope.supabase
    .from("products")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Product not found." };
  if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { error } = await scope.supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  revalidatePath("/inventory");
  revalidatePath("/purchase-orders");
  revalidatePath("/work-orders");
  return { success: true };
}
