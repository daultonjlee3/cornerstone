import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyOperatingRules, ProfitabilityContext, TruckCostProfile } from "./types";
import { loadOperatorContextMaps } from "@/src/lib/fleet/queries/operator-context";

function weekStartIso(boardDay: string): string {
  const anchor = new Date(`${boardDay}T12:00:00.000Z`);
  anchor.setUTCDate(anchor.getUTCDate() - anchor.getUTCDay());
  return anchor.toISOString().slice(0, 10);
}

export const DEFAULT_OPERATING_RULES: Omit<
  CompanyOperatingRules,
  "id" | "tenant_id" | "company_id" | "custom_rules"
> = {
  regular_hours_per_day: 8,
  regular_hours_per_week: 40,
  daily_overtime_threshold: 8,
  weekly_overtime_threshold: 40,
  overtime_multiplier: 1.5,
  double_time_threshold: 12,
  double_time_multiplier: 2,
  saturday_multiplier: 1.5,
  sunday_multiplier: 2,
  holiday_multiplier: 2,
  night_shift_premium: 0.15,
  travel_time_pay_multiplier: 1,
  default_operator_hourly_rate: 45,
  fuel_cost_per_mile: 0.85,
  idle_cost_per_hour: 35,
  truck_fixed_cost_per_hour: 28,
};

function mapRulesRow(row: Record<string, unknown>): CompanyOperatingRules {
  return {
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    company_id: row.company_id as string,
    regular_hours_per_day: Number(row.regular_hours_per_day),
    regular_hours_per_week: Number(row.regular_hours_per_week),
    daily_overtime_threshold: Number(row.daily_overtime_threshold),
    weekly_overtime_threshold: Number(row.weekly_overtime_threshold),
    overtime_multiplier: Number(row.overtime_multiplier),
    double_time_threshold:
      row.double_time_threshold == null ? null : Number(row.double_time_threshold),
    double_time_multiplier: Number(row.double_time_multiplier),
    saturday_multiplier: Number(row.saturday_multiplier),
    sunday_multiplier: Number(row.sunday_multiplier),
    holiday_multiplier: Number(row.holiday_multiplier),
    night_shift_premium: Number(row.night_shift_premium),
    travel_time_pay_multiplier: Number(row.travel_time_pay_multiplier),
    default_operator_hourly_rate: Number(row.default_operator_hourly_rate),
    fuel_cost_per_mile: Number(row.fuel_cost_per_mile),
    idle_cost_per_hour: Number(row.idle_cost_per_hour),
    truck_fixed_cost_per_hour: Number(row.truck_fixed_cost_per_hour),
    custom_rules: (row.custom_rules as Record<string, unknown>) ?? {},
  };
}

export function syntheticOperatingRules(
  tenantId: string,
  companyId: string
): CompanyOperatingRules {
  return {
    id: "",
    tenant_id: tenantId,
    company_id: companyId,
    custom_rules: {},
    ...DEFAULT_OPERATING_RULES,
  };
}

export async function loadCompanyOperatingRules(
  supabase: SupabaseClient,
  tenantId: string,
  companyId: string
): Promise<CompanyOperatingRules> {
  const { data } = await supabase
    .from("company_operating_rules")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (data) return mapRulesRow(data as Record<string, unknown>);
  return syntheticOperatingRules(tenantId, companyId);
}

