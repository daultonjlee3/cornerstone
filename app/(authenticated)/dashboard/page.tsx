import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { loadOperationsDashboardData } from "@/src/lib/dashboard/operations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { MetricCard } from "@/src/components/ui/metric-card";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { Button } from "@/src/components/ui/button";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
      dateStyle: "medium",
    });
  } catch {
    return "—";
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", membership.tenant_id);
  const companyIds = (companies ?? []).map((row) => row.id);

  const operations = await loadOperationsDashboardData({
    supabase,
    companyIds,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Operations Command Center
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Live operational intelligence across work orders, preventive maintenance, and technician execution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dispatch">
            <Button variant="secondary">Open Dispatch</Button>
          </Link>
          <Link href="/work-orders">
            <Button>Open Work Orders</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard title="Open Work Orders" value={operations.kpis.openWorkOrders} description="New, ready, scheduled, in progress, on hold" />
        <MetricCard title="In Progress Work Orders" value={operations.kpis.inProgressWorkOrders} description="Actively being executed right now" />
        <MetricCard title="Completed Today" value={operations.kpis.completedToday} description="Jobs completed in current day window" />
        <MetricCard title="Overdue Work Orders" value={operations.kpis.overdueWorkOrders} description="Due date has passed without completion" trend={operations.kpis.overdueWorkOrders > 0 ? { label: "Needs immediate attention", tone: "bad" } : { label: "No overdue jobs", tone: "good" }} />
        <MetricCard title="Scheduled Today" value={operations.kpis.scheduledToday} description="Jobs scheduled for today" />
        <MetricCard title="Active Technicians" value={operations.kpis.activeTechnicians} description="Technicians with active status" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Operational Alerts</CardTitle>
            <CardDescription>High-signal alerts requiring coordination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Overdue work orders
              </p>
              {operations.alerts.overdueWorkOrders.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--muted)]">No overdue work orders.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {operations.alerts.overdueWorkOrders.slice(0, 4).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2">
                      <div className="min-w-0">
                        <Link href={`/work-orders/${row.id}`} className="truncate text-sm font-medium text-[var(--accent)] hover:underline">
                          {row.work_order_number ?? row.title}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">{row.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={row.priority} />
                        <span className="text-xs text-red-600 dark:text-red-400">{formatDate(row.due_date)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                High priority not started
              </p>
              {operations.alerts.highPriorityNotStarted.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--muted)]">No blocked high-priority jobs.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {operations.alerts.highPriorityNotStarted.slice(0, 4).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2">
                      <Link href={`/work-orders/${row.id}`} className="truncate text-sm font-medium text-[var(--accent)] hover:underline">
                        {row.work_order_number ?? row.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={row.priority} />
                        <StatusBadge status={row.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preventive Maintenance Alerts</CardTitle>
            <CardDescription>Upcoming PM tasks and repeated-failure assets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                PM tasks due soon
              </p>
              {operations.alerts.pmDueSoon.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--muted)]">No PM tasks due in the next 7 days.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {operations.alerts.pmDueSoon.slice(0, 4).map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2">
                      <div className="min-w-0">
                        <Link href={`/preventive-maintenance/${row.id}`} className="truncate text-sm font-medium text-[var(--accent)] hover:underline">
                          {row.name}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">{row.asset_name ?? "No linked asset"}</p>
                      </div>
                      <span className="text-xs text-[var(--muted)]">{formatDate(row.next_run_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Assets with repeated failures (30 days)
              </p>
              {operations.alerts.repeatedFailures.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--muted)]">No repeated-failure assets detected.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {operations.alerts.repeatedFailures.slice(0, 4).map((row) => (
                    <li key={row.asset_id} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2">
                      <Link href={`/assets/${row.asset_id}`} className="truncate text-sm font-medium text-[var(--accent)] hover:underline">
                        {row.asset_name}
                      </Link>
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                        {row.failure_count}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Low stock inventory
              </p>
              {operations.alerts.lowStock.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--muted)]">No low-stock alerts.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {operations.alerts.lowStock.slice(0, 4).map((row) => (
                    <li
                      key={row.balance_id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link href="/inventory" className="truncate text-sm font-medium text-[var(--accent)] hover:underline">
                          {row.product_name}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">{row.location_name}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {row.quantity_on_hand} / {row.reorder_point}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Backlog: Open"
          value={operations.backlog.openWorkOrders}
          description="Open maintenance backlog"
        />
        <MetricCard
          title="Backlog: Overdue"
          value={operations.backlog.overdueWorkOrders}
          description="Overdue workload"
        />
        <MetricCard
          title="PM Not Scheduled"
          value={operations.backlog.pmNotScheduled}
          description="Due PM tasks waiting scheduling"
        />
        <MetricCard
          title="Upcoming PM Tasks"
          value={operations.backlog.upcomingPmTasks}
          description="PM tasks due in next 14 days"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Asset Health</CardTitle>
            <CardDescription>Risk signals from maintenance history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2">
              <span className="text-sm text-[var(--muted)]">Multiple failures (30d)</span>
              <span className="text-lg font-semibold text-[var(--foreground)]">
                {operations.assetHealth.assetsWithMultipleFailures30d}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2">
              <span className="text-sm text-[var(--muted)]">Assets overdue for PM</span>
              <span className="text-lg font-semibold text-[var(--foreground)]">
                {operations.assetHealth.assetsOverdueForPm}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2">
              <span className="text-sm text-[var(--muted)]">Not serviced in 6+ months</span>
              <span className="text-lg font-semibold text-[var(--foreground)]">
                {operations.assetHealth.assetsNotServicedIn6Months}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Technician Activity</CardTitle>
              <CardDescription>Completed work, active assignments, and labor hours for today</CardDescription>
            </CardHeader>
            <CardContent>
              {operations.technicianActivity.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No active technicians available.</p>
              ) : (
                <DataTable className="shadow-none">
                  <Table>
                    <TableHead>
                      <Th>Technician</Th>
                      <Th>Completed Today</Th>
                      <Th>Current Assignments</Th>
                      <Th>Labor Hours Today</Th>
                    </TableHead>
                    <TBody>
                      {operations.technicianActivity.map((row) => (
                        <Tr key={row.technician_id}>
                          <Td>{row.technician_name}</Td>
                          <Td className="text-[var(--muted)]">{row.completed_today}</Td>
                          <Td className="text-[var(--muted)]">{row.current_assignments}</Td>
                          <Td className="text-[var(--muted)]">{row.labor_hours_today.toFixed(2)}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </DataTable>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
