import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { Repeat } from "lucide-react";
import { PageHeader } from "@/src/components/ui/page-header";
import { PMProgramPlansList } from "../components/pm-program-plans-list";

export const metadata = {
  title: "PM Plans | Cornerstone Tech",
  description: "Program-level preventive maintenance plans",
};

export default async function PMPlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: plansRaw } = await supabase
    .from("pm_plans")
    .select("id, company_id, name, description, category, active, companies(name)")
    .eq("tenant_id", tenantId)
    .order("name");
  const { data: companiesRaw } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");
  const companyOptions = (companiesRaw ?? []).map((row) => ({
    id: (row as { id: string }).id,
    name: (row as { name: string }).name,
  }));

  const planIds = (plansRaw ?? []).map((row) => (row as { id: string }).id);
  const { data: schedulesRaw } = planIds.length
    ? await supabase
        .from("preventive_maintenance_plans")
        .select("id, pm_plan_id, next_run_date, status")
        .in("pm_plan_id", planIds)
    : { data: [] as unknown[] };

  const schedulesByPlan = new Map<string, Array<{ next_run_date: string | null; status: string }>>();
  for (const row of (schedulesRaw ?? []) as Array<{
    pm_plan_id: string | null;
    next_run_date: string | null;
    status: string;
  }>) {
    if (!row.pm_plan_id) continue;
    const existing = schedulesByPlan.get(row.pm_plan_id) ?? [];
    existing.push({ next_run_date: row.next_run_date, status: row.status });
    schedulesByPlan.set(row.pm_plan_id, existing);
  }

  const plans = (plansRaw ?? []).map((row) => {
    const plan = row as Record<string, unknown>;
    const company = Array.isArray(plan.companies) ? plan.companies[0] : plan.companies;
    const schedules = schedulesByPlan.get(plan.id as string) ?? [];
    const nextDue = schedules
      .map((item) => item.next_run_date)
      .filter(Boolean)
      .sort()[0] ?? null;
    return {
      id: plan.id as string,
      company_id: plan.company_id as string,
      name: plan.name as string,
      description: (plan.description as string | null) ?? null,
      category: (plan.category as string | null) ?? null,
      active: (plan.active as boolean) ?? true,
      company_name:
        company && typeof company === "object" && "name" in (company as object)
          ? ((company as { name?: string }).name ?? null)
          : null,
      schedule_count: schedules.length,
      next_due_run: nextDue,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Repeat className="size-5" />}
        title="PM Plans"
        subtitle="Top-level preventive maintenance programs and their schedule rollups."
      />
      <PMProgramPlansList plans={plans} companies={companyOptions} />
    </div>
  );
}
