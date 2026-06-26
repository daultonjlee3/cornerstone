export type BranchCountBand = "1" | "2-3" | "4-6" | "7+";

export type ComplexityTier = "Low" | "Medium" | "High" | "Enterprise";

export type IntegrationCategoryId =
  | "telematics"
  | "fleet"
  | "erp"
  | "field_service"
  | "payroll"
  | "other";

export type OperationalGoalId =
  | "reduce_deadhead"
  | "increase_utilization"
  | "improve_dispatch"
  | "ai_recommendations"
  | "executive_dashboards"
  | "branch_visibility"
  | "capacity_planning"
  | "better_reporting"
  | "reduce_overtime"
  | "increase_contribution";

export type LaunchEstimatorInput = {
  companyName: string;
  industry: string;
  branchCount: BranchCountBand;
  truckCount: number;
  dailyJobs: number;
  dispatcherCount: number;
  integrations: string[];
  goals: OperationalGoalId[];
};

export type LaunchEstimatorLead = {
  email: string;
  phone?: string;
  companyName: string;
};

export type OpportunityEstimate = {
  label: string;
  value: string;
};

export type LaunchEstimatorResult = {
  complexity: ComplexityTier;
  complexityScore: number;
  integrationCount: number;
  estimatedImplementation: number;
  estimatedImplementationLabel: string;
  customPlanningRecommended: boolean;
  timelineLabel: string;
  timelineWeeksDisplay: string;
  branchCountNumeric: number;
  branchCountDisplay: string;
  operationalFocus: string[];
  opportunities: OpportunityEstimate[];
  disclaimer: string;
};

export type LaunchEstimatorState = {
  step: number;
  input: Partial<LaunchEstimatorInput>;
  result: LaunchEstimatorResult | null;
  lead: Partial<LaunchEstimatorLead>;
  submittedAt?: string;
};

export type LaunchEstimatorCrmPayload = {
  source: "launch_estimator";
  submitted_at: string;
  company_name: string;
  email: string;
  phone: string | null;
  industry: string;
  branch_count: string;
  truck_count: number;
  daily_jobs: number;
  dispatcher_count: number;
  integration_count: number;
  integrations: string[];
  goals: string[];
  estimated_implementation: number;
  estimated_implementation_label: string;
  complexity: ComplexityTier;
  timeline: string;
  custom_planning_recommended: boolean;
};
