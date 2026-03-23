import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { PreventiveMaintenanceDetailActions } from "../components/pm-detail-actions";
import { formatDate } from "@/src/lib/date-utils";

export const metadata = {
  title: "Preventive Maintenance Plan | Cornerstone Tech",
  description: "Preventive maintenance plan details",
};

export default async function PreventiveMaintenanceDetailPage({
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

  const { data: planRaw, error } = await supabase
    .from("preventive_maintenance_plans")
    .select(
      "id, tenant_id, company_id, pm_plan_id, generate_parent_work_order, generate_child_work_orders, asset_id, property_id, building_id, unit_id, name, description, frequency_type, frequency_interval, start_date, next_run_date, last_run_date, auto_create_work_order, priority, estimated_duration_minutes, assigned_technician_id, instructions, status, companies(name), pm_plans(name, category), assets(asset_name, name), properties(property_name, name), buildings(building_name, name), units(unit_name, name_or_number), technicians!assigned_technician_id(technician_name, name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !planRaw) notFound();

  if ((planRaw as { tenant_id: string }).tenant_id !== tenantId) notFound();

  const row = planRaw as Record<string, unknown>;
  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
  const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
  const property = Array.isArray(row.properties) ? row.properties[0] : row.properties;
  const building = Array.isArray(row.buildings) ? row.buildings[0] : row.buildings;
  const unit = Array.isArray(row.units) ? row.units[0] : row.units;
  const technician = Array.isArray(row.technicians) ? row.technicians[0] : row.technicians;
  const pmPlan = Array.isArray(row.pm_plans) ? row.pm_plans[0] : row.pm_plans;

  const plan = {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    frequency_type: row.frequency_type as string,
    frequency_interval: Number(row.frequency_interval ?? 1),
    start_date: row.start_date as string,
    next_run_date: row.next_run_date as string,
    last_run_date: (row.last_run_date as string | null) ?? null,
    auto_create_work_order: Boolean(row.auto_create_work_order),
    priority: (row.priority as string | null) ?? "medium",
    estimated_duration_minutes:
      (row.estimated_duration_minutes as number | null) ?? null,
    instructions: (row.instructions as string | null) ?? null,
    status: row.status as "active" | "paused" | "archived",
    pm_plan_id: (row.pm_plan_id as string | null) ?? null,
    pm_plan_name:
      pmPlan && typeof pmPlan === "object"
        ? ((pmPlan as { name?: string }).name ?? null)
        : null,
    pm_plan_category:
      pmPlan && typeof pmPlan === "object"
        ? ((pmPlan as { category?: string }).category ?? null)
        : null,
    generate_parent_work_order:
      (row.generate_parent_work_order as boolean | null) ?? true,
    generate_child_work_orders:
      (row.generate_child_work_orders as boolean | null) ?? false,
    company_name:
      company && typeof company === "object"
        ? ((company as { name?: string }).name ?? null)
        : null,
    asset_id: (row.asset_id as string | null) ?? null,
    asset_name:
      asset && typeof asset === "object"
        ? ((asset as { asset_name?: string }).asset_name ??
          (asset as { name?: string }).name ??
          null)
        : null,
    property_name:
      property && typeof property === "object"
        ? ((property as { property_name?: string }).property_name ??
          (property as { name?: string }).name ??
          null)
        : null,
    building_name:
      building && typeof building === "object"
        ? ((building as { building_name?: string }).building_name ??
          (building as { name?: string }).name ??
          null)
        : null,
    unit_name:
      unit && typeof unit === "object"
        ? ((unit as { unit_name?: string }).unit_name ??
          (unit as { name_or_number?: string }).name_or_number ??
          null)
        : null,
    technician_name:
      technician && typeof technician === "object"
        ? ((technician as { technician_name?: string }).technician_name ??
          (technician as { name?: string }).name ??
          null)
        : null,
  };

  const { data: runsRaw } = await supabase
    .from("preventive_maintenance_runs")
    .select("id, scheduled_date, generated_work_order_id, status, notes, created_at")
    .eq("preventive_maintenance_plan_id", id)
    .order("scheduled_date", { ascending: false });

  const generatedWorkOrderIds = (runsRaw ?? [])
    .map((run) => (run as { generated_work_order_id?: string | null }).generated_work_order_id)
    .filter(Boolean) as string[];
  const runIds = (runsRaw ?? []).map((run) => (run as { id: string }).id);
  const { data: runWorkOrdersRaw } = runIds.length
    ? await supabase
        .from("preventive_maintenance_run_work_orders")
        .select("preventive_maintenance_run_id, work_order_id")
        .in("preventive_maintenance_run_id", runIds)
    : { data: [] as unknown[] };
  const runWorkOrdersByRunId = new Map<string, string[]>();
  for (const row of (runWorkOrdersRaw ?? []) as Array<{
    preventive_maintenance_run_id: string;
    work_order_id: string;
  }>) {
    const existing = runWorkOrdersByRunId.get(row.preventive_maintenance_run_id) ?? [];
    existing.push(row.work_order_id);
    runWorkOrdersByRunId.set(row.preventive_maintenance_run_id, existing);
  }
  const generatedWorkOrderIdsFromLinks = (runWorkOrdersRaw ?? []).map(
    (row) => (row as { work_order_id: string }).work_order_id
  );
  const allGeneratedWorkOrderIds = Array.from(
    new Set([...generatedWorkOrderIds, ...generatedWorkOrderIdsFromLinks])
  );
  const { data: workOrdersRaw } = allGeneratedWorkOrderIds.length
    ? await supabase
        .from("work_orders")
        .select("id, work_order_number, title, status")
        .in("id", allGeneratedWorkOrderIds)
    : { data: [] as unknown[] };
  const workOrderById = new Map(
    (workOrdersRaw ?? []).map((workOrder) => [
      (workOrder as { id: string }).id,
      workOrder as {
        id: string;
        work_order_number: string | null;
        title: string;
        status: string;
      },
    ])
  );

  const runs = (runsRaw ?? []).map((run) => {
    const runRow = run as Record<string, unknown>;
    const generatedWorkOrderId =
      (runRow.generated_work_order_id as string | null) ?? null;
    const workOrder = generatedWorkOrderId
      ? workOrderById.get(generatedWorkOrderId)
      : null;
    const linkedWorkOrderIds = runWorkOrdersByRunId.get(runRow.id as string) ?? [];
    const linkedWorkOrders = linkedWorkOrderIds
      .map((workOrderId) => workOrderById.get(workOrderId))
      .filter(Boolean);
    const parentWorkOrderId = linkedWorkOrderIds[0] ?? generatedWorkOrderId;
    const childCount = Math.max(
      0,
      linkedWorkOrders.filter((workOrder) => workOrder?.id !== parentWorkOrderId).length
    );
    return {
      id: runRow.id as string,
      scheduled_date: runRow.scheduled_date as string,
      status: runRow.status as string,
      notes: (runRow.notes as string | null) ?? null,
      generated_work_order_id: generatedWorkOrderId,
      work_order_number: workOrder?.work_order_number ?? null,
      work_order_title: workOrder?.title ?? null,
      work_order_status: workOrder?.status ?? null,
      linked_work_orders: linkedWorkOrders,
      child_work_order_count: childCount,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link href="/preventive-maintenance" className="hover:text-[var(--foreground)]">
          Preventive Maintenance
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{plan.name}</span>
      </div>

      <header className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--foreground)]">{plan.name}</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {plan.description ?? "No description"}
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              plan.status === "active"
                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : plan.status === "paused"
                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  : "bg-[var(--muted)]/20 text-[var(--muted)]"
            }`}
          >
            {plan.status}
          </span>
        </div>
        <div className="mt-4">
          <PreventiveMaintenanceDetailActions planId={plan.id} status={plan.status} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Plan overview</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Company</dt>
              <dd className="text-[var(--foreground)]">{plan.company_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Asset</dt>
              <dd className="text-[var(--foreground)]">
                {plan.asset_id ? (
                  <Link href={`/assets/${plan.asset_id}`} className="text-[var(--accent)] hover:underline">
                    {plan.asset_name ?? "View asset"}
                  </Link>
                ) : (
                  plan.asset_name ?? "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Location</dt>
              <dd className="text-[var(--foreground)]">
                {[plan.property_name, plan.building_name, plan.unit_name]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Technician</dt>
              <dd className="text-[var(--foreground)]">{plan.technician_name ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Schedule</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">PM Plan</dt>
              <dd className="text-[var(--foreground)]">
                {plan.pm_plan_id ? (
                  <Link href={`/preventive-maintenance/plans/${plan.pm_plan_id}`} className="text-[var(--accent)] hover:underline">
                    {plan.pm_plan_name ?? "View PM plan"}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Frequency</dt>
              <dd className="text-[var(--foreground)]">
                Every {plan.frequency_interval} {plan.frequency_type}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Start date</dt>
              <dd className="text-[var(--foreground)]">{formatDate(plan.start_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Next run</dt>
              <dd className="text-[var(--foreground)]">{formatDate(plan.next_run_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Last run</dt>
              <dd className="text-[var(--foreground)]">{formatDate(plan.last_run_date)}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Priority</dt>
              <dd className="text-[var(--foreground)]">{plan.priority}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Estimated duration</dt>
              <dd className="text-[var(--foreground)]">
                {plan.estimated_duration_minutes != null
                  ? `${plan.estimated_duration_minutes} min`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Hierarchy generation</dt>
              <dd className="text-[var(--foreground)]">
                Parent: {plan.generate_parent_work_order ? "Yes" : "No"} · Children: {plan.generate_child_work_orders ? "Yes" : "No"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Auto-create work order</dt>
              <dd className="text-[var(--foreground)]">
                {plan.auto_create_work_order ? "Yes" : "No"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          Instructions
        </h2>
        <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">
          {plan.instructions ?? "No instructions"}
        </p>
      </section>

      <section className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">PM Run History</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No runs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--card-border)]">
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Scheduled Date</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Status</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Generated Work Orders</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Child WOs</th>
                  <th className="px-2 py-2 font-medium text-[var(--foreground)]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-[var(--card-border)] last:border-0">
                    <td className="px-2 py-2 text-[var(--foreground)]">
                      {formatDate(run.scheduled_date)}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{run.status}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">
                      {run.linked_work_orders?.length ? (
                        <div className="space-y-1">
                          {run.linked_work_orders.map((wo) => (
                            <div key={wo?.id}>
                              <Link
                                href={`/work-orders/${wo?.id}`}
                                className="text-[var(--accent)] hover:underline"
                              >
                                {wo?.work_order_number ?? wo?.title ?? "View work order"}
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : run.generated_work_order_id ? (
                        <Link
                          href={`/work-orders/${run.generated_work_order_id}`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {run.work_order_number ?? run.work_order_title ?? "View work order"}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-2 py-2 text-[var(--muted)]">{run.child_work_order_count ?? 0}</td>
                    <td className="px-2 py-2 text-[var(--muted)]">{run.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
