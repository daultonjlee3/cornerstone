export type ProductProfile = "cmms" | "fleet_intelligence" | "hybrid";

export type IntegrationProvider =
  | "csv_manual"
  | "samsara"
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
  status: TruckStatus;
  committed_hours: number;
  available_hours: number;
  utilization: number;
  jobs: FleetDispatchJob[];
  latitude: number | null;
  longitude: number | null;
  telematics_status: TruckTelematicsStatus;
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
  };
};
