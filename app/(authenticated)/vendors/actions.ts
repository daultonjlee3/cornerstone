"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";
import { insertActivityLog } from "@/src/lib/activity-logs";
import { requirePermission } from "@/src/lib/permissions";
import { DEMO_READ_ONLY_ERROR, isDemoReadOnlyUser } from "@/src/lib/demo/readOnly";

export type VendorFormState = { error?: string; success?: boolean };

export async function saveVendor(
  _prev: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (await isDemoReadOnlyUser(scope.supabase)) return { error: DEMO_READ_ONLY_ERROR };

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const companyId = (formData.get("company_id") as string | null)?.trim() ?? "";
  const name = (formData.get("name") as string | null)?.trim() ?? "";

  if (!companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };
  if (!name) return { error: "Vendor name is required." };

  const payload = {
    company_id: companyId,
    name,
    service_type: ((formData.get("service_type") as string | null) ?? "").trim() || null,
    contact_name: ((formData.get("contact_name") as string | null) ?? "").trim() || null,
    email: ((formData.get("email") as string | null) ?? "").trim() || null,
    phone: ((formData.get("phone") as string | null) ?? "").trim() || null,
    address: ((formData.get("address") as string | null) ?? "").trim() || null,
    website: ((formData.get("website") as string | null) ?? "").trim() || null,
    notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
    preferred_vendor: (formData.get("preferred_vendor") as string | null) === "on",
  };

  if (id) {
    const { data: existing } = await scope.supabase
      .from("vendors")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Vendor not found." };
    if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
      return { error: "Unauthorized." };
    }

    const { error } = await scope.supabase.from("vendors").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await scope.supabase.from("vendors").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/vendors");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
  return { success: true };
}

export async function deleteVendor(id: string): Promise<VendorFormState> {
  try {
    await requirePermission("vendors.delete");
  } catch {
    return { error: "You do not have permission to delete vendors." };
  }

  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (await isDemoReadOnlyUser(scope.supabase)) return { error: DEMO_READ_ONLY_ERROR };

  const { data: existing } = await scope.supabase
    .from("vendors")
    .select("id, company_id, name")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Vendor not found." };
  const companyId = (existing as { company_id?: string | null }).company_id;
  if (!companyInScope(companyId, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const snapshot = existing as Record<string, unknown>;
  const { error } = await scope.supabase.from("vendors").delete().eq("id", id);
  if (error) return { error: error.message };

  // Audit log so vendor deletions are traceable.
  await insertActivityLog(scope.supabase, {
    companyId: companyId ?? null,
    entityType: "vendor",
    entityId: id,
    actionType: "vendor_deleted",
    performedBy: scope.userId ?? null,
    beforeState: snapshot,
    metadata: { name: snapshot.name },
  }).catch(() => { /* Non-fatal */ });

  revalidatePath("/vendors");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
  return { success: true };
}

export type VendorPricingFormState = { error?: string; success?: boolean };

function parseTaxableOverride(value: string | null): boolean | null {
  const v = (value ?? "").trim();
  if (v === "" || v === "use_default") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export async function saveVendorPricing(
  _prev: VendorPricingFormState,
  formData: FormData
): Promise<VendorPricingFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (await isDemoReadOnlyUser(scope.supabase)) return { error: DEMO_READ_ONLY_ERROR };

  const id = (formData.get("id") as string | null)?.trim() ?? "";
  const vendorId = (formData.get("vendor_id") as string | null)?.trim() ?? "";
  const productId = (formData.get("product_id") as string | null)?.trim() ?? "";
  const unitCostRaw = (formData.get("unit_cost") as string | null)?.trim() ?? "";

  if (!vendorId || !productId) return { error: "Vendor and product are required." };

  const { data: vendorRow } = await scope.supabase
    .from("vendors")
    .select("id, company_id")
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendorRow) return { error: "Vendor not found." };
  const companyId = (vendorRow as { company_id?: string }).company_id;
  if (!companyInScope(companyId, scope.companyIds)) return { error: "Unauthorized." };

  const { data: productRow } = await scope.supabase
    .from("products")
    .select("id, company_id")
    .eq("id", productId)
    .maybeSingle();
  if (!productRow) return { error: "Product not found." };
  if ((productRow as { company_id?: string }).company_id !== companyId) {
    return { error: "Product must belong to the same company as the vendor." };
  }

  const unitCost = unitCostRaw === "" ? 0 : Number(unitCostRaw);
  if (!Number.isFinite(unitCost) || unitCost < 0) return { error: "Unit cost must be zero or greater." };

  const taxableOverride = parseTaxableOverride(formData.get("taxable_override") as string | null);

  const payload = {
    vendor_id: vendorId,
    product_id: productId,
    vendor_item_name: ((formData.get("vendor_item_name") as string | null) ?? "").trim() || null,
    vendor_sku: ((formData.get("vendor_sku") as string | null) ?? "").trim() || null,
    unit_cost: unitCost,
    taxable_override: taxableOverride,
    preferred: (formData.get("preferred") as string | null) === "on",
    lead_time_days: (() => {
      const v = ((formData.get("lead_time_days") as string | null) ?? "").trim();
      if (v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    })(),
    notes: ((formData.get("notes") as string | null) ?? "").trim() || null,
  };

  if (id) {
    const { data: existing } = await scope.supabase
      .from("vendor_pricing")
      .select("id, vendor_id")
      .eq("id", id)
      .maybeSingle();
    if (!existing) return { error: "Pricing entry not found." };
    if ((existing as { vendor_id?: string }).vendor_id !== vendorId) return { error: "Unauthorized." };

    const { error } = await scope.supabase.from("vendor_pricing").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await scope.supabase.from("vendor_pricing").insert(payload);
    if (error) {
      if (error.code === "23505") return { error: "A pricing entry for this product already exists for this vendor." };
      return { error: error.message };
    }
  }

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
  return { success: true };
}

export async function deleteVendorPricing(vendorId: string, pricingId: string): Promise<VendorPricingFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };
  if (await isDemoReadOnlyUser(scope.supabase)) return { error: DEMO_READ_ONLY_ERROR };

  const { data: existing } = await scope.supabase
    .from("vendor_pricing")
    .select("id, vendor_id")
    .eq("id", pricingId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!existing) return { error: "Pricing entry not found." };

  const { data: vendor } = await scope.supabase
    .from("vendors")
    .select("company_id")
    .eq("id", vendorId)
    .maybeSingle();
  if (!vendor || !companyInScope((vendor as { company_id?: string }).company_id, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { error } = await scope.supabase.from("vendor_pricing").delete().eq("id", pricingId);
  if (error) return { error: error.message };

  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
  return { success: true };
}
