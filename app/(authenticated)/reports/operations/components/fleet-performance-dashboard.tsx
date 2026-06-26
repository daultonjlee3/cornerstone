"use client";

import Link from "next/link";
import {
  BarChart3,
  DollarSign,
  Percent,
  Route,
  TrendingUp,
  Users,
  Truck,
  Building2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { MetricCard } from "@/src/components/ui/metric-card";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import type { FleetPerformanceDashboardData } from "@/src/types/fleet";
import { FleetUtilizationFilters } from "./fleet-utilization-filters";
import { FleetPerformanceCopilotBridge } from "./FleetPerformanceCopilotBridge";

type FleetPerformanceDashboardProps = {
  data: FleetPerformanceDashboardData;
  branches: Array<{ id: string; name: string }>;
  trucks: Array<{ id: string; unit_number: string }>;
  branchId?: string | null;
  truckId?: string | null;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number | null): string {
  return value != null ? `${value.toFixed(1)}%` : "—";
}

function RankingBadge({ rank }: { rank: number }) {
  const tone =
    rank === 1 ? "bg-emerald-500/15 text-emerald-800" : rank <= 3 ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "bg-[var(--muted)]/15 text-[var(--muted)]";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone}`}>#{rank}</span>;
}

export function FleetPerformanceDashboard({
  data,
  branches,
  trucks,
  branchId,
  truckId,
}: FleetPerformanceDashboardProps) {
  const { summary, rankings, costAnalysis, recommendationRoi } = data;

  return (
    <div className="space-y-6" data-testid="fleet-performance-dashboard">
      <FleetPerformanceCopilotBridge data={data} branchId={branchId} truckId={truckId} />
      <FleetUtilizationFilters
        from={data.from}
        to={data.to}
        branchId={branchId}
        truckId={truckId}
        branches={branches}
        trucks={trucks}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          description={`${data.from} to ${data.to}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Total Contribution"
          value={formatCurrency(summary.totalContribution)}
          description={`Margin ${formatPct(summary.marginPct)}`}
          icon={TrendingUp}
          variant={summary.totalContribution >= 0 ? "success" : "danger"}
        />
        <MetricCard
          title="Contribution / Hour"
          value={summary.contributionPerHour != null ? formatCurrency(summary.contributionPerHour) : "—"}
          description="Operational billable hours"
          icon={BarChart3}
        />
        <MetricCard
          title="Avg Utilization"
          value={formatPct(summary.avgUtilizationPercent)}
          description="Billable / total hours"
          icon={Percent}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Operational Cost Breakdown</CardTitle>
            <CardDescription>Variable costs from utilization mart — not accounting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              { label: "Labor", value: costAnalysis.labor },
              { label: "Fuel", value: costAnalysis.fuel },
              { label: "Deadhead", value: costAnalysis.deadhead },
              { label: "Idle", value: costAnalysis.idle },
              { label: "Overtime", value: costAnalysis.overtime },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <span className="text-[var(--muted)]">{row.label}</span>
                <span className="font-semibold">{formatCurrency(row.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Branch Rankings</CardTitle>
            <CardDescription>Contribution leaders and improvement targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {rankings.bestBranch ? (
              <div className="rounded-lg border border-emerald-300/40 bg-emerald-500/5 px-3 py-2">
                <p className="text-[10px] uppercase text-emerald-700">Best branch</p>
                <p className="font-semibold">{rankings.bestBranch.branch_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatCurrency(rankings.bestBranch.contribution)} contribution
                </p>
              </div>
            ) : null}
            {rankings.worstBranch && rankings.worstBranch.branch_id !== rankings.bestBranch?.branch_id ? (
              <div className="rounded-lg border border-amber-300/40 bg-amber-500/5 px-3 py-2">
                <p className="text-[10px] uppercase text-amber-800">Lowest contribution</p>
                <p className="font-semibold">{rankings.worstBranch.branch_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {formatCurrency(rankings.worstBranch.contribution)} · risk{" "}
                  {formatCurrency(rankings.worstBranch.operational_risk)}
                </p>
              </div>
            ) : null}
            {rankings.biggestImprovementOpportunity ? (
              <div className="rounded-lg border border-[var(--card-border)] px-3 py-2">
                <p className="text-[10px] uppercase text-[var(--muted)]">Biggest improvement opportunity</p>
                <p className="font-semibold">{rankings.biggestImprovementOpportunity.branch_name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {rankings.biggestImprovementOpportunity.recommendation_opportunity} pending recommendations
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="size-4" /> Recommendation ROI
            </CardTitle>
            <CardDescription>Value from accepted dispatch recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Acceptance rate</span>
              <span className="font-semibold">{formatPct(recommendationRoi.acceptanceRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Revenue protected</span>
              <span className="font-semibold">{formatCurrency(recommendationRoi.revenueProtected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Contribution improvement</span>
              <span className="font-semibold">{formatCurrency(recommendationRoi.contributionImprovement)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Labor saved</span>
              <span className="font-semibold">{formatCurrency(recommendationRoi.laborSaved)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Deadhead reduced</span>
              <span className="font-semibold">{recommendationRoi.deadheadReduction.toFixed(1)} mi</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Travel time saved</span>
              <span className="font-semibold">{recommendationRoi.travelTimeSavedMinutes.toFixed(0)} min</span>
            </div>
            <div className="flex justify-between text-[var(--muted)]">
              <span>Applied / failed</span>
              <span>
                {recommendationRoi.applied} / {recommendationRoi.failed}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" /> Branch Operational P&amp;L
            </CardTitle>
            <CardDescription>Revenue, contribution, and cost by branch</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable>
              <Table>
                <TableHead>
                  <Th>Branch</Th>
                  <Th>Revenue</Th>
                  <Th>Contribution</Th>
                  <Th>Margin</Th>
                  <Th>Util</Th>
                </TableHead>
                <TBody>
                  {data.branches.length === 0 ? (
                    <Tr>
                      <Td className="text-[var(--muted)]" >
                        No mart data — run mart refresh after ingest.
                      </Td>
                      <Td>—</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                    </Tr>
                  ) : (
                    data.branches.map((b) => (
                      <Tr key={b.branch_id}>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <RankingBadge rank={b.rank} />
                            {b.branch_name}
                          </span>
                        </Td>
                        <Td>{formatCurrency(b.revenue)}</Td>
                        <Td>{formatCurrency(b.contribution)}</Td>
                        <Td>{formatPct(b.margin_pct)}</Td>
                        <Td>{formatPct(b.utilization_percent)}</Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </DataTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="size-4" /> Truck Profit Centers
            </CardTitle>
            <CardDescription>Highest contribution trucks in period</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable>
              <Table>
                <TableHead>
                  <Th>Truck</Th>
                  <Th>Branch</Th>
                  <Th>Contribution</Th>
                  <Th>$/hr</Th>
                </TableHead>
                <TBody>
                  {rankings.topTrucks.length === 0 ? (
                    <Tr>
                      <Td className="text-[var(--muted)]">No truck data.</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                    </Tr>
                  ) : (
                    rankings.topTrucks.map((t) => (
                      <Tr key={t.truck_id}>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <RankingBadge rank={t.rank} />
                            {t.unit_number}
                          </span>
                        </Td>
                        <Td>{t.branch_name}</Td>
                        <Td>{formatCurrency(t.contribution)}</Td>
                        <Td>
                          {t.contribution_per_hour != null ? formatCurrency(t.contribution_per_hour) : "—"}
                        </Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </DataTable>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" /> Operator Contribution
            </CardTitle>
            <CardDescription>Operational labor productivity — not payroll</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable>
              <Table>
                <TableHead>
                  <Th>Operator</Th>
                  <Th>Revenue</Th>
                  <Th>Contribution</Th>
                  <Th>OT hrs</Th>
                </TableHead>
                <TBody>
                  {rankings.topOperators.length === 0 ? (
                    <Tr>
                      <Td className="text-[var(--muted)]">No operator attribution yet.</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                    </Tr>
                  ) : (
                    rankings.topOperators.map((o) => (
                      <Tr key={o.operator_id}>
                        <Td>
                          <span className="inline-flex items-center gap-2">
                            <RankingBadge rank={o.rank} />
                            {o.operator_name}
                          </span>
                        </Td>
                        <Td>{formatCurrency(o.revenue_generated)}</Td>
                        <Td>{formatCurrency(o.contribution_generated)}</Td>
                        <Td>{o.overtime_hours.toFixed(1)}</Td>
                      </Tr>
                    ))
                  )}
                </TBody>
              </Table>
            </DataTable>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contribution Trend</CardTitle>
            <CardDescription>Daily revenue and contribution from mart</CardDescription>
          </CardHeader>
          <CardContent>
            {data.contributionTrend.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No trend data for selected range.</p>
            ) : (
              <ul className="space-y-2">
                {data.contributionTrend.slice(-8).map((day) => (
                  <li
                    key={day.date}
                    className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm"
                  >
                    <span className="text-[var(--muted)]">{day.date}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{
                          width: `${Math.max(
                            4,
                            (Math.abs(day.contribution) /
                              Math.max(...data.contributionTrend.map((d) => Math.abs(d.contribution)), 1)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold">{formatCurrency(day.contribution)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Route className="size-4" /> Daily Detail
          </CardTitle>
          <CardDescription>Truck-day profitability from utilization mart</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable>
            <Table>
              <TableHead>
                <Th>Date</Th>
                <Th>Truck</Th>
                <Th>Branch</Th>
                <Th>Revenue</Th>
                <Th>Contribution</Th>
                <Th>Margin</Th>
                <Th>Deadhead</Th>
                <Th>Idle</Th>
              </TableHead>
              <TBody>
                {data.utilizationRows.slice(0, 50).map((row) => (
                  <Tr key={`${row.truck_id}-${row.date}`}>
                    <Td>{row.date}</Td>
                    <Td>{row.unit_number}</Td>
                    <Td>{row.branch_name}</Td>
                    <Td>{formatCurrency(row.revenue)}</Td>
                    <Td>{row.contribution != null ? formatCurrency(row.contribution) : "—"}</Td>
                    <Td>{formatPct(row.margin_pct ?? null)}</Td>
                    <Td>{row.deadhead_cost != null ? formatCurrency(row.deadhead_cost) : "—"}</Td>
                    <Td>{row.idle_cost != null ? formatCurrency(row.idle_cost) : "—"}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </DataTable>
          {data.utilizationRows.length > 50 ? (
            <p className="mt-2 text-xs text-[var(--muted)]">
              Showing 50 of {data.utilizationRows.length} rows.{" "}
              <Link href="/dispatch" className="text-[var(--accent)] hover:underline">
                Refine via dispatch filters
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {costAnalysis.revenueLeakage > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-500/5 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-amber-700" />
          <span>
            Estimated revenue leakage from unassigned work opportunities:{" "}
            <strong>{formatCurrency(costAnalysis.revenueLeakage)}</strong>
          </span>
          <Link href="/dispatch" className="ml-auto text-[var(--accent)] hover:underline">
            Open dispatch →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
