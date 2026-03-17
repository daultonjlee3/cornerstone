"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getTenantIdForUser } from "@/src/lib/auth-context";

export type CompanyFormState = { error?: string; success?: boolean };

export async function saveCompany(
  _prev: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Company name is required." };

  const payload = {
    name,
    legal_name: (formData.get("legal_name") as string)?.trim() || null,
    company_code: (formData.get("company_code") as string)?.trim() || null,
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
    primary_contact_name: (formData.get("primary_contact_name") as string)?.trim() || null,
    primary_contact_email: (formData.get("primary_contact_email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
  };

  if (id) {
    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("companies").insert({
      tenant_id: tenantId,
      ...payload,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/companies");
  return { success: true };
}

export async function deleteCompany(id: string): Promise<CompanyFormState> {
  const supabase = await createClient();
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) return { error: "Unauthorized." };
  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: error.message };
  revalidatePath("/companies");
  return { success: true };
}
