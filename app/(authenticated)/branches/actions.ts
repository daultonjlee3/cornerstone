"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext, companyBelongsToTenant, ensureCompanyInScope } from "@/src/lib/auth-context";
import { requirePermission } from "@/src/lib/permissions";
import { deleteMappingsForInternalId } from "@/src/lib/integrations/mappings";

export type FleetFormState = { error?: string; success?: boolean };

export async function saveBranch(
  _prev: FleetFormState,
  formData: FormData
): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  if (!companyId || !name) return { error: "Company and name are required." };

  if (!(await companyBelongsToTenant(companyId, auth.tenantId, supabase))) {
    return { error: "Invalid company." };
  }

  const payload = {
    company_id: companyId,
    tenant_id: auth.tenantId,
    name,
    code: (formData.get("code") as string)?.trim() || null,
    address_line1: (formData.get("address_line1") as string)?.trim() || null,
    city: (formData.get("city") as string)?.trim() || null,
    state: (formData.get("state") as string)?.trim() || null,
    postal_code: (formData.get("postal_code") as string)?.trim() || null,
    country: (formData.get("country") as string)?.trim() || null,
    latitude: parseOptionalFloat(formData.get("latitude")),
    longitude: parseOptionalFloat(formData.get("longitude")),
    timezone: (formData.get("timezone") as string)?.trim() || "UTC",
    status: (formData.get("status") as string) === "inactive" ? "inactive" : "active",
  };

  if (id) {
    const { error } = await supabase
      .from("branches")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", auth.tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("branches").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/branches");
  return { success: true };
}

export async function deleteBranch(id: string): Promise<FleetFormState> {
  await requirePermission("fleet.manage");
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);

  await deleteMappingsForInternalId(supabase, auth.tenantId, "branch", id);

  const { error } = await supabase
    .from("branches")
    .delete()
    .eq("id", id)
    .eq("tenant_id", auth.tenantId);

  if (error) return { error: error.message };
  revalidatePath("/branches");
  return { success: true };
}

function parseOptionalFloat(value: FormDataEntryValue | null): number | null {
  const raw = (value as string | null)?.trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export async function resolveBranchByCode(
  tenantId: string,
  companyId: string,
  code: string
): Promise<{ id: string; company_id: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("id, company_id")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .eq("code", code)
    .maybeSingle();
  return data as { id: string; company_id: string } | null;
}

export { ensureCompanyInScope };
