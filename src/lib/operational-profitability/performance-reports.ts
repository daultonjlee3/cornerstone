import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FleetBranchPerformanceRow,
  FleetOperatorPerformanceRow,
  FleetPerformanceDashboardData,
  FleetRecommendationRoiSummary,
  FleetTruckPerformanceRow,
} from "@/src/types/fleet";

type MartRow = {
  truck_id: string;
  branch_id: string;
  date: string;
  billable_hours: number;
  idle_hours: number;
  total_hours: number;
  committed_hours: number;
  revenue: number;
  deadhead_miles: number;
  labor_cost: number;
  fuel_cost: number;
  deadhead_cost: number;
  idle_cost: number;
  variable_cost: number;
  contribution: number;
  margin_pct: number | null;
  overtime_cost: number;
  trucks: { unit_number: string; truck_type: string; capacity: Record<string, unknown>; notes: string | null } | { unit_number: string; truck_type: string; capacity: Record<string, unknown>; notes: string | null }[] | null;
  branches: { name: string } | { name: string }[] | null;
};

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 13);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function relOne<T>(value: T | T[] | null): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pct(n: number, d: number): number | null {
  return d > 0 ? round2((n / d) * 100) : null;
}

function rankRows<T extends { contribution?: number; contribution_generated?: number }>(
  rows: T[]
): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => {
    const aVal = a.contribution ?? a.contribution_generated ?? 0;
    const bVal = b.contribution ?? b.contribution_generated ?? 0;
    return bVal - aVal;
  });
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function loadRecommendationRoiSummary(
  supabase: SupabaseClient,
  tenantId: string,
  from: string,
  to: string
): Promise<FleetRecommendationRoiSummary> {
  const { data, error } = await supabase
    .from("recommendation_outcomes")
    .select(
      "action, acted_at, estimated_impact, recommendation_instances!inner(tenant_id, branch_id, recommendation_type, status)"
    )
    .eq("recommendation_instances.tenant_id", tenantId)
    .gte("acted_at", `${from}T00:00:00.000Z`)
    .lte("acted_at", `${to}T23:59:59.999Z`);

  if (error) throw new Error(error.message);

  let accepted = 0;
  let dismissed = 0;
  let applied = 0;
  let failed = 0;
  let revenueProtected = 0;
  let contributionImprovement = 0;
  let laborSaved = 0;
  let fuelSaved = 0;
  let deadheadReduction = 0;
  let overtimeAvoided = 0;
  let travelTimeSavedMinutes = 0;
  const branchAccepted = new Map<string, number>();
  const branchTotal = new Map<string, number>();
  const branchValue = new Map<string, { value: number; count: number }>();
  const typeValue = new Map<string, { value: number; count: number }>();
  const truckValue = new Map<string, { unit_number: string; value: number; count: number }>();

  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const action = r.action as string;
    if (action === "accepted") accepted += 1;
    else if (action === "dismissed") dismissed += 1;
    else if (action === "applied") applied += 1;
    else if (action === "failed") failed += 1;

    const inst = relOne(
      r.recommendation_instances as
        | { branch_id: string | null; recommendation_type?: string }
        | { branch_id: string | null; recommendation_type?: string }[]
    );
    const branchId = inst?.branch_id ?? "unknown";
    if (action === "accepted" || action === "applied") {
      branchTotal.set(branchId, (branchTotal.get(branchId) ?? 0) + 1);
      if (action === "accepted") {
        branchAccepted.set(branchId, (branchAccepted.get(branchId) ?? 0) + 1);
      }
    }

    const impact = (r.estimated_impact as Record<string, unknown>) ?? {};
    const financial = (impact.financial_estimate as Record<string, unknown> | undefined) ?? {};
    const record = impact.decision_record as Record<string, unknown> | undefined;
    const projected = (record?.projected_outcome as Record<string, unknown> | undefined) ?? impact;

    if (action === "accepted" || action === "applied") {
      const contribution = Number(
        financial.contribution_improvement ??
          projected.contributionImprovement ??
          projected.contribution_improvement ??
          0
      );
      revenueProtected += Number(
        financial.revenue_protected ?? projected.revenueProtected ?? projected.revenue_protected ?? 0
      );
      contributionImprovement += contribution;
      laborSaved += Number(financial.labor_saved ?? projected.laborSaved ?? projected.labor_saved ?? 0);
      fuelSaved += Number(financial.fuel_saved ?? projected.fuelSaved ?? projected.fuel_saved ?? 0);
      deadheadReduction += Number(
        financial.deadhead_reduction_miles ??
          projected.travelReducedMiles ??
          projected.deadhead_reduction ??
          0
      );
      overtimeAvoided += Number(
        financial.overtime_avoided ?? projected.overtimeAvoided ?? projected.overtime_avoided ?? 0
      );
      travelTimeSavedMinutes += Number(
        financial.travel_reduction_minutes ??
          projected.arrivalImprovedMinutes ??
          0
      );

      const b = branchValue.get(branchId) ?? { value: 0, count: 0 };
      b.value += contribution;
      b.count += 1;
      branchValue.set(branchId, b);

      const recType = (inst as { recommendation_type?: string })?.recommendation_type ?? "unknown";
      const t = typeValue.get(recType) ?? { value: 0, count: 0 };
      t.value += contribution;
      t.count += 1;
      typeValue.set(recType, t);

      const truckId = (impact.recommended_truck_id as string | undefined) ?? null;
      if (truckId) {
        const truck = truckValue.get(truckId) ?? {
          unit_number: truckId.slice(0, 8),
          value: 0,
          count: 0,
        };
        truck.value += contribution;
        truck.count += 1;
        truckValue.set(truckId, truck);
      }
    }
  }

  const total = accepted + dismissed;
  return {
    accepted,
    dismissed,
    applied,
    failed,
    acceptanceRate: total > 0 ? round2((accepted / total) * 100) : null,
    revenueProtected: round2(revenueProtected),
    contributionImprovement: round2(contributionImprovement),
    laborSaved: round2(laborSaved),
    fuelSaved: round2(fuelSaved),
    deadheadReduction: round2(deadheadReduction),
    overtimeAvoided: round2(overtimeAvoided),
    travelTimeSavedMinutes: round2(travelTimeSavedMinutes),
    branchAcceptanceRates: [...branchTotal.entries()].map(([branchId, count]) => ({
      branch_id: branchId,
      acceptance_rate: pct(branchAccepted.get(branchId) ?? 0, count),
    })),
    topTypesByValue: [...typeValue.entries()]
      .map(([type, v]) => ({ type, value: round2(v.value), count: v.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    topBranchesByValue: [...branchValue.entries()]
      .map(([branch_id, v]) => ({ branch_id, value: round2(v.value), count: v.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
    topTrucksByImpact: [...truckValue.entries()]
      .map(([truck_id, v]) => ({
        truck_id,
        unit_number: v.unit_number,
        value: round2(v.value),
        count: v.count,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
  };
}

async function loadMartRows(
  supabase: SupabaseClient,
  tenantId: string,
  from: string,
  to: string,
  branchId?: string | null,
  truckId?: string | null
): Promise<MartRow[]> {
  let query = supabase
    .from("utilization_daily")
    .select(
      "truck_id, branch_id, date, billable_hours, idle_hours, total_hours, committed_hours, revenue, deadhead_miles, labor_cost, fuel_cost, deadhead_cost, idle_cost, variable_cost, contribution, margin_pct, overtime_cost, trucks(unit_number, truck_type, capacity, notes), branches(name)"
    )
    .eq("tenant_id", tenantId)
    .gte("date", from)
    .lte("date", to);

  if (branchId) query = query.eq("branch_id", branchId);
  if (truckId) query = query.eq("truck_id", truckId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as MartRow[];
}

async function loadJobsCompletedByBranch(
  supabase: SupabaseClient,
  tenantId: string,
  from: string,
  to: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("fleet_jobs")
    .select("branch_id")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .gte("scheduled_start", `${from}T00:00:00.000Z`)
    .lte("scheduled_start", `${to}T23:59:59.999Z`);

  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = (row as { branch_id: string }).branch_id;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

async function loadPendingRecsByBranch(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("recommendation_instances")
    .select("branch_id")
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = (row as { branch_id: string | null }).branch_id ?? "unknown";
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

function buildBranchRows(
  martRows: MartRow[],
  jobsByBranch: Map<string, number>,
  pendingByBranch: Map<string, number>
): FleetBranchPerformanceRow[] {
  const byBranch = new Map<string, FleetBranchPerformanceRow>();

  for (const row of martRows) {
    const branch = relOne(row.branches);
    const existing = byBranch.get(row.branch_id) ?? {
      branch_id: row.branch_id,
      branch_name: branch?.name ?? "—",
      revenue: 0,
      contribution: 0,
      margin_pct: null,
      labor_cost: 0,
      fuel_cost: 0,
      deadhead_cost: 0,
      idle_cost: 0,
      overtime_cost: 0,
      variable_cost: 0,
      billable_hours: 0,
      total_hours: 0,
      truck_count: 0,
      revenue_per_truck: null,
      contribution_per_truck: null,
      contribution_per_hour: null,
      utilization_percent: null,
      jobs_completed: jobsByBranch.get(row.branch_id) ?? 0,
      recommendation_opportunity: pendingByBranch.get(row.branch_id) ?? 0,
      operational_risk: 0,
      rank: 0,
    };

    existing.revenue += Number(row.revenue);
    existing.contribution += Number(row.contribution);
    existing.labor_cost += Number(row.labor_cost);
    existing.fuel_cost += Number(row.fuel_cost);
    existing.deadhead_cost += Number(row.deadhead_cost);
    existing.idle_cost += Number(row.idle_cost);
    existing.overtime_cost += Number(row.overtime_cost);
    existing.variable_cost += Number(row.variable_cost);
    existing.billable_hours += Number(row.billable_hours);
    existing.total_hours += Number(row.total_hours);
    byBranch.set(row.branch_id, existing);
  }

  const truckSets = new Map<string, Set<string>>();
  for (const row of martRows) {
    const set = truckSets.get(row.branch_id) ?? new Set<string>();
    set.add(row.truck_id);
    truckSets.set(row.branch_id, set);
  }

  const rows = [...byBranch.values()].map((b) => {
    const trucks = truckSets.get(b.branch_id)?.size ?? 0;
    b.truck_count = trucks;
    b.revenue = round2(b.revenue);
    b.contribution = round2(b.contribution);
    b.labor_cost = round2(b.labor_cost);
    b.fuel_cost = round2(b.fuel_cost);
    b.deadhead_cost = round2(b.deadhead_cost);
    b.idle_cost = round2(b.idle_cost);
    b.overtime_cost = round2(b.overtime_cost);
    b.variable_cost = round2(b.variable_cost);
    b.billable_hours = round2(b.billable_hours);
    b.total_hours = round2(b.total_hours);
    b.margin_pct = pct(b.contribution, b.revenue);
    b.utilization_percent = pct(b.billable_hours, b.total_hours);
    b.revenue_per_truck = trucks > 0 ? round2(b.revenue / trucks) : null;
    b.contribution_per_truck = trucks > 0 ? round2(b.contribution / trucks) : null;
    b.contribution_per_hour =
      b.billable_hours > 0 ? round2(b.contribution / b.billable_hours) : null;
    b.operational_risk = round2(
      b.deadhead_cost + b.idle_cost + b.overtime_cost + Math.max(0, -b.contribution)
    );
    return b;
  });

  return rankRows(rows);
}

function buildTruckRows(martRows: MartRow[], today: string): FleetTruckPerformanceRow[] {
  const yesterday = new Date(`${today}T12:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const weekStart = new Date(`${today}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const byTruck = new Map<string, FleetTruckPerformanceRow>();

  for (const row of martRows) {
    const truck = relOne(row.trucks);
    const branch = relOne(row.branches);
    const existing = byTruck.get(row.truck_id) ?? {
      truck_id: row.truck_id,
      unit_number: truck?.unit_number ?? "—",
      branch_id: row.branch_id,
      branch_name: branch?.name ?? "—",
      revenue_today: 0,
      revenue_this_week: 0,
      revenue: 0,
      contribution: 0,
      margin_pct: null,
      labor_cost: 0,
      fuel_cost: 0,
      deadhead_cost: 0,
      idle_cost: 0,
      overtime_cost: 0,
      billable_hours: 0,
      total_hours: 0,
      jobs_completed: 0,
      utilization_percent: null,
      revenue_per_hour: null,
      contribution_per_hour: null,
      recommendation_value_generated: 0,
      operator_cost: 0,
      trend_vs_yesterday: null,
      rank: 0,
    };

    existing.revenue += Number(row.revenue);
    existing.contribution += Number(row.contribution);
    existing.labor_cost += Number(row.labor_cost);
    existing.fuel_cost += Number(row.fuel_cost);
    existing.deadhead_cost += Number(row.deadhead_cost);
    existing.idle_cost += Number(row.idle_cost);
    existing.overtime_cost += Number(row.overtime_cost);
    existing.billable_hours += Number(row.billable_hours);
    existing.total_hours += Number(row.total_hours);
    existing.operator_cost += Number(row.labor_cost);

    if (row.date === today) existing.revenue_today += Number(row.revenue);
    if (row.date >= weekStartStr && row.date <= today) {
      existing.revenue_this_week += Number(row.revenue);
    }

    byTruck.set(row.truck_id, existing);
  }

  const todayContrib = new Map<string, number>();
  const yestContrib = new Map<string, number>();
  for (const row of martRows) {
    if (row.date === today) {
      todayContrib.set(row.truck_id, (todayContrib.get(row.truck_id) ?? 0) + Number(row.contribution));
    }
    if (row.date === yesterdayStr) {
      yestContrib.set(row.truck_id, (yestContrib.get(row.truck_id) ?? 0) + Number(row.contribution));
    }
  }

  const rows = [...byTruck.values()].map((t) => {
    t.revenue = round2(t.revenue);
    t.contribution = round2(t.contribution);
    t.revenue_today = round2(t.revenue_today);
    t.revenue_this_week = round2(t.revenue_this_week);
    t.margin_pct = pct(t.contribution, t.revenue);
    t.utilization_percent = pct(t.billable_hours, t.total_hours);
    t.revenue_per_hour = t.billable_hours > 0 ? round2(t.revenue / t.billable_hours) : null;
    t.contribution_per_hour =
      t.billable_hours > 0 ? round2(t.contribution / t.billable_hours) : null;
    const todayC = todayContrib.get(t.truck_id) ?? 0;
    const yestC = yestContrib.get(t.truck_id) ?? 0;
    t.trend_vs_yesterday =
      yestC > 0 ? round2(((todayC - yestC) / yestC) * 100) : todayC > 0 ? 100 : null;
    return t;
  });

  return rankRows(rows);
}

async function loadOperatorTruckMap(
  supabase: SupabaseClient,
  tenantId: string
): Promise<Map<string, string>> {
  const [{ data: trucks }, { data: operators }] = await Promise.all([
    supabase
      .from("trucks")
      .select("id, capacity, notes")
      .eq("tenant_id", tenantId)
      .neq("status", "retired"),
    supabase
      .from("fleet_operators")
      .select("id, name, hourly_cost")
      .eq("tenant_id", tenantId)
      .eq("is_active", true),
  ]);

  const byName = new Map<string, string>();
  for (const op of operators ?? []) {
    const o = op as { id: string; name: string };
    byName.set(o.name.toLowerCase(), o.id);
  }

  const map = new Map<string, string>();
  for (const truck of trucks ?? []) {
    const t = truck as { id: string; capacity: Record<string, unknown>; notes: string | null };
    const fromCapacity = t.capacity?.primary_operator_id;
    if (typeof fromCapacity === "string") {
      map.set(t.id, fromCapacity);
      continue;
    }
    const notes = t.notes ?? "";
    const match = notes.match(/Primary operator:\s*(.+)/i);
    if (match) {
      const opId = byName.get(match[1].trim().toLowerCase());
      if (opId) map.set(t.id, opId);
    }
  }
  return map;
}

async function loadOperatorPerformanceRows(
  supabase: SupabaseClient,
  tenantId: string,
  martRows: MartRow[],
  truckToOperator: Map<string, string>
): Promise<FleetOperatorPerformanceRow[]> {
  const { data: operators, error } = await supabase
    .from("fleet_operators")
    .select("id, name, branch_id, hourly_cost, branches(name)")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const opMeta = new Map<
    string,
    { name: string; branch_name: string; hourly_cost: number }
  >();
  for (const op of operators ?? []) {
    const o = op as Record<string, unknown>;
    const branch = relOne(o.branches as { name: string } | { name: string }[]);
    opMeta.set(o.id as string, {
      name: o.name as string,
      branch_name: branch?.name ?? "—",
      hourly_cost: Number(o.hourly_cost) || 0,
    });
  }

  const byOp = new Map<string, FleetOperatorPerformanceRow>();

  for (const row of martRows) {
    const opId = truckToOperator.get(row.truck_id);
    if (!opId) continue;
    const meta = opMeta.get(opId);
    if (!meta) continue;

    const existing = byOp.get(opId) ?? {
      operator_id: opId,
      operator_name: meta.name,
      branch_name: meta.branch_name,
      revenue_generated: 0,
      contribution_generated: 0,
      labor_cost: 0,
      regular_hours: 0,
      overtime_hours: 0,
      double_time_hours: 0,
      idle_time: 0,
      travel_time: 0,
      revenue_per_hour: null,
      contribution_per_hour: null,
      jobs_completed: 0,
      recommendation_acceptance_rate: null,
      rank: 0,
    };

    existing.revenue_generated += Number(row.revenue);
    existing.contribution_generated += Number(row.contribution);
    existing.labor_cost += Number(row.labor_cost);
    existing.regular_hours += Math.min(Number(row.committed_hours), 8);
    existing.overtime_hours += Number(row.overtime_cost) > 0 ? Math.max(0, Number(row.committed_hours) - 8) : 0;
    existing.idle_time += Number(row.idle_hours);
    existing.travel_time += Number(row.deadhead_miles) / 45;

    byOp.set(opId, existing);
  }

  const rows = [...byOp.values()].map((o) => {
    o.revenue_generated = round2(o.revenue_generated);
    o.contribution_generated = round2(o.contribution_generated);
    o.labor_cost = round2(o.labor_cost);
    o.regular_hours = round2(o.regular_hours);
    o.overtime_hours = round2(o.overtime_hours);
    o.idle_time = round2(o.idle_time);
    o.travel_time = round2(o.travel_time);
    const hours = o.regular_hours + o.overtime_hours;
    o.revenue_per_hour = hours > 0 ? round2(o.revenue_generated / hours) : null;
    o.contribution_per_hour = hours > 0 ? round2(o.contribution_generated / hours) : null;
    return o;
  });

  return rankRows(rows);
}

export async function loadFleetPerformanceDashboard(
  supabase: SupabaseClient,
  tenantId: string,
  options?: { from?: string; to?: string; branchId?: string | null; truckId?: string | null }
): Promise<FleetPerformanceDashboardData> {
  const defaults = defaultDateRange();
  const from = options?.from ?? defaults.from;
  const to = options?.to ?? defaults.to;
  const today = new Date().toISOString().slice(0, 10);

  const [martRows, jobsByBranch, pendingByBranch, recommendationRoi, truckToOperator] =
    await Promise.all([
      loadMartRows(supabase, tenantId, from, to, options?.branchId, options?.truckId),
      loadJobsCompletedByBranch(supabase, tenantId, from, to),
      loadPendingRecsByBranch(supabase, tenantId),
      loadRecommendationRoiSummary(supabase, tenantId, from, to),
      loadOperatorTruckMap(supabase, tenantId),
    ]);

  const branches = buildBranchRows(martRows, jobsByBranch, pendingByBranch);
  const trucks = buildTruckRows(martRows, today);
  const operators = await loadOperatorPerformanceRows(
    supabase,
    tenantId,
    martRows,
    truckToOperator
  );

  const summary = martRows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + Number(r.revenue),
      contribution: acc.contribution + Number(r.contribution),
      labor: acc.labor + Number(r.labor_cost),
      fuel: acc.fuel + Number(r.fuel_cost),
      deadhead: acc.deadhead + Number(r.deadhead_cost),
      idle: acc.idle + Number(r.idle_cost),
      overtime: acc.overtime + Number(r.overtime_cost),
      variable: acc.variable + Number(r.variable_cost),
      billable: acc.billable + Number(r.billable_hours),
      total: acc.total + Number(r.total_hours),
    }),
    { revenue: 0, contribution: 0, labor: 0, fuel: 0, deadhead: 0, idle: 0, overtime: 0, variable: 0, billable: 0, total: 0 }
  );

  const trendByDate = new Map<string, { revenue: number; contribution: number; billable: number; total: number }>();
  for (const row of martRows) {
    const bucket = trendByDate.get(row.date) ?? { revenue: 0, contribution: 0, billable: 0, total: 0 };
    bucket.revenue += Number(row.revenue);
    bucket.contribution += Number(row.contribution);
    bucket.billable += Number(row.billable_hours);
    bucket.total += Number(row.total_hours);
    trendByDate.set(row.date, bucket);
  }

  const contributionTrend = [...trendByDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue: round2(v.revenue),
      contribution: round2(v.contribution),
      utilization_percent: pct(v.billable, v.total),
    }));

  const bestBranch = branches[0] ?? null;
  const worstBranch = branches.length > 0 ? branches[branches.length - 1] : null;
  const improvementOpportunity = [...branches].sort(
    (a, b) => b.operational_risk - a.operational_risk
  )[0] ?? null;

  const unassignedLeakage = branches.reduce((s, b) => s + b.recommendation_opportunity * 500, 0);

  return {
    from,
    to,
    summary: {
      totalRevenue: round2(summary.revenue),
      totalContribution: round2(summary.contribution),
      totalVariableCost: round2(summary.variable),
      marginPct: pct(summary.contribution, summary.revenue),
      avgUtilizationPercent: pct(summary.billable, summary.total),
      totalLaborCost: round2(summary.labor),
      totalFuelCost: round2(summary.fuel),
      totalDeadheadCost: round2(summary.deadhead),
      totalIdleCost: round2(summary.idle),
      totalOvertimeCost: round2(summary.overtime),
      contributionPerHour: summary.billable > 0 ? round2(summary.contribution / summary.billable) : null,
      revenuePerHour: summary.billable > 0 ? round2(summary.revenue / summary.billable) : null,
    },
    branches,
    trucks,
    operators,
    rankings: {
      bestBranch,
      worstBranch,
      biggestImprovementOpportunity: improvementOpportunity,
      topTrucks: trucks.slice(0, 5),
      topOperators: operators.slice(0, 5),
      bottomTrucks: [...trucks].reverse().slice(0, 5),
      bottomOperators: [...operators].reverse().slice(0, 5),
    },
    costAnalysis: {
      deadhead: round2(summary.deadhead),
      idle: round2(summary.idle),
      overtime: round2(summary.overtime),
      labor: round2(summary.labor),
      fuel: round2(summary.fuel),
      revenueLeakage: round2(unassignedLeakage),
      capacityCost: round2(summary.idle + summary.overtime),
    },
    recommendationRoi,
    contributionTrend,
    utilizationRows: martRows.map((row) => {
      const truck = relOne(row.trucks);
      const branch = relOne(row.branches);
      const totalHours = Number(row.total_hours);
      const billable = Number(row.billable_hours);
      return {
        truck_id: row.truck_id,
        unit_number: truck?.unit_number ?? "—",
        branch_name: branch?.name ?? "—",
        date: row.date,
        billable_hours: billable,
        idle_hours: Number(row.idle_hours),
        total_hours: totalHours,
        miles: 0,
        revenue: Number(row.revenue),
        deadhead_miles: Number(row.deadhead_miles),
        utilization_percent: totalHours > 0 ? round2((billable / totalHours) * 100) : null,
        labor_cost: Number(row.labor_cost),
        fuel_cost: Number(row.fuel_cost),
        deadhead_cost: Number(row.deadhead_cost),
        idle_cost: Number(row.idle_cost),
        contribution: Number(row.contribution),
        margin_pct: row.margin_pct != null ? Number(row.margin_pct) : null,
        overtime_cost: Number(row.overtime_cost),
        contribution_per_hour:
          billable > 0 ? round2(Number(row.contribution) / billable) : null,
        revenue_per_hour: billable > 0 ? round2(Number(row.revenue) / billable) : null,
      };
    }),
  };
}

export async function loadFleetExecutiveInsights(
  supabase: SupabaseClient,
  tenantId: string,
  date: string
): Promise<import("@/src/types/fleet").FleetExecutiveInsights> {
  const weekStart = new Date(`${date}T12:00:00.000Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { loadTenantProfitabilitySummary } = await import("./queries");
  const [dashboard, profitability] = await Promise.all([
    loadFleetPerformanceDashboard(supabase, tenantId, { from: weekStartStr, to: date }),
    loadTenantProfitabilitySummary(supabase, tenantId, date),
  ]);

  const costLeaks = [
    { label: "Deadhead", amount: dashboard.costAnalysis.deadhead },
    { label: "Idle time", amount: dashboard.costAnalysis.idle },
    { label: "Overtime", amount: dashboard.costAnalysis.overtime },
    { label: "Revenue leakage", amount: dashboard.costAnalysis.revenueLeakage },
  ].sort((a, b) => b.amount - a.amount);

  return {
    todaysContribution: profitability.estimatedContributionToday,
    contributionAtRisk: profitability.contributionAtRisk,
    highestPerformingBranch: dashboard.rankings.bestBranch,
    lowestPerformingBranch: dashboard.rankings.worstBranch,
    mostProfitableTruck: dashboard.trucks[0] ?? null,
    mostProfitableOperator: dashboard.operators[0] ?? null,
    largestRecommendationOpportunity: profitability.recommendationOpportunity,
    largestCostLeak: costLeaks[0] ?? { label: "None", amount: 0 },
    recommendationValueThisWeek: dashboard.recommendationRoi.contributionImprovement,
    branchComparison: dashboard.branches.slice(0, 5),
    contributionTrend: dashboard.contributionTrend,
  };
}
