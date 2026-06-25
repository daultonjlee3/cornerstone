import type { SupabaseClient } from "@supabase/supabase-js";

export type BaselineMetricKey =
  | "revenue_per_truck"
  | "jobs_per_truck"
  | "utilization"
  | "deadhead"
  | "average_drive_time"
  | "contribution"
  | "revenue_per_hour"
  | "branch_utilization"
  | "operator_utilization";

export type BaselineMetric = {
  key: BaselineMetricKey;
  label: string;
  value: number;
  unit: "currency" | "ratio" | "hours" | "miles" | "count";
  estimated: boolean;
};

export type BaselineSnapshot = {
  windowDays: number;
  fromDate: string;
  toDate: string;
  metrics: BaselineMetric[];
};

export async function loadBaselineSnapshot(
  supabase: SupabaseClient,
  tenantId: string,
  windowDays = 90
): Promise<BaselineSnapshot> {
  const normalizedWindow = [30, 60, 90, 180, 365].includes(windowDays) ? windowDays : 90;
  const toDate = new Date();
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - normalizedWindow + 1);
  const fromDateIso = fromDate.toISOString().slice(0, 10);
  const toDateIso = toDate.toISOString().slice(0, 10);

  const [utilRows, jobsCount, trucksCount, branchRows, operatorsCount] = await Promise.all([
    fetchUtilizationRows(supabase, tenantId, fromDateIso, toDateIso),
    fetchJobsCount(supabase, tenantId, fromDateIso, toDateIso),
    fetchTrucksCount(supabase, tenantId),
    fetchBranchCapacityRows(supabase, tenantId, fromDateIso, toDateIso),
    fetchOperatorsCount(supabase, tenantId),
  ]);

  const totals = utilRows.reduce(
    (acc, row) => {
      acc.revenue += row.revenue;
      acc.billableHours += row.billable_hours;
      acc.totalHours += row.total_hours;
      acc.deadheadMiles += row.deadhead_miles;
      acc.contribution += row.contribution;
      return acc;
    },
    {
      revenue: 0,
      billableHours: 0,
      totalHours: 0,
      deadheadMiles: 0,
      contribution: 0,
    }
  );

  const branchUtilization = computeBranchUtilization(branchRows);
  const operatorUtilization =
    operatorsCount > 0 ? totals.billableHours / (operatorsCount * normalizedWindow * 10) : 0;
  const avgDriveTime = totals.totalHours > 0 ? totals.totalHours / Math.max(1, jobsCount) : 0;

  const metrics: BaselineMetric[] = [
    {
      key: "revenue_per_truck",
      label: "Revenue per Truck",
      value: trucksCount > 0 ? totals.revenue / trucksCount : 0,
      unit: "currency",
      estimated: false,
    },
    {
      key: "jobs_per_truck",
      label: "Jobs per Truck",
      value: trucksCount > 0 ? jobsCount / trucksCount : 0,
      unit: "count",
      estimated: false,
    },
    {
      key: "utilization",
      label: "Utilization",
      value: totals.totalHours > 0 ? totals.billableHours / totals.totalHours : 0,
      unit: "ratio",
      estimated: true,
    },
    {
      key: "deadhead",
      label: "Deadhead",
      value: totals.deadheadMiles,
      unit: "miles",
      estimated: true,
    },
    {
      key: "average_drive_time",
      label: "Average Drive Time",
      value: avgDriveTime,
      unit: "hours",
      estimated: true,
    },
    {
      key: "contribution",
      label: "Contribution",
      value: totals.contribution,
      unit: "currency",
      estimated: true,
    },
    {
      key: "revenue_per_hour",
      label: "Revenue per Hour",
      value: totals.billableHours > 0 ? totals.revenue / totals.billableHours : 0,
      unit: "currency",
      estimated: true,
    },
    {
      key: "branch_utilization",
      label: "Branch Utilization",
      value: branchUtilization,
      unit: "ratio",
      estimated: true,
    },
    {
      key: "operator_utilization",
      label: "Operator Utilization",
      value: operatorUtilization,
      unit: "ratio",
      estimated: true,
    },
  ];

  return {
    windowDays: normalizedWindow,
    fromDate: fromDateIso,
    toDate: toDateIso,
    metrics: metrics.map((metric) => ({
      ...metric,
      value: Number(metric.value.toFixed(4)),
    })),
  };
}

async function fetchUtilizationRows(
  supabase: SupabaseClient,
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<
  Array<{
    revenue: number;
    billable_hours: number;
    total_hours: number;
    deadhead_miles: number;
    contribution: number;
  }>
> {
  const { data, error } = await supabase
    .from("utilization_daily")
    .select("revenue, billable_hours, total_hours, deadhead_miles, contribution")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    revenue: Number(row.revenue ?? 0),
    billable_hours: Number(row.billable_hours ?? 0),
    total_hours: Number(row.total_hours ?? 0),
    deadhead_miles: Number(row.deadhead_miles ?? 0),
    contribution: Number(row.contribution ?? 0),
  }));
}

async function fetchJobsCount(
  supabase: SupabaseClient,
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .gte("scheduled_start", `${fromDate}T00:00:00.000Z`)
    .lte("scheduled_start", `${toDate}T23:59:59.999Z`);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchTrucksCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("trucks")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .neq("status", "retired");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function fetchBranchCapacityRows(
  supabase: SupabaseClient,
  tenantId: string,
  fromDate: string,
  toDate: string
): Promise<
  Array<{
    available_truck_hours: number;
    committed_hours: number;
  }>
> {
  const { data, error } = await supabase
    .from("branch_capacity_snapshots")
    .select("available_truck_hours, committed_hours")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate)
    .lte("date", toDate);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    available_truck_hours: Number(row.available_truck_hours ?? 0),
    committed_hours: Number(row.committed_hours ?? 0),
  }));
}

async function fetchOperatorsCount(supabase: SupabaseClient, tenantId: string): Promise<number> {
  const { count, error } = await supabase
    .from("fleet_operators")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

function computeBranchUtilization(
  rows: Array<{ available_truck_hours: number; committed_hours: number }>
): number {
  const totals = rows.reduce(
    (acc, row) => {
      acc.available += row.available_truck_hours;
      acc.committed += row.committed_hours;
      return acc;
    },
    { available: 0, committed: 0 }
  );
  if (totals.available <= 0) return 0;
  return totals.committed / totals.available;
}
