import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { PageHeader } from "@/src/components/ui/page-header";
import { Repeat } from "lucide-react";

export const metadata = {
  title: "PM Plan Detail | Cornerstone Tech",
  description: "PM plan schedules and rollups",
};

export default async function PMPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: planRaw } = await supabase
    .from("pm_plans")
    .select("id, tenant_id, company_id, name, description, category, active, companies(name)")
    .eq("id", id)
    .maybeSingle();
  if (!planRaw) notFound();
  if ((planRaw as { tenant_id: string }).tenant_id !== tenantId) notFound();

  const { data: schedulesRaw } = await supabase
    .from("preventive_maintenance_plans")
    .select(
      "id, name, frequency_type, frequency_interval, next_run_date, last_run_date, status, property_id, building_id, unit_id, asset_id, assets(asset_name, name), preventive_maintenance_schedule_tasks(id)"
    )
    .eq("pm_plan_id", id)
    .order("next_run_date", { ascending: true });

  const nowDate = new Date().toISOString().slice(0, 10);
  const schedules = (schedulesRaw ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const asset = Array.isArray(record.assets) ? record.assets[0] : record.assets;
    const tasks = (record.preventive_maintenance_schedule_tasks as unknown[]) ?? [];
    return {
      id: record.id as string,
      name: (record.name as string) ?? "Schedule",
      frequency: `Every ${Number(record.frequency_interval ?? 1)} ${String(record.frequency_type ?? "monthly")}`,
      next_run_date: (record.next_run_date as string | null) ?? null,
      last_run_date: (record.last_run_date as string | null) ?? null,
      status: (record.status as string) ?? "active",
      scope:
        ((asset as { asset_name?: string }).asset_name ??
          (asset as { name?: string }).name ??
          null) ??
        [record.property_id, record.building_id, record.unit_id].filter(Boolean).join(" / ") ??
        "—",
      taskCount: tasks.length,
      overdue:
        !!record.next_run_date &&
        (record.next_run_date as string) < nowDate &&
        (record.status as string) === "active",
    };
  });

  const activeSchedules = schedules.filter((row) => row.status === "active").length;
  const nextDueRun = schedules
    .map((row) => row.next_run_date)
    .filter(Boolean)
    .sort()[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Repeat className="size-5" />}
        title={(planRaw as { name: string }).name}
        subtitle={(planRaw as { description?: string | null }).description ?? "No description"}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted)]">Total schedules</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{schedules.length}</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted)]">Active schedules</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{activeSchedules}</p>
        </div>
        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <p className="text-xs text-[var(--muted)]">Next due run</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{nextDueRun ?? "—"}</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Schedules</h2>
          <Link href="/preventive-maintenance?new=1" className="text-sm text-[var(--accent)] hover:underline">
            Add Schedule
          </Link>
        </div>
        {schedules.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No schedules under this PM Plan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-2 py-2">Schedule</th>
                  <th className="px-2 py-2">Frequency</th>
                  <th className="px-2 py-2">Next run</th>
                  <th className="px-2 py-2">Scope</th>
                  <th className="px-2 py-2">Tasks</th>
                  <th className="px-2 py-2">Last run</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-2 py-2">
                      <Link href={`/preventive-maintenance/${schedule.id}`} className="text-[var(--accent)] hover:underline">
                        {schedule.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{schedule.frequency}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{schedule.next_run_date ?? "—"}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{schedule.scope || "—"}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{schedule.taskCount}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{schedule.last_run_date ?? "—"}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      {schedule.overdue ? "overdue" : schedule.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
