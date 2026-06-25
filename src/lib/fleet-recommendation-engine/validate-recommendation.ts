import type { FleetDispatchBoardData, FleetRecommendationInstance } from "@/src/types/fleet";

export type RecommendationValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateRecommendationAcceptance(args: {
  recommendation: FleetRecommendationInstance;
  board: FleetDispatchBoardData;
  now?: Date;
}): RecommendationValidationResult {
  const { recommendation, board } = args;
  const now = args.now ?? new Date();

  if (recommendation.status !== "pending") {
    return {
      ok: false,
      code: "not_pending",
      message: "Recommendation is no longer pending.",
    };
  }

  if (Date.parse(recommendation.expires_at) <= now.getTime()) {
    return {
      ok: false,
      code: "expired",
      message: "Recommendation has expired. Refresh recommendations and try again.",
    };
  }

  const jobId = recommendation.rationale.entities.job_id;
  const truckId =
    recommendation.rationale.entities.truck_id ??
    recommendation.rationale.candidates?.[0]?.truck_id;

  if (recommendation.recommendation_type === "truck_assignment" || recommendation.recommendation_type === "idle_truck_match") {
    if (!jobId) {
      return { ok: false, code: "missing_job", message: "Recommendation is missing a job reference." };
    }
    if (!truckId) {
      return { ok: false, code: "missing_truck", message: "Recommendation is missing a truck reference." };
    }

    const job = board.jobs.find((j) => j.id === jobId);
    if (!job) {
      return {
        ok: false,
        code: "job_not_found",
        message: "Job is no longer on the dispatch board.",
      };
    }

    if (job.status === "cancelled" || job.status === "completed") {
      return {
        ok: false,
        code: "job_closed",
        message: `Job is ${job.status} and cannot be assigned.`,
      };
    }

    if (job.assigned_truck_id && job.assigned_truck_id !== truckId) {
      return {
        ok: false,
        code: "job_already_assigned",
        message: `Job is already assigned to another truck.`,
      };
    }

    const snapshot = recommendation.rationale.job_snapshot;
    if (snapshot && snapshot.job_id === jobId) {
      if (snapshot.status !== job.status && job.status !== "unassigned") {
        return {
          ok: false,
          code: "job_state_changed",
          message: "Job status changed since this recommendation was generated.",
        };
      }
      if (
        snapshot.assigned_truck_id &&
        snapshot.assigned_truck_id !== truckId &&
        job.assigned_truck_id !== truckId
      ) {
        return {
          ok: false,
          code: "job_reassigned",
          message: "Job was assigned to a different truck since this recommendation was generated.",
        };
      }
    }

    const lane = board.truckLanes.find((l) => l.truck_id === truckId);
    if (!lane) {
      return {
        ok: false,
        code: "truck_not_found",
        message: "Recommended truck is not available on the dispatch board.",
      };
    }

    if (lane.status !== "active") {
      return {
        ok: false,
        code: "truck_unavailable",
        message: `Truck ${lane.unit_number} is not active (${lane.status}).`,
      };
    }

    if (
      job.required_truck_type !== "any" &&
      lane.truck_type !== job.required_truck_type
    ) {
      return {
        ok: false,
        code: "truck_type_mismatch",
        message: `Truck ${lane.unit_number} does not match required type ${job.required_truck_type}.`,
      };
    }
  }

  return { ok: true };
}
