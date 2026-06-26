export type ProductProfile = "cmms" | "fleet_intelligence" | "hybrid";

/** Default product profile for self-serve signups (not live-demo visitors). */
export const SIGNUP_PRODUCT_PROFILE: ProductProfile = "fleet_intelligence";

export type IntegrationProvider =
  | "csv_manual"
  | "samsara"
  | "geotab"
  | "motive"
  | "fleetio"
  | "quickbooks"
  | "rest_api"
  | "webhook"
  | "webhook_jobs"
  | "webhook_telematics";

export type IntegrationConnectionStatus = "pending" | "active" | "error" | "disabled";

export type IntegrationSyncRunStatus = "running" | "success" | "partial" | "failed";

export type ExternalEntityType =
  | "branch"
  | "truck"
  | "fleet_job"
  | "customer_site"
  | "fleet_operator";

export type BranchStatus = "active" | "inactive";

export type TruckStatus = "active" | "maintenance" | "retired";

export type FleetJobStatus =
  | "unassigned"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type FleetJobPriority = "low" | "medium" | "high" | "urgent";

export type FleetOperatorRole = "driver" | "operator" | "lead";

export type Branch = {
  id: string;
  company_id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  status: BranchStatus;
  created_at: string;
  updated_at: string;
};

export type CustomerSite = {
  id: string;
  company_id: string;
  tenant_id: string;
  customer_id: string | null;
  property_id: string | null;
  name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  external_source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TelematicsEventSource =
  | "samsara"
  | "webhook_telematics"
  | "csv_manual"
  | "backfill";

export type Truck = {
  id: string;
  branch_id: string;
  company_id: string;
  tenant_id: string;
  unit_number: string;
  truck_type: string;
  capacity: Record<string, unknown>;
  status: TruckStatus;
  telematics_device_id: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  external_asset_id: string | null;
  notes: string | null;
  last_telematics_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TelematicsEvent = {
  id: string;
  tenant_id: string;
  truck_id: string;
  connection_id: string | null;
  recorded_at: string;
  latitude: number;
  longitude: number;
  speed_mph: number | null;
  odometer_miles: number | null;
  engine_on: boolean | null;
  idle: boolean | null;
  heading_deg: number | null;
  source: TelematicsEventSource;
  external_event_id: string | null;
  raw_payload: Record<string, unknown>;
  ingested_at: string;
};

export type TruckLatestPosition = {
  truck_id: string;
  tenant_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  speed_mph: number | null;
  engine_on: boolean | null;
  idle: boolean | null;
  source: TelematicsEventSource;
};

export type TruckTelematicsStatus = "online" | "stale" | "offline";

export type FleetOperator = {
  id: string;
  branch_id: string;
  company_id: string;
  tenant_id: string;
  name: string;
  operator_role: FleetOperatorRole;
  user_id: string | null;
  technician_id: string | null;
  certifications: string[];
  hourly_cost: number | null;
  overtime_rate: number | null;
  double_time_rate: number | null;
  shift: string | null;
  skills: string[];
  truck_qualifications: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FleetJob = {
  id: string;
  branch_id: string;
  company_id: string;
  tenant_id: string;
  customer_site_id: string;
  status: FleetJobStatus;
  priority: FleetJobPriority;
  scheduled_start: string | null;
  scheduled_end: string | null;
  revenue_estimate: number;
  required_truck_type: string;
  assigned_truck_id: string | null;
  assigned_crew_id: string | null;
  work_order_id: string | null;
  external_source_id: string | null;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationConnection = {
  id: string;
  tenant_id: string;
  provider: IntegrationProvider;
  display_name: string | null;
  status: IntegrationConnectionStatus;
  config: Record<string, unknown>;
  credentials_ref: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type IntegrationSyncRun = {
  id: string;
  connection_id: string;
  tenant_id: string;
  started_at: string;
  finished_at: string | null;
  status: IntegrationSyncRunStatus;
  records_processed: number;
  records_failed: number;
  error_summary: string | null;
  metadata: Record<string, unknown>;
};

export type UtilizationDailyRow = {
  id: string;
  tenant_id: string;
  truck_id: string;
  branch_id: string;
  date: string;
  billable_hours: number;
  idle_hours: number;
  total_hours: number;
  miles: number;
  revenue: number;
  deadhead_miles: number;
  committed_hours: number;
  labor_cost?: number;
  fuel_cost?: number;
  deadhead_cost?: number;
  idle_cost?: number;
  variable_cost?: number;
  contribution?: number;
  margin_pct?: number | null;
  overtime_cost?: number;
  refreshed_at: string;
};

export type BranchCapacitySnapshot = {
  id: string;
  tenant_id: string;
  branch_id: string;
  date: string;
  available_truck_hours: number;
  committed_hours: number;
  refreshed_at: string;
};

export type FleetCommandCenterData = {
  activeTrucks: number;
  idleTrucks: number;
  jobsToday: number;
  unassignedJobs: number;
  utilizationPercent: number | null;
  revenuePerTruckMtd: number | null;
  truckCount: number;
  /** Operational profitability signals (not accounting) */
  revenueScheduledToday?: number;
  estimatedContributionToday?: number;
  contributionAtRisk?: number;
  revenueAtRisk?: number;
  overtimeCostToday?: number;
  deadheadCostToday?: number;
  idleCostToday?: number;
  laborCostToday?: number;
  recommendationOpportunity?: number;
};

export type FleetExceptionSeverity = "critical" | "warning" | "info";

export type FleetOperationalException = {
  id: string;
  category:
    | "unassigned_job"
    | "capacity"
    | "idle_truck"
    | "telematics"
    | "integration"
    | "revenue"
    | "dispatch"
    | "gps";
  severity: FleetExceptionSeverity;
  title: string;
  whyItMatters: string;
  recommendedAction: string;
  href: string;
};

export type FleetMetricDeltaDirection = "improved" | "declined" | "unchanged" | "unknown";

export type FleetMetricDelta = {
  key: string;
  label: string;
  today: number | null;
  yesterday: number | null;
  delta: number | null;
  deltaPercent: number | null;
  direction: FleetMetricDeltaDirection;
  format: "percent" | "currency" | "count" | "hours" | "miles";
};

export type FleetIntegrationHealthItem = {
  id: string;
  provider: string;
  displayName: string;
  status: "healthy" | "warning" | "error";
  lastSyncAt: string | null;
  message: string | null;
};

export type FleetCapacityAlert = {
  branch_id: string;
  branch_name: string;
  utilization: number;
  committed_hours: number;
  available_truck_hours: number;
  href: string;
};

export type FleetTodayViewData = {
  date: string;
  executiveSummary: string;
  commandCenter: FleetCommandCenterData;
  executiveInsights?: FleetExecutiveInsights;
  exceptions: FleetOperationalException[];
  changesSinceYesterday: FleetMetricDelta[];
  integrationHealth: FleetIntegrationHealthItem[];
  upcomingCapacityIssues: FleetCapacityAlert[];
  unusedCapacityBranches: FleetCapacityAlert[];
  recommendations: FleetRecommendationsResponse;
  recommendationRoi?: FleetRecommendationRoiSummary;
  revenueAtRisk: number;
  pendingActionCount: number;
};

export type FleetDispatchJob = {
  id: string;
  title: string;
  status: FleetJobStatus;
  priority: FleetJobPriority;
  branch_id: string;
  branch_name: string | null;
  assigned_truck_id: string | null;
  required_truck_type: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  revenue_estimate: number;
  site_name: string | null;
  site_latitude: number | null;
  site_longitude: number | null;
  estimated_deadhead_miles: number | null;
  estimated_travel_minutes: number | null;
};

export type FleetDispatchTruckLane = {
  truck_id: string;
  unit_number: string;
  truck_type: string;
  branch_id: string;
  branch_name?: string | null;
  status: TruckStatus;
  committed_hours: number;
  available_hours: number;
  utilization: number;
  jobs: FleetDispatchJob[];
  latitude: number | null;
  longitude: number | null;
  telematics_status: TruckTelematicsStatus;
  operator_name?: string | null;
  operator_id?: string | null;
  operator_certifications?: string[];
  operator_truck_qualifications?: string[];
  operator_daily_hours?: number;
  operator_weekly_hours?: number;
  operator_on_pto?: boolean;
  revenue_today?: number;
  idle_hours?: number;
  fuel_level_pct?: number | null;
  maintenance_note?: string | null;
};

export type FleetDispatchBoardData = {
  date: string;
  jobs: FleetDispatchJob[];
  unassignedJobs: FleetDispatchJob[];
  truckLanes: FleetDispatchTruckLane[];
  branchCapacity: Array<{
    branch_id: string;
    branch_name: string;
    available_truck_hours: number;
    committed_hours: number;
    utilization: number;
  }>;
};

export type FleetUtilizationReportRow = {
  truck_id: string;
  unit_number: string;
  branch_name: string;
  date: string;
  billable_hours: number;
  idle_hours: number;
  total_hours: number;
  miles: number;
  revenue: number;
  deadhead_miles: number;
  utilization_percent: number | null;
  labor_cost?: number;
  fuel_cost?: number;
  deadhead_cost?: number;
  idle_cost?: number;
  contribution?: number;
  margin_pct?: number | null;
  overtime_cost?: number;
  contribution_per_hour?: number | null;
  revenue_per_hour?: number | null;
};

export type FleetUtilizationReportData = {
  from: string;
  to: string;
  rows: FleetUtilizationReportRow[];
  weekOverWeek: Array<{ label: string; utilization_percent: number; revenue: number }>;
  summary: {
    totalRevenue: number;
    avgUtilizationPercent: number | null;
    totalDeadheadMiles: number;
    totalContribution?: number;
    marginPct?: number | null;
  };
};

export type FleetBranchPerformanceRow = {
  branch_id: string;
  branch_name: string;
  revenue: number;
  contribution: number;
  margin_pct: number | null;
  labor_cost: number;
  fuel_cost: number;
  deadhead_cost: number;
  idle_cost: number;
  overtime_cost: number;
  variable_cost: number;
  billable_hours: number;
  total_hours: number;
  truck_count: number;
  revenue_per_truck: number | null;
  contribution_per_truck: number | null;
  contribution_per_hour: number | null;
  utilization_percent: number | null;
  jobs_completed: number;
  recommendation_opportunity: number;
  operational_risk: number;
  rank: number;
};

export type FleetTruckPerformanceRow = {
  truck_id: string;
  unit_number: string;
  branch_id: string;
  branch_name: string;
  revenue_today: number;
  revenue_this_week: number;
  revenue: number;
  contribution: number;
  margin_pct: number | null;
  labor_cost: number;
  fuel_cost: number;
  deadhead_cost: number;
  idle_cost: number;
  overtime_cost: number;
  billable_hours: number;
  total_hours: number;
  jobs_completed: number;
  utilization_percent: number | null;
  revenue_per_hour: number | null;
  contribution_per_hour: number | null;
  recommendation_value_generated: number;
  operator_cost: number;
  trend_vs_yesterday: number | null;
  rank: number;
};

export type FleetOperatorPerformanceRow = {
  operator_id: string;
  operator_name: string;
  branch_name: string;
  revenue_generated: number;
  contribution_generated: number;
  labor_cost: number;
  regular_hours: number;
  overtime_hours: number;
  double_time_hours: number;
  idle_time: number;
  travel_time: number;
  revenue_per_hour: number | null;
  contribution_per_hour: number | null;
  jobs_completed: number;
  recommendation_acceptance_rate: number | null;
  rank: number;
};

export type FleetRecommendationRoiSummary = {
  accepted: number;
  dismissed: number;
  applied: number;
  failed: number;
  acceptanceRate: number | null;
  revenueProtected: number;
  contributionImprovement: number;
  laborSaved: number;
  fuelSaved: number;
  deadheadReduction: number;
  overtimeAvoided: number;
  travelTimeSavedMinutes: number;
  branchAcceptanceRates: Array<{ branch_id: string; acceptance_rate: number | null }>;
  topTypesByValue: Array<{ type: string; value: number; count: number }>;
  topBranchesByValue: Array<{ branch_id: string; value: number; count: number }>;
  topTrucksByImpact: Array<{ truck_id: string; unit_number: string; value: number; count: number }>;
};

export type FleetPerformanceDashboardData = {
  from: string;
  to: string;
  summary: {
    totalRevenue: number;
    totalContribution: number;
    totalVariableCost: number;
    marginPct: number | null;
    avgUtilizationPercent: number | null;
    totalLaborCost: number;
    totalFuelCost: number;
    totalDeadheadCost: number;
    totalIdleCost: number;
    totalOvertimeCost: number;
    contributionPerHour: number | null;
    revenuePerHour: number | null;
  };
  branches: FleetBranchPerformanceRow[];
  trucks: FleetTruckPerformanceRow[];
  operators: FleetOperatorPerformanceRow[];
  rankings: {
    bestBranch: FleetBranchPerformanceRow | null;
    worstBranch: FleetBranchPerformanceRow | null;
    biggestImprovementOpportunity: FleetBranchPerformanceRow | null;
    topTrucks: FleetTruckPerformanceRow[];
    topOperators: FleetOperatorPerformanceRow[];
    bottomTrucks: FleetTruckPerformanceRow[];
    bottomOperators: FleetOperatorPerformanceRow[];
  };
  costAnalysis: {
    deadhead: number;
    idle: number;
    overtime: number;
    labor: number;
    fuel: number;
    revenueLeakage: number;
    capacityCost: number;
  };
  recommendationRoi: FleetRecommendationRoiSummary;
  contributionTrend: Array<{
    date: string;
    revenue: number;
    contribution: number;
    utilization_percent: number | null;
  }>;
  utilizationRows: FleetUtilizationReportRow[];
};

export type FleetExecutiveInsights = {
  todaysContribution: number;
  contributionAtRisk: number;
  highestPerformingBranch: FleetBranchPerformanceRow | null;
  lowestPerformingBranch: FleetBranchPerformanceRow | null;
  mostProfitableTruck: FleetTruckPerformanceRow | null;
  mostProfitableOperator: FleetOperatorPerformanceRow | null;
  largestRecommendationOpportunity: number;
  largestCostLeak: { label: string; amount: number };
  recommendationValueThisWeek: number;
  branchComparison: FleetBranchPerformanceRow[];
  contributionTrend: FleetPerformanceDashboardData["contributionTrend"];
};

export type FleetRecommendationType =
  | "truck_assignment"
  | "capacity_overload"
  | "idle_truck_match";

export type FleetRecommendationStatus =
  | "pending"
  | "accepted"
  | "dismissed"
  | "expired"
  | "applied"
  | "completed"
  | "failed";

export type FleetRecommendationOutcomeAction =
  | "accepted"
  | "dismissed"
  | "expired"
  | "applied"
  | "failed";

export type FleetRecommendationFactors = {
  travelImpact: number;
  utilizationImpact: number;
  capacityImpact: number;
  telematicsFreshness: number;
  /** Operational profitability layer (fleet_rules_v2+) */
  profitabilityImpact?: number;
  laborCostImpact?: number;
  overtimeRiskImpact?: number;
  slaRiskImpact?: number;
};

export type FleetRecommendationRationale = {
  title: string;
  reasons: string[];
  factors: FleetRecommendationFactors;
  entities: {
    job_id?: string;
    truck_id?: string;
    source_branch_id?: string;
    target_branch_id?: string;
  };
  candidates?: Array<{
    truck_id: string;
    unit_number: string;
    score: number;
  }>;
  /** Engine snapshots at generation — single source of truth for explainability */
  candidate_snapshots?: Array<{
    truck_id: string;
    unit_number: string;
    score: number;
    factors: FleetRecommendationFactors;
    travel_minutes: number | null;
    deadhead_miles: number | null;
    current_utilization_pct: number;
    projected_utilization_pct: number;
    branch_utilization_pct: number;
    branch_capacity_label: string;
    revenue_impact: number;
    gps_freshness_pct: number;
    gps_label: string;
    hours_remaining: number;
    operator_name: string | null;
    branch_name: string | null;
    maintenance_status: string;
    truck_type_match: boolean;
    estimated_contribution: number;
    estimated_labor: number;
    estimated_fuel: number;
    projected_overtime_cost: number;
    telematics_status: string;
  }>;
  job_snapshot?: {
    job_id: string;
    status: string;
    assigned_truck_id: string | null;
    priority: string;
    revenue_estimate: number;
    required_truck_type: string;
  };
  generated_at?: string;
  /** Dispatch board date (YYYY-MM-DD) used when this recommendation was generated */
  board_date?: string;
  /** SHA-256 digest of operational snapshot at generation time */
  snapshot_hash?: string;
  replaced_recommendation_id?: string;
  replacement_reason?: string;
  /** Read-time validation metadata — attached before DISPLAYED */
  validation_health?: FleetRecommendationValidationHealth;
};

export type RecommendationLifecyclePhase =
  | "draft"
  | "validating"
  | "ready"
  | "displayed"
  | "accepted"
  | "rejected"
  | "expired"
  | "failed"
  | "invalid";

export type FleetRecommendationValidationHealth = {
  status: "valid" | "invalid";
  lifecycle: RecommendationLifecyclePhase;
  validated_at: string;
  snapshot_version: string;
  snapshot_hash?: string;
  generated_at: string;
  constraint_violations: Array<{ code: string; message: string }>;
  /** Calibrated trust score — separate from ranking score */
  confidence: number;
  ranking_score: number;
  constraint_count: number;
  freshness: "current" | "stale";
  validation_ms?: number;
  board_date?: string;
};

export type FleetRecommendationRecalculationReplacement = {
  job_id?: string;
  previous_unit_number?: string;
  previous_truck_id?: string;
  new_unit_number?: string;
  new_truck_id?: string;
  reason: string;
  contribution_delta?: number | null;
  confidence?: number | null;
  expected_contribution?: number | null;
};

export type FleetRecommendationRecalculationNotice = {
  message: string;
  invalidated_count: number;
  replaced_count: number;
  replacements?: FleetRecommendationRecalculationReplacement[];
  details?: Array<{
    previous_unit_number?: string;
    reason: string;
  }>;
};

export type FleetRecommendationInstance = {
  id: string;
  tenant_id: string;
  branch_id: string;
  recommendation_type: FleetRecommendationType;
  status: FleetRecommendationStatus;
  lifecycle?: RecommendationLifecyclePhase;
  score: number;
  rationale: FleetRecommendationRationale;
  engine_version: string;
  created_at: string;
  expires_at: string;
};

export type FleetRecommendationOutcome = {
  id: string;
  recommendation_id: string;
  action: FleetRecommendationOutcomeAction;
  acted_by: string | null;
  acted_at: string;
  estimated_impact: Record<string, unknown>;
  measured_impact?: Record<string, unknown>;
  application_error?: string | null;
  notes: string | null;
};

/** Stored in recommendation_outcomes.estimated_impact.decision_record on accept/dismiss */
export type FleetRecommendationDecisionRecord = {
  recommendation_id: string;
  recommendation_type: FleetRecommendationType;
  decision: "accepted" | "dismissed";
  timestamp: string;
  dispatcher_id: string | null;
  recommended_truck_id: string | null;
  recommended_unit_number: string | null;
  job_id: string | null;
  alternatives: Array<{ truck_id: string; unit_number: string; score: number }>;
  winner_reasons: string[];
  loser_reasons: Array<{ unit_number: string; reasons: string[] }>;
  confidence: "high" | "medium" | "low";
  confidence_explanation: string;
  projected_outcome: {
    travelReducedMiles: number | null;
    arrivalImprovedMinutes: number | null;
    projectedUtilizationPct: number | null;
    branchCapacityLabel: string | null;
    revenueProtected: number | null;
    contributionImprovement?: number | null;
    laborSaved?: number | null;
    overtimeAvoided?: number | null;
    fuelSaved?: number | null;
  };
  engine_score: number;
  factors: FleetRecommendationFactors;
};

export type FleetRecommendationHistoryEntry = FleetRecommendationInstance & {
  latest_outcome: FleetRecommendationOutcome | null;
};

export type FleetRecommendationSummary = {
  volume: number;
  accepted: number;
  dismissed: number;
  expired: number;
  acceptanceRate: number | null;
  dismissalRate: number | null;
};

export type FleetRecommendationsResponse = {
  generatedAt: string;
  engineVersion: string;
  pending: FleetRecommendationInstance[];
  history: FleetRecommendationHistoryEntry[];
  summary: FleetRecommendationSummary;
  recalculationNotice?: FleetRecommendationRecalculationNotice;
};
