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

  const slug = (formData.get("portal_slug") as string | null)?.trim() || null;
  const portalEnabled =
    (formData.get("portal_enabled") as string | null)?.trim() === "on";
  const allowPublicRequests =
    (formData.get("allow_public_requests") as string | null)?.trim() === "on";
  const portalName =
    (formData.get("portal_name") as string | null)?.trim() || null;
  const autoCreateWorkOrdersFromRequests =
    (formData.get("auto_create_work_orders_from_requests") as string | null)?.trim() === "on";

  if (slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { error: "Portal slug must be URL-safe (lowercase letters, numbers, and dashes only)." };
    }
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("slug", slug)
      .neq("id", id || "")
      .maybeSingle();
    if (existing) {
      return { error: "Portal slug is already in use. Choose another." };
    }
  }

  const payload = {
    name,
    legal_name: (formData.get("legal_name") as string)?.trim() || null,
    company_code: (formData.get("company_code") as string)?.trim() || null,
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
    primary_contact_name: (formData.get("primary_contact_name") as string)?.trim() || null,
    primary_contact_email: (formData.get("primary_contact_email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    slug: slug || null,
    portal_enabled: portalEnabled,
    allow_public_requests: allowPublicRequests,
    portal_name: portalName,
    auto_create_work_orders_from_requests: autoCreateWorkOrdersFromRequests,
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
