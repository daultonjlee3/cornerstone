import type { FleetDispatchJob, FleetDispatchTruckLane, FleetJobPriority } from "@/src/types/fleet";
import { computeIncrementalLaborCost } from "./labor";
import type { CompanyOperatingRules, JobProfitabilityEstimate, ProfitabilityContext } from "./types";

function parseJobHours(job: Pick<FleetDispatchJob, "scheduled_start" | "scheduled_end">): number {
  const start = job.scheduled_start ? Date.parse(job.scheduled_start) : Number.NaN;
  const end = job.scheduled_end ? Date.parse(job.scheduled_end) : Number.NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.min(8, Math.max(0.5, (end - start) / (1000 * 60 * 60)));
  }
  return 2;
}

function slaRiskScore(priority: FleetJobPriority, isLate: boolean): number {
  if (isLate) return 95;
  switch (priority) {
    case "urgent":
      return 85;
    case "high":
      return 65;
    case "medium":
      return 40;
    default:
      return 20;
  }
}

function resolveTruckCosts(
  ctx: ProfitabilityContext,
  lane: FleetDispatchTruckLane
): { fuelPerMile: number; idlePerHour: number; fixedPerHour: number } {
  const byTruck = ctx.truckProfiles.get(lane.truck_id);
  const byType = ctx.typeProfiles.get(lane.truck_type);
  const profile = byTruck ?? byType;
  return {
    fuelPerMile: profile?.fuel_cost_per_mile ?? ctx.rules.fuel_cost_per_mile,
    idlePerHour: profile?.idle_cost_per_hour ?? ctx.rules.idle_cost_per_hour,
    fixedPerHour: profile?.fixed_cost_per_hour ?? ctx.rules.truck_fixed_cost_per_hour,
  };
}

export function computeJobProfitability(args: {
  job: FleetDispatchJob;
  lane?: FleetDispatchTruckLane | null;
  operatorId?: string | null;
  operatorHourlyRate?: number | null;
  ctx: ProfitabilityContext;
  deadheadMiles?: number | null;
  travelMinutes?: number | null;
  isLate?: boolean;
}): JobProfitabilityEstimate {
  const { job, lane, ctx } = args;
  const jobHours = parseJobHours(job);
  const travelHours = (args.travelMinutes ?? 0) / 60;
  const deadheadMiles = args.deadheadMiles ?? job.estimated_deadhead_miles ?? 0;

  const operatorId = args.operatorId ?? null;
  const hourlyRate =
    args.operatorHourlyRate ??
    (operatorId ? ctx.rules.default_operator_hourly_rate : ctx.rules.default_operator_hourly_rate);

  const dailyBefore = operatorId ? ctx.operatorDailyHours.get(operatorId) ?? 0 : 0;
  const weeklyBefore = operatorId ? ctx.operatorWeeklyHours.get(operatorId) ?? 0 : 0;

  const labor = computeIncrementalLaborCost({
    rules: ctx.rules,
    hourlyRate,
    jobHours,
    travelHours,
    dailyHoursBefore: dailyBefore,
    weeklyHoursBefore: weeklyBefore,
  });

  const truckCosts = lane ? resolveTruckCosts(ctx, lane) : {
    fuelPerMile: ctx.rules.fuel_cost_per_mile,
    idlePerHour: ctx.rules.idle_cost_per_hour,
    fixedPerHour: ctx.rules.truck_fixed_cost_per_hour,
  };

  const estimatedFuel = Math.round(deadheadMiles * truckCosts.fuelPerMile * 100) / 100;
  const estimatedDeadhead = estimatedFuel;
  const estimatedTravelLabor = Math.round(travelHours * hourlyRate * ctx.rules.travel_time_pay_multiplier * 100) / 100;
  const truckFixed = Math.round(jobHours * truckCosts.fixedPerHour * 100) / 100;
  const estimatedVariable =
    Math.round((labor.total_cost + estimatedFuel + truckFixed) * 100) / 100;
  const revenue = job.revenue_estimate;
  const contribution = Math.round((revenue - estimatedVariable) * 100) / 100;
  const marginPct = revenue > 0 ? Math.round((contribution / revenue) * 10000) / 100 : null;
  const totalMiles = Math.max(deadheadMiles, 0.1);
  const totalHours = Math.max(jobHours + travelHours, 0.1);

  return {
    estimated_revenue: revenue,
    estimated_labor: labor.total_cost,
    estimated_fuel: estimatedFuel,
    estimated_deadhead: estimatedDeadhead,
    estimated_travel_labor: estimatedTravelLabor,
    estimated_variable_cost: estimatedVariable,
    estimated_contribution: contribution,
    estimated_margin_pct: marginPct,
    estimated_cost_per_mile: Math.round((estimatedVariable / totalMiles) * 100) / 100,
    estimated_cost_per_hour: Math.round((estimatedVariable / totalHours) * 100) / 100,
    projected_overtime_hours: labor.overtime_hours + labor.double_time_hours,
    projected_overtime_cost: labor.overtime_cost + labor.double_time_cost,
    sla_risk_score: slaRiskScore(job.priority, args.isLate ?? false),
  };
}

export function profitabilityImpactScore(
  contribution: number,
  bestAlternativeContribution: number | null
): number {
  if (bestAlternativeContribution == null) {
    if (contribution >= 3000) return 95;
    if (contribution >= 1500) return 80;
    if (contribution >= 500) return 65;
    if (contribution >= 0) return 50;
    return 25;
  }
  const delta = contribution - bestAlternativeContribution;
  if (delta >= 200) return 95;
  if (delta >= 100) return 85;
  if (delta >= 25) return 75;
  if (delta >= 0) return 60;
  if (delta >= -50) return 45;
  return 30;
}

export { parseJobHours as profitabilityJobHours };
