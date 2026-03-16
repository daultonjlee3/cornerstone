import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  UserCog,
  UserMinus,
  Clock,
  Percent,
  CalendarClock,
  BadgeCheck,
  Flame,
} from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { getTenantIdForUser } from "@/src/lib/auth-context";
import { loadOperationsDashboardData } from "@/src/lib/dashboard/operations";
import { loadOperationsIntelligenceData } from "@/src/lib/dashboard/operations-intelligence";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { MetricCard } from "@/src/components/ui/metric-card";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { StatusBadge } from "@/src/components/ui/status-badge";
import { PriorityBadge } from "@/src/components/ui/priority-badge";
import { PageHeader } from "@/src/components/ui/page-header";
import { DashboardHeaderActions } from "./components/dashboard-header-actions";
import { DashboardHelperTips } from "./components/dashboard-helper-tips";
import { DashboardSectionEmpty } from "./components/dashboard-section-empty";
import { DashboardSetupGuidance } from "./components/dashboard-setup-guidance";
import { formatDate } from "@/src/lib/date-utils";

const PRIORITY_URGENCY_ORDER: Record<string, number> = { emergency: 0, urgent: 1, high: 2 };
function priorityUrgency(priority: string | null | undefined): number {
  return PRIORITY_URGENCY_ORDER[String(priority ?? "").toLowerCase()] ?? 3;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantIdForUser(supabase);
  if (!tenantId) redirect("/onboarding");

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId);
  const companyIds = (companies ?? []).map((row) => row.id);

  // Run both data loaders concurrently — they are completely independent.
  // Previously sequential, this saves ~300–500ms on every dashboard load.
  const [operations, intelligence] = await Promise.all([
    loadOperationsDashboardData({ supabase, companyIds }),
    loadOperationsIntelligenceData({ supabase, companyIds }),
  ]);

  const noCompanies = companyIds.length === 0;
  const hasNoVisibleActivity =
    !noCompanies &&
    operations.kpis.openWorkOrders === 0 &&
    operations.kpis.completedToday === 0 &&
    operations.kpis.scheduledToday === 0 &&
    operations.kpis.activeTechnicians === 0 &&
    intelligence.pmCompliance.upcomingTasks.length === 0 &&
    intelligence.pmCompliance.overdueTasks.length === 0;

  return (
    <div className="space-y-8" data-tour="dashboard:overview" data-testid="dashboard-page">
      <div data-tour="demo-guided:command-center" className="space-y-8">
      <PageHeader
        icon={<LayoutDashboard className="size-5" />}
        title="Operations Command Center"
        subtitle="Live operational intelligence across work orders, preventive maintenance, and technician execution."
        actions={<span data-tour="dashboard:quick-actions"><DashboardHeaderActions /></span>}
      />

      <DashboardHelperTips overdueWorkOrders={operations.kpis.overdueWorkOrders} />

      {(noCompanies || hasNoVisibleActivity) && (
        <DashboardSetupGuidance noCompanies={noCompanies} emptyButConfigured={hasNoVisibleActivity} />
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-tour="dashboard:metrics">
        <MetricCard
          title="Open Work Orders"
          value={operations.kpis.openWorkOrders}
          description={operations.kpis.openWorkOrders === 0 ? "No open work orders yet" : "New, ready, scheduled, in progress, on hold"}
          icon={ClipboardList}
        />
        <MetricCard
          title="In Progress Work Orders"
          value={operations.kpis.inProgressWorkOrders}
          description={operations.kpis.inProgressWorkOrders === 0 ? "None in progress" : "Actively being executed right now"}
          icon={Wrench}
        />
        <MetricCard
          title="Completed Today"
          value={operations.kpis.completedToday}
          description={operations.kpis.completedToday === 0 ? "No completions today yet" : "Jobs completed in current day window"}
          icon={CheckCircle}
          variant={operations.kpis.completedToday > 0 ? "success" : "default"}
        />
        <MetricCard
          title="Overdue Work Orders"
          value={operations.kpis.overdueWorkOrders}
          description="Due date has passed without completion"
          trend={operations.kpis.overdueWorkOrders > 0 ? { label: "Needs immediate attention", tone: "bad" } : { label: "No overdue jobs", tone: "good" }}
          icon={AlertTriangle}
          variant={operations.kpis.overdueWorkOrders > 0 ? "danger" : "default"}
          className={operations.kpis.overdueWorkOrders > 0 ? "ring-1 ring-red-200/50" : undefined}
        />
        <MetricCard
          title="Scheduled Today"
          value={operations.kpis.scheduledToday}
          description={operations.kpis.scheduledToday === 0 ? "Nothing scheduled for today" : "Jobs scheduled for today"}
          icon={CalendarCheck}
        />
        <MetricCard
          title="Active Technicians"
          value={operations.kpis.activeTechnicians}
          description={operations.kpis.activeTechnicians === 0 ? "No active technicians" : "Technicians with active status"}
          icon={UserCog}
        />
        <MetricCard
          title="Unassigned Work Orders"
          value={operations.kpis.unassignedWorkOrders}
          description={operations.kpis.unassignedWorkOrders === 0 ? "All open work orders have an assignee" : "Open work orders with no technician assigned"}
          icon={UserMinus}
          trend={operations.kpis.unassignedWorkOrders > 0 ? { label: "Assign to schedule", tone: "neutral" } : undefined}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3" data-tour="dashboard:technicians">
        <Card>
          <CardHeader>
            <CardTitle>Asset Health</CardTitle>
            <CardDescription>
              {operations.assetHealth.assetsWithMultipleFailures30d === 0 &&
              operations.assetHealth.assetsOverdueForPm === 0 &&
              operations.assetHealth.assetsNotServicedIn6Months === 0
                ? "Risk signals from maintenance history — none detected yet"
                : "Risk signals from maintenance history"}
            </CardDescription>
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
                <DashboardSectionEmpty
                  message="No active technicians."
                  subtext="Add technicians and set status to active to see completed work and assignments here."
                  cta={{ label: "Technicians", href: "/technicians" }}
                />
              ) : (
                <DataTable className="shadow-none">
                  <Table>
                    <TableHead>
                      <Th>Technician</Th>
                      <Th>Status</Th>
                      <Th>Completed Today</Th>
                      <Th>Current Assignments</Th>
                      <Th>Labor Hours Today</Th>
                    </TableHead>
                    <TBody>
                      {operations.technicianActivity.map((row) => (
                        <Tr key={row.technician_id}>
                          <Td>{row.technician_name}</Td>
                          <Td>
                            <span className="inline-flex items-center rounded-full border border-emerald-200/60 bg-emerald-50/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                              Active
                            </span>
                          </Td>
                          <Td className="text-[var(--muted)]">{row.completed_today}</Td>
                          <Td className="text-[var(--muted)]">{row.current_assignments}</Td>
                          <Td className="text-[var(--muted)]">
                            {row.labor_hours_today.toFixed(1)} / 8 hrs
                          </Td>
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

      <section className="space-y-4 pt-1">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">PM Compliance Engine</h2>
          <p className="text-sm text-[var(--muted)]">
            On-time, late, and missed PM execution with upcoming/overdue schedule visibility.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Completed On-Time"
            value={intelligence.pmCompliance.completedOnTime}
            description="Completed by scheduled PM date"
            icon={BadgeCheck}
          />
          <MetricCard
            title="Completed Late"
            value={intelligence.pmCompliance.completedLate}
            description="Completed after scheduled PM date"
            icon={Clock}
          />
          <MetricCard
            title="Missed PM"
            value={intelligence.pmCompliance.missed}
            description="Past due without completion"
            icon={AlertTriangle}
          />
          <MetricCard
            title="Compliance %"
            value={intelligence.pmCompliance.compliancePercentage != null ? `${intelligence.pmCompliance.compliancePercentage.toFixed(2)}%` : "—"}
            description={
              intelligence.pmCompliance.compliancePercentage != null
                ? "On-time completions vs. due PM runs"
                : "Create PM plans and complete runs to see compliance here."
            }
            icon={Percent}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming PM Tasks</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {intelligence.pmCompliance.upcomingTasks.length === 0 ? (
                <DashboardSectionEmpty
                  message="No upcoming PM tasks in the next 30 days."
                  subtext="PM metrics and this list will populate after you create preventive maintenance plans."
                  cta={{ label: "Preventive maintenance", href: "/preventive-maintenance" }}
                />
              ) : (
                <ul className="space-y-2">
                  {intelligence.pmCompliance.upcomingTasks.slice(0, 6).map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/preventive-maintenance/${row.id}`}
                          className="truncate text-sm font-medium text-[var(--accent)] hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">{row.asset_name ?? "No linked asset"}</p>
                      </div>
                      <span className="text-xs text-[var(--muted)]">{formatDate(row.next_run_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Overdue PM Tasks</CardTitle>
              <CardDescription>Active plans that missed next run date</CardDescription>
            </CardHeader>
            <CardContent>
              {intelligence.pmCompliance.overdueTasks.length === 0 ? (
                <DashboardSectionEmpty
                  message="No overdue PM tasks."
                  subtext="Active plans that have passed their next run date will appear here."
                  cta={{ label: "View PM plans", href: "/preventive-maintenance" }}
                />
              ) : (
                <ul className="space-y-2">
                  {intelligence.pmCompliance.overdueTasks.slice(0, 6).map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-lg border border-red-200/70 bg-red-50/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/preventive-maintenance/${row.id}`}
                          className="truncate text-sm font-medium text-[var(--accent)] hover:underline"
                        >
                          {row.name}
                        </Link>
                        <p className="truncate text-xs text-[var(--muted)]">{row.asset_name ?? "No linked asset"}</p>
                      </div>
                      <span className="text-xs font-medium text-red-700">{formatDate(row.next_run_date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" data-tour="dashboard:urgent">
        <Card>
          <CardHeader>
            <CardTitle>Operational Alerts</CardTitle>
            <CardDescription>High-signal alerts requiring coordination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <AlertTriangle className="size-3.5 shrink-0 text-red-500/80" aria-hidden />
                Overdue work orders
              </p>
              {operations.alerts.overdueWorkOrders.length === 0 ? (
                <DashboardSectionEmpty message="No overdue work orders." subtext="Work orders past due will appear here." cta={{ label: "Work orders", href: "/work-orders" }} className="mt-1" />
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
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Flame className="size-3.5 shrink-0 text-amber-500/80" aria-hidden />
                High priority not started
              </p>
              {operations.alerts.highPriorityNotStarted.length === 0 ? (
                <DashboardSectionEmpty message="No high-priority jobs waiting to start." subtext="Urgent or high-priority work orders not yet started will appear here." cta={{ label: "Work orders", href: "/work-orders" }} className="mt-1" />
              ) : (
                <ul className="mt-2 space-y-2">
                  {[...operations.alerts.highPriorityNotStarted]
                    .sort((a, b) => {
                      const byPriority = priorityUrgency(a.priority) - priorityUrgency(b.priority);
                      if (byPriority !== 0) return byPriority;
                      return (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? "");
                    })
                    .slice(0, 4)
                    .map((row) => (
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
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                <Wrench className="size-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
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
                <DashboardSectionEmpty message="No repeated-failure assets in the last 30 days." subtext="Assets with multiple repair/emergency completions will appear here." cta={{ label: "Assets", href: "/assets" }} className="mt-1" />
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
          description={operations.backlog.openWorkOrders === 0 ? "No open backlog" : "Open maintenance backlog"}
          icon={ClipboardList}
        />
        <MetricCard
          title="Backlog: Overdue"
          value={operations.backlog.overdueWorkOrders}
          description={operations.backlog.overdueWorkOrders === 0 ? "No overdue backlog" : "Overdue workload"}
          icon={AlertTriangle}
        />
        <MetricCard
          title="PM Not Scheduled"
          value={operations.backlog.pmNotScheduled}
          description={operations.backlog.pmNotScheduled === 0 ? "No PM past due unscheduled" : "Due PM tasks waiting scheduling"}
          icon={CalendarClock}
        />
        <MetricCard
          title="Upcoming PM Tasks"
          value={operations.backlog.upcomingPmTasks}
          description={operations.backlog.upcomingPmTasks === 0 ? "No PM in next 14 days" : "PM tasks due in next 14 days"}
          icon={Calendar}
        />
      </section>
      </div>
    </div>
  );
}
