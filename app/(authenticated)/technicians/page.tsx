import Link from "next/link";
import { Wrench } from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import type { Technician } from "./components/technician-form-modal";
import { TechniciansList } from "./components/technicians-list";
import { PageHeader } from "@/src/components/ui/page-header";

export const metadata = {
  title: "Technicians | Cornerstone Tech",
  description: "Manage technicians",
};

export default async function TechniciansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  const companyIds = (companies ?? []).map((c) => c.id);
  if (companyIds.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader
          icon={<Wrench className="size-5" />}
          title="Technicians"
          subtitle="Manage technicians and assign them to work orders."
        />
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] py-12 text-center">
          <p className="text-[var(--muted)]">Create a company first, then add technicians.</p>
        </div>
      </div>
    );
  }

  const { data: techniciansRaw, error } = await supabase
    .from("technicians")
    .select(
      "id, technician_name, name, company_id, user_id, email, phone, trade, status, hourly_cost, notes, companies(name), users(is_portal_only)"
    )
    .in("company_id", companyIds)
    .order("technician_name")
    .order("name");

  const technicians = (techniciansRaw ?? []).map((t) => {
    const row = t as Record<string, unknown>;
    const comp = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    const company_name =
      comp && typeof comp === "object" && "name" in comp
        ? (comp as { name?: string }).name
        : null;
    const user = Array.isArray(row.users) ? row.users[0] : row.users;
    const rest = { ...row };
    delete (rest as { companies?: unknown }).companies;
    delete (rest as { users?: unknown }).users;
    return {
      ...rest,
      company_name: company_name ?? undefined,
      is_portal_only:
        user && typeof user === "object" && "is_portal_only" in user
          ? Boolean((user as { is_portal_only?: boolean | null }).is_portal_only)
          : false,
    };
  }) as (Technician & { company_name?: string })[];

  const { data: completedWorkOrders } = await supabase
    .from("work_orders")
    .select(
      "id, assigned_technician_id, completed_by_technician_id, created_at, completed_at, status"
    )
    .in("company_id", companyIds)
    .eq("status", "completed");

  const completedWorkOrderIds = (completedWorkOrders ?? []).map(
    (row) => (row as { id: string }).id
  );
  let timeLogRows: unknown[] = [];
  if (completedWorkOrderIds.length > 0) {
    const timeLogsResult = await supabase
      .from("work_order_time_logs")
      .select("work_order_id, technician_id, duration_minutes")
      .in("work_order_id", completedWorkOrderIds);
    if (timeLogsResult.error) {
      const fallback = await supabase
        .from("work_order_labor_entries")
        .select("work_order_id, technician_id, duration_minutes")
        .in("work_order_id", completedWorkOrderIds);
      timeLogRows = fallback.data ?? [];
    } else {
      timeLogRows = timeLogsResult.data ?? [];
    }
  }

  const productivityByTechnician = new Map<
    string,
    {
      jobsCompleted: number;
      completionMinutesTotal: number;
      completionSampleCount: number;
      laborMinutesTotal: number;
    }
  >();
  for (const row of completedWorkOrders ?? []) {
    const record = row as {
      assigned_technician_id?: string | null;
      completed_by_technician_id?: string | null;
      created_at?: string | null;
      completed_at?: string | null;
    };
    const technicianId =
      record.completed_by_technician_id ?? record.assigned_technician_id ?? null;
    if (!technicianId) continue;
    const entry =
      productivityByTechnician.get(technicianId) ?? {
        jobsCompleted: 0,
        completionMinutesTotal: 0,
        completionSampleCount: 0,
        laborMinutesTotal: 0,
      };
    entry.jobsCompleted += 1;
    if (record.created_at && record.completed_at) {
      const start = new Date(record.created_at).getTime();
      const end = new Date(record.completed_at).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
        entry.completionMinutesTotal += Math.floor((end - start) / 60000);
        entry.completionSampleCount += 1;
      }
    }
    productivityByTechnician.set(technicianId, entry);
  }
  for (const row of timeLogRows) {
    const record = row as { technician_id?: string | null; duration_minutes?: number | null };
    if (!record.technician_id) continue;
    const entry =
      productivityByTechnician.get(record.technician_id) ?? {
        jobsCompleted: 0,
        completionMinutesTotal: 0,
        completionSampleCount: 0,
        laborMinutesTotal: 0,
      };
    if (
      typeof record.duration_minutes === "number" &&
      Number.isFinite(record.duration_minutes)
    ) {
      entry.laborMinutesTotal += Math.max(0, record.duration_minutes);
    }
    productivityByTechnician.set(record.technician_id, entry);
  }

  const productivityRows = technicians
    .map((technician) => {
      const id = technician.id;
      const metric = productivityByTechnician.get(id) ?? {
        jobsCompleted: 0,
        completionMinutesTotal: 0,
        completionSampleCount: 0,
        laborMinutesTotal: 0,
      };
      const averageCompletionMinutes =
        metric.completionSampleCount > 0
          ? Math.round(metric.completionMinutesTotal / metric.completionSampleCount)
          : null;
      const laborHours = Number((metric.laborMinutesTotal / 60).toFixed(2));
      return {
        id,
        name: technician.technician_name ?? technician.name ?? "Technician",
        jobsCompleted: metric.jobsCompleted,
        averageCompletionMinutes,
        laborHours,
      };
    })
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted || b.laborHours - a.laborHours);

  const totalJobsCompleted = productivityRows.reduce(
    (sum, row) => sum + row.jobsCompleted,
    0
  );
  const totalLaborHours = Number(
    productivityRows.reduce((sum, row) => sum + row.laborHours, 0).toFixed(2)
  );
  const weightedCompletionMinutes = productivityRows.reduce(
    (sum, row) =>
      sum +
      (row.averageCompletionMinutes != null
        ? row.averageCompletionMinutes * row.jobsCompleted
        : 0),
    0
  );
  const weightedSampleCount = productivityRows.reduce((sum, row) => sum + row.jobsCompleted, 0);
  const averageCompletionMinutesOverall =
    weightedSampleCount > 0 ? Math.round(weightedCompletionMinutes / weightedSampleCount) : null;

  const formatMinutes = (minutes: number | null) => {
    if (minutes == null) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours <= 0) return `${mins}m`;
    return `${hours}h ${String(mins).padStart(2, "0")}m`;
  };

  const companyOptions = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Wrench className="size-5" />}
        title="Technicians"
        subtitle="Manage technicians and assign them to work orders."
        actions={
          <>
            <Link
              href="/technicians/work-queue"
              className="inline-flex rounded-[var(--radius-control)] border border-[var(--card-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--background)]/80"
            >
              Open Technician Work Queue
            </Link>
            <Link
              href="/portal"
              className="inline-flex rounded-[var(--radius-control)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow)] hover:bg-[var(--accent-hover)]"
            >
              Open Technician Portal
            </Link>
          </>
        }
      />
      <section className="space-y-3 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Technician productivity
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Based on completed work orders and tracked labor sessions.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
            <p className="text-xs text-[var(--muted)]">Jobs completed</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{totalJobsCompleted}</p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
            <p className="text-xs text-[var(--muted)]">Average completion time</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">
              {formatMinutes(averageCompletionMinutesOverall)}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
            <p className="text-xs text-[var(--muted)]">Labor hours</p>
            <p className="text-lg font-semibold text-[var(--foreground)]">{totalLaborHours.toFixed(2)}</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="min-w-[640px] text-sm">
            <thead className="bg-[var(--background)]/60 text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 text-left">Technician</th>
                <th className="px-3 py-2 text-left">Jobs completed</th>
                <th className="px-3 py-2 text-left">Avg completion time</th>
                <th className="px-3 py-2 text-left">Labor hours</th>
              </tr>
            </thead>
            <tbody>
              {productivityRows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--card-border)]">
                  <td className="px-3 py-2 text-[var(--foreground)]">{row.name}</td>
                  <td className="px-3 py-2 text-[var(--foreground)]">{row.jobsCompleted}</td>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {formatMinutes(row.averageCompletionMinutes)}
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]">
                    {row.laborHours.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <TechniciansList
        technicians={technicians}
        companies={companyOptions}
        error={error?.message ?? null}
      />
    </div>
  );
}
