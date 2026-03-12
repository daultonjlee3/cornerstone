"use server";

import { revalidatePath } from "next/cache";
import { companyInScope, resolveProcurementScope } from "@/src/lib/procurement/scope";

export type VendorFormState = { error?: string; success?: boolean };

export async function saveVendor(
  _prev: VendorFormState,
  formData: FormData
): Promise<VendorFormState> {
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

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
  const scope = await resolveProcurementScope().catch(() => null);
  if (!scope) return { error: "Unauthorized." };

  const { data: existing } = await scope.supabase
    .from("vendors")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Vendor not found." };
  if (!companyInScope((existing as { company_id?: string | null }).company_id, scope.companyIds)) {
    return { error: "Unauthorized." };
  }

  const { error } = await scope.supabase.from("vendors").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/vendors");
  revalidatePath("/products");
  revalidatePath("/purchase-orders");
  return { success: true };
}
