import type {
  FleetDispatchBoardData,
  FleetRecommendationInstance,
  FleetRecommendationValidationHealth,
  RecommendationLifecyclePhase,
} from "@/src/types/fleet";
import {
  evaluateTruckJobHardConstraints,
  isJobAssignable,
  operationalNowForBoard,
  type HardConstraintCode,
} from "./constraints";
import { computeValidationConfidence } from "./confidence";
import { hashOperationalSnapshot } from "./snapshot-hash";

export type RecommendationValidationResult =
  | { ok: true; health: FleetRecommendationValidationHealth }
  | { ok: false; code: string; message: string; health: FleetRecommendationValidationHealth };

const STALE_AFTER_MS = 60 * 60 * 1000;

function buildHealth(args: {
  valid: boolean;
  lifecycle: RecommendationLifecyclePhase;
  board: FleetDispatchBoardData;
  recommendation: FleetRecommendationInstance;
  violations: Array<{ code: string; message: string }>;
  validationMs: number;
  now: Date;
  telematicsStatus?: "online" | "stale" | "offline";
  snapshotMismatch?: boolean;
}): FleetRecommendationValidationHealth {
  const generatedAt =
    args.recommendation.rationale.generated_at ?? args.recommendation.created_at;
  const ageMs = args.now.getTime() - Date.parse(generatedAt);
  const boardDate = args.recommendation.rationale.board_date ?? args.board.date;
  const freshness = ageMs > STALE_AFTER_MS ? "stale" : "current";
  const currentSnapshotHash = hashOperationalSnapshot(args.board);

  const confidence = computeValidationConfidence({
    rankingScore: args.recommendation.score,
    telematicsStatus: args.telematicsStatus ?? "online",
    factors: args.recommendation.rationale.factors,
    constraintViolationCount: args.violations.length,
    freshness,
    snapshotMismatch: args.snapshotMismatch,
  });

  return {
    status: args.valid ? "valid" : "invalid",
    lifecycle: args.lifecycle,
    validated_at: args.now.toISOString(),
    snapshot_version: boardDate,
    snapshot_hash: currentSnapshotHash,
    generated_at: generatedAt,
    constraint_violations: args.violations,
    confidence,
    ranking_score: args.recommendation.score,
    constraint_count: args.violations.length,
    freshness,
    validation_ms: args.validationMs,
    board_date: boardDate,
  };
}

