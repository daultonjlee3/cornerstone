/** Operational Profitability — financial decision layer on top of Fleet (not ERP). */

export type CompanyOperatingRules = {
  id: string;
  tenant_id: string;
  company_id: string;
  regular_hours_per_day: number;
  regular_hours_per_week: number;
  daily_overtime_threshold: number;
  weekly_overtime_threshold: number;
  overtime_multiplier: number;
  double_time_threshold: number | null;
  double_time_multiplier: number;
  saturday_multiplier: number;
  sunday_multiplier: number;
  holiday_multiplier: number;
  night_shift_premium: number;
  travel_time_pay_multiplier: number;
  default_operator_hourly_rate: number;
  fuel_cost_per_mile: number;
  idle_cost_per_hour: number;
  truck_fixed_cost_per_hour: number;
  custom_rules: Record<string, unknown>;
};

export type TruckCostProfile = {
  truck_id: string | null;
  truck_type: string | null;
  fuel_cost_per_mile: number | null;
  idle_cost_per_hour: number | null;
  fixed_cost_per_hour: number | null;
};

export type OperatorCostProfile = {
  operator_id: string;
  name: string;
  hourly_rate: number;
  overtime_rate: number | null;
  double_time_rate: number | null;
  daily_hours_worked: number;
  weekly_hours_worked: number;
  shift: string | null;
  truck_qualifications: string[];
};

export type JobProfitabilityEstimate = {
  estimated_revenue: number;
  estimated_labor: number;
  estimated_fuel: number;
  estimated_deadhead: number;
  estimated_travel_labor: number;
  estimated_variable_cost: number;
  estimated_contribution: number;
  estimated_margin_pct: number | null;
  estimated_cost_per_mile: number | null;
  estimated_cost_per_hour: number | null;
  projected_overtime_hours: number;
  projected_overtime_cost: number;
  sla_risk_score: number;
};

export type TruckProfitabilitySnapshot = {
  truck_id: string;
  revenue_today: number;
  revenue_week: number;
  estimated_labor: number;
  estimated_fuel: number;
  estimated_deadhead_cost: number;
  estimated_contribution: number;
  estimated_margin_pct: number | null;
  idle_cost: number;
  revenue_per_hour: number | null;
  contribution_per_hour: number | null;
  jobs_completed: number;
  billable_hours: number;
};

export type ProfitabilityContext = {
  rules: CompanyOperatingRules;
  truckProfiles: Map<string, TruckCostProfile>;
  typeProfiles: Map<string, TruckCostProfile>;
  operatorDailyHours: Map<string, number>;
  operatorWeeklyHours: Map<string, number>;
};

export type LaborCostBreakdown = {
  regular_hours: number;
  overtime_hours: number;
  double_time_hours: number;
  regular_cost: number;
  overtime_cost: number;
  double_time_cost: number;
  total_cost: number;
};
