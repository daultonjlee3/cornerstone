"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";

type FormState = { error?: string; success?: boolean };

export async function saveImplementationSettings(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const supabase = await createClient();
  const auth = await getAuthContext(supabase);
  if (!auth.tenantId) return { error: "No tenant." };
  const canManage =
    auth.isPlatformSuperAdmin ||
    auth.membershipRole === "owner" ||
    auth.membershipRole === "admin";
  if (!canManage) return { error: "Forbidden." };

  const companyId = String(formData.get("company_id") ?? "").trim();
  if (!companyId) return { error: "Company is required." };

  const timezone = String(formData.get("timezone") ?? "UTC").trim() || "UTC";
  const currency = String(formData.get("currency") ?? "USD").trim() || "USD";
  const businessType = String(formData.get("business_type") ?? "custom").trim();
  const units = String(formData.get("units") ?? "imperial").trim();
  const workWeek = String(formData.get("work_week") ?? "monday-friday").trim();
  const baselineWindow = Number(formData.get("baseline_window_days") ?? 90);
  const importBehavior = String(formData.get("import_behavior") ?? "upsert").trim();
  const notifications = String(formData.get("notification_preferences") ?? "critical").trim();

  const { error: companyError } = await supabase
    .from("companies")
    .update({ timezone, currency })
    .eq("tenant_id", auth.tenantId)
    .eq("id", companyId);
  if (companyError) return { error: companyError.message };

  const { data: existing } = await supabase
    .from("company_operating_rules")
    .select("id, custom_rules")
    .eq("tenant_id", auth.tenantId)
    .eq("company_id", companyId)
    .maybeSingle();

  const existingCustomRules =
    (existing as { custom_rules?: Record<string, unknown> | null } | null)?.custom_rules ?? {};
  const customRules = {
    ...existingCustomRules,
    business_type: businessType,
    units,
    work_week: workWeek,
    baseline_window_days: Number.isFinite(baselineWindow) ? baselineWindow : 90,
    import_behavior: importBehavior,
    notification_preferences: notifications,
  };

  if (existing) {
    const { error: updateRulesError } = await supabase
      .from("company_operating_rules")
      .update({ custom_rules: customRules })
      .eq("id", (existing as { id: string }).id)
      .eq("tenant_id", auth.tenantId);
    if (updateRulesError) return { error: updateRulesError.message };
  } else {
    const { error: insertRulesError } = await supabase.from("company_operating_rules").insert({
      tenant_id: auth.tenantId,
      company_id: companyId,
      custom_rules: customRules,
    });
    if (insertRulesError) return { error: insertRulesError.message };
  }

  revalidatePath("/implementation/settings");
  revalidatePath("/implementation");
  revalidatePath("/implementation/readiness");
  return { success: true };
}
