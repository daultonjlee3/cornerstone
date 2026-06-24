import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { MetricCard } from "@/src/components/ui/metric-card";
import { DataTable, Table, TableHead, Th, TBody, Tr, Td } from "@/src/components/ui/data-table";
import { DollarSign, Percent, Route } from "lucide-react";
import type { FleetUtilizationReportData } from "@/src/types/fleet";
import { FleetUtilizationFilters } from "./fleet-utilization-filters";

type FleetUtilizationReportProps = {
  data: FleetUtilizationReportData;
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

export function FleetUtilizationReport({
  data,
  branches,
  trucks,
  branchId,
  truckId,
}: FleetUtilizationReportProps) {
  return (
    <div className="space-y-6" data-testid="fleet-utilization-report">
      <FleetUtilizationFilters
        from={data.from}
        to={data.to}
        branchId={branchId}
        truckId={truckId}
        branches={branches}
        trucks={trucks}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(data.summary.totalRevenue)}
          description={`${data.from} to ${data.to}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Utilization"
          value={
            data.summary.avgUtilizationPercent != null
              ? `${data.summary.avgUtilizationPercent.toFixed(1)}%`
              : "—"
          }
          description="Billable / total hours across trucks"
          icon={Percent}
        />
        <MetricCard
          title="Deadhead (estimated)"
          value={`${data.summary.totalDeadheadMiles.toFixed(1)} mi`}
          description="Heuristic sum from mart — not GPS routing"
          icon={Route}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Week-over-Week Trend</CardTitle>
          <CardDescription>Utilization % and revenue by week (mart aggregates)</CardDescription>
        </CardHeader>
        <CardContent>
          {data.weekOverWeek.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No utilization history for selected range.</p>
          ) : (
            <ul className="space-y-2">
              {data.weekOverWeek.map((week) => (
                <li
                  key={week.label}
                  className="grid grid-cols-[8rem_minmax(0,1fr)_6rem_6rem] items-center gap-3 text-sm"
                >
                  <span className="font-medium text-[var(--foreground)]">Wk {week.label}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--background)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${Math.min(100, Math.max(4, week.utilization_percent))}%` }}
                    />
                  </div>
                  <span className="text-right text-[var(--muted)]">{week.utilization_percent.toFixed(1)}%</span>
                  <span className="text-right font-medium">{formatCurrency(week.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Truck × Day Utilization</CardTitle>
          <CardDescription>
            {data.rows.length} row{data.rows.length === 1 ? "" : "s"} — deadhead miles are estimated (Haversine)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable>
            <Table>
              <TableHead>
                <Th>Date</Th>
                <Th>Truck</Th>
                <Th>Branch</Th>
                <Th>Billable h</Th>
                <Th>Idle h</Th>
                <Th>Util %</Th>
                <Th>Revenue</Th>
                <Th>Deadhead mi (est.)</Th>
              </TableHead>
              <TBody>
                {data.rows.slice(0, 100).map((row) => (
                  <Tr key={`${row.truck_id}-${row.date}`}>
                    <Td>{row.date}</Td>
                    <Td>{row.unit_number}</Td>
                    <Td>{row.branch_name}</Td>
                    <Td>{row.billable_hours.toFixed(1)}</Td>
                    <Td>{row.idle_hours.toFixed(1)}</Td>
                    <Td>
                      {row.utilization_percent != null
                        ? `${row.utilization_percent.toFixed(1)}%`
                        : "—"}
                    </Td>
                    <Td>{formatCurrency(row.revenue)}</Td>
                    <Td>{row.deadhead_miles.toFixed(1)}</Td>
                  </Tr>
                ))}
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                      No utilization data. Run mart refresh after telematics and job backfill.
                    </td>
                  </tr>
                ) : null}
              </TBody>
            </Table>
          </DataTable>
        </CardContent>
      </Card>
    </div>
  );
}