export async function loadPrimaryCompanyId(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("name")
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function loadProfitabilityContext(
  supabase: SupabaseClient,
  tenantId: string,
  companyId?: string | null,
  date?: string
): Promise<ProfitabilityContext> {
  const resolvedCompanyId =
    companyId ?? (await loadPrimaryCompanyId(supabase, tenantId));
  const rules = resolvedCompanyId
    ? await loadCompanyOperatingRules(supabase, tenantId, resolvedCompanyId)
    : syntheticOperatingRules(tenantId, resolvedCompanyId ?? tenantId);

  const { data: profiles } = await supabase
    .from("truck_cost_profiles")
    .select("truck_id, truck_type, fuel_cost_per_mile, idle_cost_per_hour, fixed_cost_per_hour")
    .eq("tenant_id", tenantId);

  const truckProfiles = new Map<string, TruckCostProfile>();
  const typeProfiles = new Map<string, TruckCostProfile>();
  for (const row of profiles ?? []) {
    const p = row as TruckCostProfile;
    if (p.truck_id) truckProfiles.set(p.truck_id, p);
    else if (p.truck_type) typeProfiles.set(p.truck_type, p);
  }

  const day = date ?? new Date().toISOString().slice(0, 10);
  const operatorDailyHours = new Map<string, number>();
  const operatorWeeklyHours = new Map<string, number>();

  const weekStart = weekStartIso(day);

  const [{ data: martRows }, { data: operatorHourRows }, operatorContext] = await Promise.all([
    supabase
      .from("utilization_daily")
      .select("committed_hours, truck_id")
      .eq("tenant_id", tenantId)
      .gte("date", weekStart)
      .lte("date", day),
    supabase
      .from("fleet_operator_hours_daily")
      .select("operator_id, date, committed_hours")
      .eq("tenant_id", tenantId)
      .gte("date", weekStart)
      .lte("date", day),
    loadOperatorContextMaps(supabase, tenantId, day).catch(() => null),
  ]);

  for (const row of operatorHourRows ?? []) {
    const operatorId = (row as { operator_id: string }).operator_id;
    const hours = Number((row as { committed_hours: number }).committed_hours) || 0;
    const rowDate = (row as { date: string }).date;
    if (rowDate === day) {
      operatorDailyHours.set(operatorId, hours);
    }
    operatorWeeklyHours.set(operatorId, (operatorWeeklyHours.get(operatorId) ?? 0) + hours);
  }

  // Fallback: proxy operator hours from truck committed hours when operator hours are absent
  if ((operatorHourRows ?? []).length === 0) {
    for (const row of martRows ?? []) {
      const truckId = (row as { truck_id: string }).truck_id;
      const hours = Number((row as { committed_hours: number }).committed_hours) || 0;
      const operatorId = operatorContext?.truckToOperatorId.get(truckId) ?? truckId;
      if (!operatorDailyHours.has(operatorId)) {
        operatorDailyHours.set(operatorId, hours);
      }
      operatorWeeklyHours.set(operatorId, (operatorWeeklyHours.get(operatorId) ?? 0) + hours);
    }
  }

  return {
    rules,
    truckProfiles,
    typeProfiles,
    operatorDailyHours,
    operatorWeeklyHours,
  };
}

export async function loadTenantProfitabilitySummary(
  supabase: SupabaseClient,
  tenantId: string,
  date: string
): Promise<{
  revenueScheduledToday: number;
  estimatedContributionToday: number;
  contributionAtRisk: number;
  revenueAtRisk: number;
  overtimeCostToday: number;
  deadheadCostToday: number;
  idleCostToday: number;
  laborCostToday: number;
  recommendationOpportunity: number;
}> {
  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  const [{ data: jobs }, { data: mart }] = await Promise.all([
    supabase
      .from("fleet_jobs")
      .select("revenue_estimate, estimated_contribution, status")
      .eq("tenant_id", tenantId)
      .gte("scheduled_start", dayStart)
      .lte("scheduled_start", dayEnd)
      .not("status", "eq", "cancelled"),
    supabase
      .from("utilization_daily")
      .select("revenue, contribution, labor_cost, fuel_cost, deadhead_cost, idle_cost, overtime_cost")
      .eq("tenant_id", tenantId)
      .eq("date", date),
  ]);

  const scheduledJobs = jobs ?? [];
  const martRows = mart ?? [];

  const revenueScheduledToday = scheduledJobs.reduce(
    (s, j) => s + Number((j as { revenue_estimate: number }).revenue_estimate),
    0
  );
  const estimatedContributionToday = martRows.reduce(
    (s, r) => s + Number((r as { contribution: number }).contribution),
    0
  );
  const laborCostToday = martRows.reduce(
    (s, r) => s + Number((r as { labor_cost: number }).labor_cost),
    0
  );
  const deadheadCostToday = martRows.reduce(
    (s, r) => s + Number((r as { deadhead_cost: number }).deadhead_cost),
    0
  );
  const idleCostToday = martRows.reduce(
    (s, r) => s + Number((r as { idle_cost: number }).idle_cost),
    0
  );
  const overtimeCostToday = martRows.reduce(
    (s, r) => s + Number((r as { overtime_cost: number }).overtime_cost),
    0
  );

  const { data: pendingRecRows } = await supabase
    .from("recommendation_instances")
    .select("rationale")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  let recommendationOpportunity = 0;
  for (const row of pendingRecRows ?? []) {
    const rationale = (row as { rationale: Record<string, unknown> }).rationale as {
      board_date?: string;
      candidate_snapshots?: Array<{ estimated_contribution?: number }>;
    };
    if (rationale.board_date && rationale.board_date !== date) continue;
    const contribution = rationale.candidate_snapshots?.[0]?.estimated_contribution ?? 0;
    recommendationOpportunity += Number(contribution) || 0;
  }
  recommendationOpportunity = Math.round(recommendationOpportunity * 100) / 100;

  const { data: unassigned } = await supabase
    .from("fleet_jobs")
    .select("revenue_estimate, estimated_contribution")
    .eq("tenant_id", tenantId)
    .eq("status", "unassigned");

  const unassignedRows = unassigned ?? [];
  const revenueAtRisk = unassignedRows.reduce(
    (s, j) => s + Number((j as { revenue_estimate: number }).revenue_estimate),
    0
  );
  const contributionAtRisk = unassignedRows.reduce(
    (s, j) => s + Number((j as { estimated_contribution: number | null }).estimated_contribution ?? 0),
    0
  );

  return {
    revenueScheduledToday: Math.round(revenueScheduledToday * 100) / 100,
    estimatedContributionToday: Math.round(estimatedContributionToday * 100) / 100,
    contributionAtRisk: Math.round(contributionAtRisk * 100) / 100,
    revenueAtRisk: Math.round(revenueAtRisk * 100) / 100,
    overtimeCostToday: Math.round(overtimeCostToday * 100) / 100,
    deadheadCostToday: Math.round(deadheadCostToday * 100) / 100,
    idleCostToday: Math.round(idleCostToday * 100) / 100,
    laborCostToday: Math.round(laborCostToday * 100) / 100,
    recommendationOpportunity,
  };
}