export function validateRecommendationInstance(args: {
  recommendation: FleetRecommendationInstance;
  board: FleetDispatchBoardData;
  now?: Date;
  lifecycle?: RecommendationLifecyclePhase;
}): RecommendationValidationResult {
  const started = performance.now();
  const now = args.now ?? operationalNowForBoard(args.board);
  const { recommendation, board } = args;
  const lifecycle = args.lifecycle ?? "validating";
  const violations: Array<{ code: string; message: string }> = [];
  const currentSnapshotHash = hashOperationalSnapshot(board);

  const fail = (
    code: string,
    message: string,
    extras?: { telematicsStatus?: "online" | "stale" | "offline"; snapshotMismatch?: boolean }
  ): RecommendationValidationResult => {
    violations.push({ code, message });
    return {
      ok: false,
      code,
      message,
      health: buildHealth({
        valid: false,
        lifecycle: "invalid",
        board,
        recommendation,
        violations,
        validationMs: Math.round(performance.now() - started),
        now,
        telematicsStatus: extras?.telematicsStatus,
        snapshotMismatch: extras?.snapshotMismatch,
      }),
    };
  };

  if (recommendation.status !== "pending") {
    return fail("not_pending", "Recommendation is no longer pending.");
  }

  if (Date.parse(recommendation.expires_at) <= now.getTime()) {
    return fail("expired", "Recommendation has expired.");
  }

  const boardDate = recommendation.rationale.board_date;
  if (boardDate && boardDate !== board.date) {
    return fail(
      "board_date_mismatch",
      `Recommendation was generated for ${boardDate} but the board date is ${board.date}.`
    );
  }

  const storedSnapshotHash = recommendation.rationale.snapshot_hash;
  if (storedSnapshotHash && storedSnapshotHash !== currentSnapshotHash) {
    return fail(
      "snapshot_hash_mismatch",
      "Operational snapshot changed since this recommendation was generated.",
      { snapshotMismatch: true }
    );
  }

  if (recommendation.recommendation_type === "capacity_overload") {
    const overloaded = board.branchCapacity.some(
      (b) => b.available_truck_hours > 0 && b.committed_hours > b.available_truck_hours
    );
    if (!overloaded) {
      return fail("capacity_resolved", "Branch overload condition has been resolved.");
    }
    return {
      ok: true,
      health: buildHealth({
        valid: true,
        lifecycle: "ready",
        board,
        recommendation,
        violations,
        validationMs: Math.round(performance.now() - started),
        now,
      }),
    };
  }

  const jobId = recommendation.rationale.entities.job_id;
  const truckId =
    recommendation.rationale.entities.truck_id ??
    recommendation.rationale.candidates?.[0]?.truck_id;

  if (!jobId) return fail("missing_job", "Recommendation is missing a job reference.");
  if (!truckId) return fail("missing_truck", "Recommendation is missing a truck reference.");

  const job = board.jobs.find((j) => j.id === jobId);
  if (!job) {
    return fail("job_not_found", "Job is no longer on the dispatch board.");
  }

  const jobAssignable = isJobAssignable(job, board, now);
  if (!jobAssignable.ok) {
    return fail(jobAssignable.code, jobAssignable.message);
  }

  const lane = board.truckLanes.find((l) => l.truck_id === truckId);
  if (!lane) {
    return fail("truck_not_found", "Recommended truck is not on the dispatch board.");
  }

  const allowAssigned =
    job.assigned_truck_id === truckId &&
    (job.status === "scheduled" || job.status === "in_progress");

  const truckJob = evaluateTruckJobHardConstraints({
    job,
    lane,
    board,
    now,
    allowAssignedToThisTruck: allowAssigned,
  });
  if (!truckJob.ok) {
    return fail(truckJob.code, truckJob.message, {
      telematicsStatus: lane.telematics_status,
    });
  }

  const snapshot = recommendation.rationale.job_snapshot;
  if (snapshot && snapshot.job_id === jobId) {
    if (
      snapshot.status !== job.status &&
      job.status !== "unassigned" &&
      !allowAssigned
    ) {
      return fail("job_state_changed", "Job status changed since this recommendation was generated.");
    }
    if (
      snapshot.assigned_truck_id &&
      snapshot.assigned_truck_id !== truckId &&
      job.assigned_truck_id !== truckId
    ) {
      return fail("job_reassigned", "Job was assigned to a different truck.");
    }
  }

  return {
    ok: true,
    health: buildHealth({
      valid: true,
      lifecycle: "ready",
      board,
      recommendation,
      violations,
      validationMs: Math.round(performance.now() - started),
      now,
      telematicsStatus: lane.telematics_status,
    }),
  };
}

export function validateRecommendationAcceptance(args: {
  recommendation: FleetRecommendationInstance;
  board: FleetDispatchBoardData;
  now?: Date;
}): { ok: true } | { ok: false; code: string; message: string } {
  const result = validateRecommendationInstance({
    ...args,
    lifecycle: "validating",
  });
  if (result.ok) return { ok: true };
  return { ok: false, code: result.code, message: result.message };
}

export function attachValidationHealth(
  recommendation: FleetRecommendationInstance,
  board: FleetDispatchBoardData,
  now?: Date
): FleetRecommendationInstance {
  const result = validateRecommendationInstance({
    recommendation,
    board,
    now,
    lifecycle: "ready",
  });
  return {
    ...recommendation,
    lifecycle: result.health.lifecycle,
    rationale: {
      ...recommendation.rationale,
      validation_health: result.health,
    },
  };
}

export type InvalidationSummary = {
  id: string;
  code: HardConstraintCode | string;
  message: string;
  previousTruckId?: string;
  previousUnitNumber?: string;
  previousContributionEstimate?: number | null;
  jobId?: string;
};
