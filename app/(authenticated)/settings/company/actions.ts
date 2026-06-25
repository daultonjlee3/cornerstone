"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";

type FormState = { error?: string; success?: boolean };

function parseNum(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

export async function saveCompanyOperatingRules(
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

  const companyId = (formData.get("company_id") as string)?.trim();
  if (!companyId) return { error: "Company is required." };

  const payload = {
    tenant_id: auth.tenantId,
    company_id: companyId,
    regular_hours_per_day: parseNum(formData.get("regular_hours_per_day"), 8),
    regular_hours_per_week: parseNum(formData.get("regular_hours_per_week"), 40),
    daily_overtime_threshold: parseNum(formData.get("daily_overtime_threshold"), 8),
    weekly_overtime_threshold: parseNum(formData.get("weekly_overtime_threshold"), 40),
    overtime_multiplier: parseNum(formData.get("overtime_multiplier"), 1.5),
    double_time_threshold: parseNum(formData.get("double_time_threshold"), 12),
    double_time_multiplier: parseNum(formData.get("double_time_multiplier"), 2),
    saturday_multiplier: parseNum(formData.get("saturday_multiplier"), 1.5),
    sunday_multiplier: parseNum(formData.get("sunday_multiplier"), 2),
    holiday_multiplier: parseNum(formData.get("holiday_multiplier"), 2),
    night_shift_premium: parseNum(formData.get("night_shift_premium"), 0.15),
    travel_time_pay_multiplier: parseNum(formData.get("travel_time_pay_multiplier"), 1),
    default_operator_hourly_rate: parseNum(formData.get("default_operator_hourly_rate"), 45),
    fuel_cost_per_mile: parseNum(formData.get("fuel_cost_per_mile"), 0.85),
    idle_cost_per_hour: parseNum(formData.get("idle_cost_per_hour"), 35),
    truck_fixed_cost_per_hour: parseNum(formData.get("truck_fixed_cost_per_hour"), 28),
  };

  const { data: existing } = await supabase
    .from("company_operating_rules")
    .select("id")
    .eq("company_id", companyId)
    .eq("tenant_id", auth.tenantId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("company_operating_rules")
      .update(payload)
      .eq("id", (existing as { id: string }).id)
      .eq("tenant_id", auth.tenantId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("company_operating_rules").insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath("/settings/company");
  revalidatePath("/operations");
  revalidatePath("/dispatch");
  return { success: true };
}
