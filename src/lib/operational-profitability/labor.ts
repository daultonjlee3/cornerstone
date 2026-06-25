import type { CompanyOperatingRules, LaborCostBreakdown } from "./types";

export function resolveOperatorRates(
  rules: CompanyOperatingRules,
  hourlyRate: number,
  overtimeRate: number | null,
  doubleTimeRate: number | null
): { base: number; overtime: number; doubleTime: number } {
  const base = hourlyRate > 0 ? hourlyRate : rules.default_operator_hourly_rate;
  return {
    base,
    overtime: overtimeRate ?? base * rules.overtime_multiplier,
    doubleTime: doubleTimeRate ?? base * rules.double_time_multiplier,
  };
}

/**
 * Deterministic labor cost for additional job hours given hours already worked.
 * Does not run payroll — models operational cost for dispatch decisions.
 */
export function computeIncrementalLaborCost(args: {
  rules: CompanyOperatingRules;
  hourlyRate: number;
  overtimeRate?: number | null;
  doubleTimeRate?: number | null;
  jobHours: number;
  travelHours?: number;
  dailyHoursBefore: number;
  weeklyHoursBefore: number;
  isSaturday?: boolean;
  isSunday?: boolean;
  isHoliday?: boolean;
  isNightShift?: boolean;
}): LaborCostBreakdown {
  const rates = resolveOperatorRates(
    args.rules,
    args.hourlyRate,
    args.overtimeRate ?? null,
    args.doubleTimeRate ?? null
  );

  let premium = 1;
  if (args.isHoliday) premium = Math.max(premium, args.rules.holiday_multiplier);
  else if (args.isSunday) premium = Math.max(premium, args.rules.sunday_multiplier);
  else if (args.isSaturday) premium = Math.max(premium, args.rules.saturday_multiplier);
  if (args.isNightShift) premium += args.rules.night_shift_premium;

  const travelHours = (args.travelHours ?? 0) * args.rules.travel_time_pay_multiplier;
  const totalHours = args.jobHours + travelHours;

  let regularHours = 0;
  let overtimeHours = 0;
  let doubleTimeHours = 0;

  let dailyRemaining = Math.max(
    0,
    args.rules.daily_overtime_threshold - args.dailyHoursBefore
  );
  let weeklyRemaining = Math.max(
    0,
    args.rules.weekly_overtime_threshold - args.weeklyHoursBefore
  );
  let regularBudget = Math.min(dailyRemaining, weeklyRemaining);

  let hoursLeft = totalHours;
  const regularChunk = Math.min(hoursLeft, regularBudget);
  regularHours += regularChunk;
  hoursLeft -= regularChunk;

  const doubleThreshold = args.rules.double_time_threshold;
  if (doubleThreshold != null && args.dailyHoursBefore + regularHours + hoursLeft > doubleThreshold) {
    const untilDouble = Math.max(
      0,
      doubleThreshold - (args.dailyHoursBefore + regularHours)
    );
    const otChunk = Math.min(hoursLeft, untilDouble);
    overtimeHours += otChunk;
    hoursLeft -= otChunk;
    doubleTimeHours += hoursLeft;
    hoursLeft = 0;
  } else {
    overtimeHours += hoursLeft;
    hoursLeft = 0;
  }

  const regularCost = regularHours * rates.base * premium;
  const overtimeCost = overtimeHours * rates.overtime * premium;
  const doubleTimeCost = doubleTimeHours * rates.doubleTime * premium;

  return {
    regular_hours: Math.round(regularHours * 100) / 100,
    overtime_hours: Math.round(overtimeHours * 100) / 100,
    double_time_hours: Math.round(doubleTimeHours * 100) / 100,
    regular_cost: Math.round(regularCost * 100) / 100,
    overtime_cost: Math.round(overtimeCost * 100) / 100,
    double_time_cost: Math.round(doubleTimeCost * 100) / 100,
    total_cost: Math.round((regularCost + overtimeCost + doubleTimeCost) * 100) / 100,
  };
}

export function laborCostImpactScore(incrementalCost: number, revenue: number): number {
  if (revenue <= 0) return incrementalCost <= 200 ? 70 : 40;
  const costRatio = incrementalCost / revenue;
  if (costRatio <= 0.25) return 95;
  if (costRatio <= 0.4) return 80;
  if (costRatio <= 0.55) return 65;
  if (costRatio <= 0.7) return 45;
  return 25;
}

export function overtimeRiskImpactScore(overtimeHours: number, jobHours: number): number {
  if (overtimeHours <= 0) return 100;
  if (overtimeHours <= 0.5) return 75;
  if (overtimeHours <= jobHours * 0.5) return 55;
  return 30;
}
