import { redirect } from "next/navigation";
import { requireImplementationAccess } from "@/app/(authenticated)/implementation/_lib/access";
import { ImplementationSettingsForm } from "@/app/(authenticated)/implementation/settings/settings-form";

export default async function ImplementationSettingsPage() {
  const { supabase, auth } = await requireImplementationAccess();

  const { data: companyRow } = await supabase
    .from("companies")
    .select("id, timezone, currency")
    .eq("tenant_id", auth.tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!companyRow) {
    redirect("/onboarding");
  }

  const company = companyRow as {
    id: string;
    timezone: string | null;
    currency: string | null;
  };

  const { data: rulesRow } = await supabase
    .from("company_operating_rules")
    .select("custom_rules")
    .eq("tenant_id", auth.tenantId)
    .eq("company_id", company.id)
    .maybeSingle();

  const customRules =
    (rulesRow as { custom_rules?: Record<string, unknown> | null } | null)?.custom_rules ?? {};

  const canManage =
    auth.isPlatformSuperAdmin ||
    auth.membershipRole === "owner" ||
    auth.membershipRole === "admin";

  return (
    <ImplementationSettingsForm
      companyId={company.id}
      canManage={canManage}
      defaults={{
        businessType: String(customRules.business_type ?? "custom"),
        timezone: company.timezone ?? "UTC",
        units: String(customRules.units ?? "imperial"),
        currency: company.currency ?? "USD",
        workWeek: String(customRules.work_week ?? "monday-friday"),
        baselineWindowDays: Number(customRules.baseline_window_days ?? 90),
        importBehavior: String(customRules.import_behavior ?? "upsert"),
        notificationPreferences: String(customRules.notification_preferences ?? "critical"),
      }}
    />
  );
}
