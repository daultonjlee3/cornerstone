import type { SupabaseClient } from "@supabase/supabase-js";
import type { FleetUtilizationReportData, FleetUtilizationReportRow } from "@/src/types/fleet";

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 13);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export async function loadFleetUtilizationReport(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { from?: string; to?: string; branchId?: string | null; truckId?: string | null }
): Promise<FleetUtilizationReportData> {
  const defaults = defaultDateRange();
  const from = options?.from ?? defaults.from;
  const to = options?.to ?? defaults.to;

  let query = supabase
    .from("utilization_daily")
    .select(
      "truck_id, branch_id, date, billable_hours, idle_hours, total_hours, miles, revenue, deadhead_miles, trucks(unit_number), branches(name)"
    )
    .eq("tenant_id", tenantId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  if (options?.branchId) query = query.eq("branch_id", options.branchId);
  if (options?.truckId) query = query.eq("truck_id", options.truckId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows: FleetUtilizationReportRow[] = (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const trucks = r.trucks;
    const branches = r.branches;
    const truckObj = (Array.isArray(trucks) ? trucks[0] : trucks) as { unit_number: string } | null;
    const branchObj = (Array.isArray(branches) ? branches[0] : branches) as { name: string } | null;
    const totalHours = Number(r.total_hours);
    const billable = Number(r.billable_hours);
    return {
      truck_id: r.truck_id as string,
      unit_number: truckObj?.unit_number ?? "—",
      branch_name: branchObj?.name ?? "—",
      date: r.date as string,
      billable_hours: billable,
      idle_hours: Number(r.idle_hours),
      total_hours: totalHours,
      miles: Number(r.miles),
      revenue: Number(r.revenue),
      deadhead_miles: Number(r.deadhead_miles),
      utilization_percent:
        totalHours > 0 ? Math.round((billable / totalHours) * 10000) / 100 : null,
    };
  });

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalDeadheadMiles = rows.reduce((sum, r) => sum + r.deadhead_miles, 0);
  const utilRows = rows.filter((r) => r.utilization_percent != null);
  const avgUtilizationPercent =
    utilRows.length > 0
      ? Math.round(
          (utilRows.reduce((sum, r) => sum + (r.utilization_percent ?? 0), 0) / utilRows.length) *
            100
        ) / 100
      : null;

  const weekBuckets = new Map<string, { billable: number; total: number; revenue: number }>();
  for (const row of rows) {
    const weekStart = getWeekStart(row.date);
    const bucket = weekBuckets.get(weekStart) ?? { billable: 0, total: 0, revenue: 0 };
    bucket.billable += row.billable_hours;
    bucket.total += row.total_hours;
    bucket.revenue += row.revenue;
    weekBuckets.set(weekStart, bucket);
  }

  const weekOverWeek = [...weekBuckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, bucket]) => ({
      label,
      utilization_percent:
        bucket.total > 0 ? Math.round((bucket.billable / bucket.total) * 10000) / 100 : 0,
      revenue: Math.round(bucket.revenue * 100) / 100,
    }));

  return {
    from,
    to,
    rows,
    weekOverWeek,
    summary: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgUtilizationPercent,
      totalDeadheadMiles: Math.round(totalDeadheadMiles * 100) / 100,
    },
  };
}

function getWeekStart(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function utilizationReportToCsvRows(
  data: FleetUtilizationReportData
): { columns: { key: string; label: string }[]; rows: Record<string, string | number | null>[] } {
  const columns = [
    { key: "date", label: "Date" },
    { key: "unit_number", label: "Truck" },
    { key: "branch_name", label: "Branch" },
    { key: "billable_hours", label: "Billable Hours" },
    { key: "idle_hours", label: "Idle Hours" },
    { key: "total_hours", label: "Total Hours" },
    { key: "utilization_percent", label: "Utilization %" },
    { key: "miles", label: "Miles" },
    { key: "revenue", label: "Revenue" },
    { key: "deadhead_miles", label: "Deadhead Miles (estimated)" },
  ];

  const rows = data.rows.map((row) => ({
    date: row.date,
    unit_number: row.unit_number,
    branch_name: row.branch_name,
    billable_hours: row.billable_hours,
    idle_hours: row.idle_hours,
    total_hours: row.total_hours,
    utilization_percent: row.utilization_percent,
    miles: row.miles,
    revenue: row.revenue,
    deadhead_miles: row.deadhead_miles,
  }));

  return { columns, rows };
}
