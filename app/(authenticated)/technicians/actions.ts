"use server";

import { createClient } from "@/src/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type TechnicianFormState = { error?: string; success?: boolean };

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

export async function saveTechnician(
  _prev: TechnicianFormState,
  formData: FormData
): Promise<TechnicianFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const id = (formData.get("id") as string)?.trim() || null;
  const companyId = (formData.get("company_id") as string)?.trim();
  const technicianName = (formData.get("technician_name") as string)?.trim();

  if (!technicianName) return { error: "Technician name is required." };
  if (!companyId) return { error: "Company is required." };

  const allowed = await companyBelongsToTenant(companyId, tenantId);
  if (!allowed) return { error: "Invalid company." };

  const status = (formData.get("status") as string)?.trim();
  const validStatus = status === "inactive" ? "inactive" : "active";

  const payload = {
    name: technicianName,
    technician_name: technicianName,
    tenant_id: tenantId,
    company_id: companyId,
    email: (formData.get("email") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    trade: (formData.get("trade") as string)?.trim() || null,
    status: validStatus,
    hourly_cost: (formData.get("hourly_cost") as string)?.trim()
      ? parseFloat((formData.get("hourly_cost") as string).trim())
      : null,
    notes: (formData.get("notes") as string)?.trim() || null,
  };

  const supabase = await createClient();
  if (id) {
    const { data: row } = await supabase
      .from("technicians")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (!row) return { error: "Technician not found." };
    const allowedUpdate = await companyBelongsToTenant(row.company_id, tenantId);
    if (!allowedUpdate) return { error: "Unauthorized." };
    const { error } = await supabase.from("technicians").update(payload).eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("technicians").insert(payload);
    if (error) return { error: error.message };
  }
  revalidatePath("/technicians");
  return { success: true };
}

export async function deleteTechnician(id: string): Promise<TechnicianFormState> {
  const tenantId = await getTenantId();
  if (!tenantId) return { error: "Unauthorized." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("technicians")
    .select("company_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Technician not found." };
  const allowed = await companyBelongsToTenant(row.company_id, tenantId);
  if (!allowed) return { error: "Unauthorized." };

  const { error } = await supabase.from("technicians").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/technicians");
  return { success: true };
}
