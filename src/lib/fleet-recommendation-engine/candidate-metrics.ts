import {
  branchCapacityLabel,
  freshnessFactor,
  gpsFreshnessLabel,
  parseJobHours,
} from "./scoring-utils";
import type { ScoredCandidate } from "./profitability-scoring";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetRecommendationFactors,
} from "@/src/types/fleet";

export type CandidateMetrics = {
  truckId: string;
  unitNumber: string;
  rank: number;
  score: number;
  factors: FleetRecommendationFactors;
  travelMinutes: number | null;
  deadheadMiles: number | null;
  distanceMiles: number | null;
  currentUtilizationPct: number;
  projectedUtilizationPct: number;
  branchUtilizationPct: number;
  branchCapacityLabel: string;
  revenueImpact: number;
  gpsFreshnessPct: number;
  gpsLabel: string;
  hoursRemaining: number;
  operatorAvailable: boolean;
  operatorName: string | null;
  branchName: string | null;
  maintenanceStatus: string;
  truckTypeMatch: boolean;
  equipmentMatch: boolean;
  estimated_contribution: number;
  estimated_labor: number;
  estimated_fuel: number;
  projected_overtime_cost: number;
  telematicsStatus?: string;
};

/** Serializable snapshot stored on recommendation rationale at generation time. */
export type StoredCandidateSnapshot = {
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
};

export type StoredJobSnapshot = {
  job_id: string;
  status: string;
  assigned_truck_id: string | null;
  priority: string;
  revenue_estimate: number;
  required_truck_type: string;
};

export function scoredCandidateToSnapshot(
  candidate: ScoredCandidate,
  job: FleetDispatchJob,
  board: FleetDispatchBoardData,
  rank: number
): StoredCandidateSnapshot {
  const { lane, factors, score, deadhead, profit } = candidate;
  const estimatedHours = parseJobHours(job);
  const branchCapacity = board.branchCapacity.find((b) => b.branch_id === job.branch_id);
  const projectedTruckUtilization =
    lane.available_hours > 0
      ? (lane.committed_hours + estimatedHours) / lane.available_hours
      : 1.5;
  const projectedBranchUtilization =
    branchCapacity && branchCapacity.available_truck_hours > 0
      ? (branchCapacity.committed_hours + estimatedHours) / branchCapacity.available_truck_hours
      : projectedTruckUtilization;
  const hoursRemaining = Math.max(0, lane.available_hours - lane.committed_hours);
  const truckTypeMatch =
    job.required_truck_type === "any" || lane.truck_type === job.required_truck_type;

  let maintenanceStatus = "Ready";
  if (lane.status === "maintenance") maintenanceStatus = "In maintenance";
  else if (lane.maintenance_note) maintenanceStatus = "Service due soon";

  return {
    truck_id: lane.truck_id,
    unit_number: lane.unit_number,
    score,
    factors,
    travel_minutes: deadhead?.travelMinutes ?? null,
    deadhead_miles: deadhead?.miles ?? null,
    current_utilization_pct: Math.round(lane.utilization * 100),
    projected_utilization_pct: Math.round(projectedTruckUtilization * 100),
    branch_utilization_pct: Math.round(projectedBranchUtilization * 100),
    branch_capacity_label: branchCapacityLabel(projectedBranchUtilization),
    revenue_impact: job.revenue_estimate,
    gps_freshness_pct: freshnessFactor(lane.telematics_status),
    gps_label: gpsFreshnessLabel(lane.telematics_status),
    hours_remaining: Math.round(hoursRemaining * 10) / 10,
    operator_name: lane.operator_name ?? null,
    branch_name: lane.branch_name ?? branchCapacity?.branch_name ?? null,
    maintenance_status: maintenanceStatus,
    truck_type_match: truckTypeMatch,
    estimated_contribution: profit.estimated_contribution,
    estimated_labor: profit.estimated_labor,
    estimated_fuel: profit.estimated_fuel,
    projected_overtime_cost: profit.projected_overtime_cost,
    telematics_status: lane.telematics_status,
  };
}

export function snapshotToCandidateMetrics(
  snapshot: StoredCandidateSnapshot,
  rank: number
): CandidateMetrics {
  return {
    truckId: snapshot.truck_id,
    unitNumber: snapshot.unit_number,
    rank,
    score: snapshot.score,
    factors: snapshot.factors,
    travelMinutes: snapshot.travel_minutes,
    deadheadMiles: snapshot.deadhead_miles,
    distanceMiles: snapshot.deadhead_miles,
    currentUtilizationPct: snapshot.current_utilization_pct,
    projectedUtilizationPct: snapshot.projected_utilization_pct,
    branchUtilizationPct: snapshot.branch_utilization_pct,
    branchCapacityLabel: snapshot.branch_capacity_label,
    revenueImpact: snapshot.revenue_impact,
    gpsFreshnessPct: snapshot.gps_freshness_pct,
    gpsLabel: snapshot.gps_label,
    hoursRemaining: snapshot.hours_remaining,
    operatorAvailable: snapshot.hours_remaining >= 1,
    operatorName: snapshot.operator_name,
    branchName: snapshot.branch_name,
    maintenanceStatus: snapshot.maintenance_status,
    truckTypeMatch: snapshot.truck_type_match,
    equipmentMatch: snapshot.truck_type_match,
    estimated_contribution: snapshot.estimated_contribution,
    estimated_labor: snapshot.estimated_labor,
    estimated_fuel: snapshot.estimated_fuel,
    projected_overtime_cost: snapshot.projected_overtime_cost,
    telematicsStatus: snapshot.telematics_status,
  };
}

export function buildJobSnapshot(job: FleetDispatchJob): StoredJobSnapshot {
  return {
    job_id: job.id,
    status: job.status,
    assigned_truck_id: job.assigned_truck_id,
    priority: job.priority,
    revenue_estimate: job.revenue_estimate,
    required_truck_type: job.required_truck_type,
  };
}
