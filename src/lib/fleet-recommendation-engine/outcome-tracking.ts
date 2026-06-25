import type { FleetDispatchJob, FleetRecommendationInstance } from "@/src/types/fleet";
import type { StoredCandidateSnapshot } from "./candidate-metrics";
import type { DecisionImpactDisplay } from "./explainability";

export type MeasuredImpactField<T> = {
  estimated: T | null;
  actual: T | null;
  status: "pending" | "estimated" | "measured" | "unavailable";
};

export type RecommendationMeasuredImpact = {
  measured_at: string | null;
  assignment_applied: boolean;
  actual_truck_id: string | null;
  actual_start_time: MeasuredImpactField<string>;
  actual_completion_time: MeasuredImpactField<string>;
  actual_travel_minutes: MeasuredImpactField<number>;
  actual_job_duration_hours: MeasuredImpactField<number>;
  actual_deadhead_miles: MeasuredImpactField<number>;
  actual_revenue: MeasuredImpactField<number>;
  actual_contribution: MeasuredImpactField<number>;
  completed_on_time: MeasuredImpactField<boolean>;
};

export type RecommendationEstimatedImpact = {
  recommendation_id: string;
  job_id: string | null;
  recommended_truck_id: string | null;
  alternative_truck_ids: string[];
  dispatcher_id: string | null;
  timestamp: string;
  engine_score: number;
  factors: Record<string, unknown>;
  financial_estimate: {
    estimated_contribution: number | null;
    contribution_improvement: number | null;
    labor_saved: number | null;
    overtime_avoided: number | null;
    deadhead_reduction_miles: number | null;
    travel_reduction_minutes: number | null;
    revenue_protected: number | null;
  };
  assignment_applied: boolean;
  outcome_status: string;
  decision_record?: Record<string, unknown>;
};

function field<T>(
  estimated: T | null,
  actual: T | null,
  status: MeasuredImpactField<T>["status"]
): MeasuredImpactField<T> {
  return { estimated, actual, status };
}

export function buildEstimatedImpactPayload(args: {
  recommendation: FleetRecommendationInstance;
  decisionRecord: Record<string, unknown>;
  projectedOutcome: DecisionImpactDisplay;
  primarySnapshot: StoredCandidateSnapshot | null;
  altSnapshot: StoredCandidateSnapshot | null;
  actedBy: string | null;
  assignmentApplied: boolean;
  outcomeStatus: string;
}): RecommendationEstimatedImpact {
  const { recommendation, decisionRecord, projectedOutcome, primarySnapshot, altSnapshot, actedBy, assignmentApplied, outcomeStatus } = args;
  const entities = recommendation.rationale.entities;
  const candidates = recommendation.rationale.candidate_snapshots ?? [];

  return {
    recommendation_id: recommendation.id,
    job_id: entities.job_id ?? null,
    recommended_truck_id: entities.truck_id ?? primarySnapshot?.truck_id ?? null,
    alternative_truck_ids: candidates.slice(1).map((c) => c.truck_id),
    dispatcher_id: actedBy,
    timestamp: new Date().toISOString(),
    engine_score: recommendation.score,
    factors: recommendation.rationale.factors as unknown as Record<string, unknown>,
    financial_estimate: {
      estimated_contribution: primarySnapshot?.estimated_contribution ?? null,
      contribution_improvement: projectedOutcome.contributionImprovement,
      labor_saved: projectedOutcome.laborSaved,
      overtime_avoided: projectedOutcome.overtimeAvoided,
      deadhead_reduction_miles: projectedOutcome.travelReducedMiles,
      travel_reduction_minutes: projectedOutcome.arrivalImprovedMinutes,
      revenue_protected: projectedOutcome.revenueProtected,
    },
    assignment_applied: assignmentApplied,
    outcome_status: outcomeStatus,
    decision_record: decisionRecord,
  };
}

export function measureRecommendationOutcome(args: {
  job: FleetDispatchJob | null | undefined;
  recommendedTruckId: string | null;
  estimatedTravelMinutes: number | null;
  estimatedContribution: number | null;
  estimatedDeadheadMiles: number | null;
  scheduledStart: string | null;
}): RecommendationMeasuredImpact {
  const { job, recommendedTruckId, estimatedTravelMinutes, estimatedContribution, estimatedDeadheadMiles, scheduledStart } = args;

  if (!job) {
    return {
      measured_at: null,
      assignment_applied: false,
      actual_truck_id: null,
      actual_start_time: field<string>(null, null, "pending"),
      actual_completion_time: field<string>(null, null, "pending"),
      actual_travel_minutes: field<number>(estimatedTravelMinutes, null, "pending"),
      actual_job_duration_hours: field<number>(null, null, "pending"),
      actual_deadhead_miles: field<number>(estimatedDeadheadMiles, null, "pending"),
      actual_revenue: field<number>(null, null, "pending"),
      actual_contribution: field<number>(estimatedContribution, null, "pending"),
      completed_on_time: field<boolean>(null, null, "pending"),
    };
  }

  const assigned = job.assigned_truck_id;
  const assignmentApplied = assigned != null && assigned === recommendedTruckId;

  const actualStart = job.status === "in_progress" || job.status === "completed" ? job.scheduled_start : null;
  const actualEnd = job.status === "completed" ? job.scheduled_end : null;

  let durationHours: number | null = null;
  if (actualStart && actualEnd) {
    const start = Date.parse(actualStart);
    const end = Date.parse(actualEnd);
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      durationHours = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
    }
  }

  const actualRevenue = job.status === "completed" || job.status === "in_progress" ? job.revenue_estimate : null;

  let onTime: boolean | null = null;
  if (job.status === "completed" && scheduledStart && actualStart) {
    onTime = Date.parse(actualStart) <= Date.parse(scheduledStart) + 15 * 60 * 1000;
  }

  const travelStatus: MeasuredImpactField<number>["status"] = "unavailable";
  const deadheadStatus: MeasuredImpactField<number>["status"] =
    job.estimated_deadhead_miles != null ? "measured" : "unavailable";

  return {
    measured_at: new Date().toISOString(),
    assignment_applied: assignmentApplied,
    actual_truck_id: assigned,
    actual_start_time: field(scheduledStart, actualStart, actualStart ? "measured" : "pending"),
    actual_completion_time: field(job.scheduled_end, actualEnd, actualEnd ? "measured" : "pending"),
    actual_travel_minutes: field(estimatedTravelMinutes, job.estimated_travel_minutes ?? null, travelStatus),
    actual_job_duration_hours: field(null, durationHours, durationHours != null ? "measured" : "pending"),
    actual_deadhead_miles: field(
      estimatedDeadheadMiles,
      job.estimated_deadhead_miles ?? null,
      deadheadStatus
    ),
    actual_revenue: field(job.revenue_estimate, actualRevenue, actualRevenue != null ? "measured" : "pending"),
    actual_contribution: field(
      estimatedContribution,
      (job as { estimated_contribution?: number | null }).estimated_contribution ?? null,
      (job as { estimated_contribution?: number | null }).estimated_contribution != null
        ? "measured"
        : "pending"
    ),
    completed_on_time: field(null, onTime, onTime != null ? "measured" : "pending"),
  };
}
