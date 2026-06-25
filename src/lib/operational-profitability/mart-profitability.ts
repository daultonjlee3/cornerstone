import { computeIncrementalLaborCost } from "./labor";
import type { CompanyOperatingRules, ProfitabilityContext, TruckCostProfile } from "./types";

export type TruckDayProfitabilityInput = {
  revenue: number;
  billableHours: number;
  committedHours: number;
  idleHours: number;
  deadheadMiles: number;
  miles: number;
  weeklyCommittedBefore: number;
};

export type TruckDayProfitabilityResult = {
  labor_cost: number;
  fuel_cost: number;
  deadhead_cost: number;
  idle_cost: number;
  variable_cost: number;
  contribution: number;
  margin_pct: number | null;
  overtime_cost: number;
  revenue_per_hour: number | null;
  contribution_per_hour: number | null;
};

function resolveTruckRates(
  ctx: ProfitabilityContext,
  truckId: string,
  truckType: string
): { fuelPerMile: number; idlePerHour: number; fixedPerHour: number } {
  const byTruck = ctx.truckProfiles.get(truckId);
  const byType = ctx.typeProfiles.get(truckType);
  const profile: TruckCostProfile | undefined = byTruck ?? byType;
  return {
    fuelPerMile: profile?.fuel_cost_per_mile ?? ctx.rules.fuel_cost_per_mile,
    idlePerHour: profile?.idle_cost_per_hour ?? ctx.rules.idle_cost_per_hour,
    fixedPerHour: profile?.fixed_cost_per_hour ?? ctx.rules.truck_fixed_cost_per_hour,
  };
}

export function computeTruckDayProfitability(
  ctx: ProfitabilityContext,
  truckId: string,
  truckType: string,
  input: TruckDayProfitabilityInput
): TruckDayProfitabilityResult {
  const rates = resolveTruckRates(ctx, truckId, truckType);
  const hourlyRate = ctx.rules.default_operator_hourly_rate;

  const labor = computeIncrementalLaborCost({
    rules: ctx.rules,
    hourlyRate,
    jobHours: input.committedHours,
    dailyHoursBefore: 0,
    weeklyHoursBefore: input.weeklyCommittedBefore,
  });

  const fuel_cost = Math.round(input.deadheadMiles * rates.fuelPerMile * 100) / 100;
  const deadhead_cost = fuel_cost;
  const idle_cost = Math.round(input.idleHours * rates.idlePerHour * 100) / 100;
  const truck_fixed = Math.round(input.billableHours * rates.fixedPerHour * 100) / 100;
  const variable_cost =
    Math.round((labor.total_cost + fuel_cost + idle_cost + truck_fixed) * 100) / 100;
  const contribution = Math.round((input.revenue - variable_cost) * 100) / 100;
  const margin_pct =
    input.revenue > 0 ? Math.round((contribution / input.revenue) * 10000) / 100 : null;
  const hoursBase = Math.max(input.billableHours, 0.1);

  return {
    labor_cost: labor.total_cost,
    fuel_cost,
    deadhead_cost,
    idle_cost,
    variable_cost,
    contribution,
    margin_pct,
    overtime_cost: Math.round((labor.overtime_cost + labor.double_time_cost) * 100) / 100,
    revenue_per_hour: Math.round((input.revenue / hoursBase) * 100) / 100,
    contribution_per_hour: Math.round((contribution / hoursBase) * 100) / 100,
  };
}

export function aggregateProfitabilityFields(
  rows: TruckDayProfitabilityResult[]
): TruckDayProfitabilityResult {
  const sum = rows.reduce(
    (acc, r) => ({
      labor_cost: acc.labor_cost + r.labor_cost,
      fuel_cost: acc.fuel_cost + r.fuel_cost,
      deadhead_cost: acc.deadhead_cost + r.deadhead_cost,
      idle_cost: acc.idle_cost + r.idle_cost,
      variable_cost: acc.variable_cost + r.variable_cost,
      contribution: acc.contribution + r.contribution,
      overtime_cost: acc.overtime_cost + r.overtime_cost,
      revenue: acc.revenue + (r.revenue_per_hour ?? 0),
      billable: acc.billable + 1,
    }),
    {
      labor_cost: 0,
      fuel_cost: 0,
      deadhead_cost: 0,
      idle_cost: 0,
      variable_cost: 0,
      contribution: 0,
      overtime_cost: 0,
      revenue: 0,
      billable: 0,
    }
  );
  return {
    labor_cost: Math.round(sum.labor_cost * 100) / 100,
    fuel_cost: Math.round(sum.fuel_cost * 100) / 100,
    deadhead_cost: Math.round(sum.deadhead_cost * 100) / 100,
    idle_cost: Math.round(sum.idle_cost * 100) / 100,
    variable_cost: Math.round(sum.variable_cost * 100) / 100,
    contribution: Math.round(sum.contribution * 100) / 100,
    margin_pct: null,
    overtime_cost: Math.round(sum.overtime_cost * 100) / 100,
    revenue_per_hour: null,
    contribution_per_hour: null,
  };
}
