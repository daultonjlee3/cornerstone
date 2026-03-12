import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { MetricCard } from "@/src/components/ui/metric-card";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import {
  getReportDataset,
  loadOperationsIntelligenceData,
  type OperationsReportType,
} from "@/src/lib/dashboard/operations-intelligence";

export const metadata = {
  title: "Operations Intelligence Reports | Cornerstone Tech",
  description: "Reporting and analytics for maintenance operations",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

const REPORT_TYPES: OperationsReportType[] = [
  "maintenance_cost_by_asset",
  "maintenance_cost_by_building",
  "work_orders_by_technician",
  "work_orders_by_property",
  "asset_failure_rate",
];

type BarSeriesProps = {
  title: string;
  subtitle: string;
  rows: { label: string; value: number }[];
  formatter?: (value: number) => string;
};

function BarSeries({
  title,
  subtitle,
  rows,
  formatter = (value) => String(value),
}: BarSeriesProps) {
  const topRows = rows.slice(0, 8);
  const maxValue = Math.max(...topRows.map((row) => row.value), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {topRows.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No data for selected period.</p>
        ) : (
          <ul className="space-y-2">
            {topRows.map((row) => (
              <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3">
                <div className="space-y-1">
                  <p className="truncate text-sm font-medium text-[var(--foreground)]">{row.label}</p>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.max(4, (row.value / maxValue) * 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-right text-sm font-semibold text-[var(--foreground)]">
                  {formatter(row.value)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function ReportsPage() {
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

  const intelligence = await loadOperationsIntelligenceData({
    supabase,
    companyIds,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Operations Intelligence Reports
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cost, compliance, workload, and reliability analytics from live operational data.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Reporting window: {intelligence.dateRange.startDate} to {intelligence.dateRange.endDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]/70"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/work-orders"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
          >
            Open Work Orders
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="PM On-Time"
          value={intelligence.pmCompliance.completedOnTime}
          description="Completed on or before scheduled date"
        />
        <MetricCard
          title="PM Late"
          value={intelligence.pmCompliance.completedLate}
          description="Completed after scheduled date"
        />
        <MetricCard
          title="PM Missed"
          value={intelligence.pmCompliance.missed}
          description="Past due without completion"
        />
        <MetricCard
          title="PM Compliance"
          value={formatPercent(intelligence.pmCompliance.compliancePercentage)}
          description="On-time completions / due PM runs"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming PM Tasks</CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {intelligence.pmCompliance.upcomingTasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No upcoming PM tasks.</p>
            ) : (
              <ul className="space-y-2">
                {intelligence.pmCompliance.upcomingTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">{task.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{task.asset_name ?? "No linked asset"}</p>
                    </div>
                    <span className="text-xs text-[var(--muted)]">{task.next_run_date ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue PM Tasks</CardTitle>
            <CardDescription>Active PM plans currently overdue</CardDescription>
          </CardHeader>
          <CardContent>
            {intelligence.pmCompliance.overdueTasks.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No overdue PM tasks.</p>
            ) : (
              <ul className="space-y-2">
                {intelligence.pmCompliance.overdueTasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-red-200/70 bg-red-50/40 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">{task.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{task.asset_name ?? "No linked asset"}</p>
                    </div>
                    <span className="text-xs font-medium text-red-700">{task.next_run_date ?? "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Reporting Engine</h2>
          <p className="text-sm text-[var(--muted)]">Export each report as CSV or PDF.</p>
        </div>
        <div className="grid gap-4">
          {REPORT_TYPES.map((reportType) => {
            const dataset = getReportDataset(intelligence, reportType);
            return (
              <Card key={reportType}>
                <CardHeader className="flex flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle>{dataset.title}</CardTitle>
                    <CardDescription>
                      {dataset.rows.length} row{dataset.rows.length === 1 ? "" : "s"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/api/reports/export?type=${reportType}&format=csv`}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]/70"
                    >
                      Export CSV
                    </a>
                    <a
                      href={`/api/reports/export?type=${reportType}&format=pdf`}
                      className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--background)]/70"
                    >
                      Export PDF
                    </a>
                  </div>
                </CardHeader>
                <CardContent>
                  <DataTable>
                    <Table>
                      <TableHead>
                        {dataset.columns.map((column) => (
                          <Th key={column.key}>{column.label}</Th>
                        ))}
                      </TableHead>
                      <TBody>
                        {dataset.rows.slice(0, 10).map((row, index) => (
                          <Tr key={`${reportType}-${index}`}>
                            {dataset.columns.map((column) => (
                              <Td key={`${reportType}-${index}-${column.key}`}>
                                {row[column.key] == null ? "—" : String(row[column.key])}
                              </Td>
                            ))}
                          </Tr>
                        ))}
                        {dataset.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={dataset.columns.length}
                              className="px-4 py-3 text-center text-sm text-[var(--muted)]"
                            >
                              No records for selected period.
                            </td>
                          </tr>
                        ) : null}
                      </TBody>
                    </Table>
                  </DataTable>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Property Intelligence</h2>
          <p className="text-sm text-[var(--muted)]">
            Maintenance cost trends, work-order volume, and repair-frequency insights.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <BarSeries
            title="Maintenance Cost per Property"
            subtitle="Top properties by maintenance spend"
            rows={intelligence.propertyIntelligence.maintenanceCostPerProperty.map((row) => ({
              label: row.property_name,
              value: row.total_cost,
            }))}
            formatter={formatCurrency}
          />
          <BarSeries
            title="Maintenance Cost per Building"
            subtitle="Top buildings by maintenance spend"
            rows={intelligence.propertyIntelligence.maintenanceCostPerBuilding.map((row) => ({
              label: row.building_name,
              value: row.total_cost,
            }))}
            formatter={formatCurrency}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <BarSeries
            title="Work Order Volume by Property"
            subtitle="Properties with highest work-order volume"
            rows={intelligence.propertyIntelligence.workOrderVolumeByProperty.map((row) => ({
              label: row.property_name,
              value: row.work_order_count,
            }))}
          />
          <BarSeries
            title="Most Expensive Assets"
            subtitle="Assets with highest maintenance spend"
            rows={intelligence.propertyIntelligence.mostExpensiveAssets.map((row) => ({
              label: row.asset_name,
              value: row.total_cost,
            }))}
            formatter={formatCurrency}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <BarSeries
            title="Cost Trends"
            subtitle="Monthly maintenance cost trend"
            rows={intelligence.propertyIntelligence.costTrends.map((row) => ({
              label: row.month,
              value: row.total_cost,
            }))}
            formatter={formatCurrency}
          />
          <BarSeries
            title="Repair Frequency"
            subtitle="Monthly repair/emergency work-order frequency"
            rows={intelligence.propertyIntelligence.repairFrequency.map((row) => ({
              label: row.month,
              value: row.repair_count,
            }))}
          />
        </div>
      </section>
    </div>
  );
}
