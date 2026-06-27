import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import { loadProfitabilityContext } from "@/src/lib/operational-profitability/queries";
import {
  rankTruckCandidatesForJob,
} from "@/src/lib/fleet-recommendation-engine/pipeline";
import {
  evaluateTruckJobHardConstraints,
  isJobAssignable,
  operationalNowForBoard,
  type HardConstraintCode,
} from "@/src/lib/fleet-recommendation-engine/constraints";
import {
  buildProfitabilityReasons,
  type ScoredCandidate,
} from "@/src/lib/fleet-recommendation-engine/profitability-scoring";
import {
  buildJobSnapshot,
  scoredCandidateToSnapshot,
} from "@/src/lib/fleet-recommendation-engine/candidate-metrics";
import { computeValidationConfidence } from "@/src/lib/fleet-recommendation-engine/confidence";
import { hashOperationalSnapshot } from "@/src/lib/fleet-recommendation-engine/snapshot-hash";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
import { applyRecommendationOutcome } from "@/src/lib/fleet-recommendation-engine/service";

export type AssignmentBlockingReason = {
  code: HardConstraintCode | string;
  message: string;
};

export type AssignmentAlternative = {
  truckId?: string;
  jobId?: string;
  unitNumber?: string;
  jobTitle?: string;
  score: number;
  valid: boolean;
  blockingReasons: AssignmentBlockingReason[];
  expectedContribution: number | null;
  estimatedDeadheadMiles: number | null;
  estimatedDriveMinutes: number | null;
  confidence: number;
  explanation: string[];
};

export type AssignmentValidationResult = {
  valid: boolean;
  validationId: string;
  snapshotId: string;
  jobId: string;
  truckId: string;
  jobTitle: string;
  unitNumber: string;
  blockingReasons: AssignmentBlockingReason[];
  warnings: string[];
  expectedContribution: number | null;
  estimatedDeadheadMiles: number | null;
  estimatedDriveMinutes: number | null;
  eta: string | null;
  confidence: number;
  alternatives: AssignmentAlternative[];
  explanation: string[];
  utilizationImpact: string | null;
  overtimeRisk: string | null;
  slaImpact: string | null;
};

export type AssignmentSuggestResult = {
  snapshotId: string;
  jobId?: string;
  truckId?: string;
  validation: AssignmentValidationResult | null;
  recommendation: FleetRecommendationInstance | null;
  displayRecommendation: FleetRecommendationInstance | null;
  alternatives: AssignmentAlternative[];
};

export type CommitAssignmentInput = {
  truckId: string;
  jobId: string;
  date: string;
  branchId?: string | null;
  validationId: string;
  snapshotId: string;
  assignmentSource: "manual_drag" | "ai_recommendation" | "map_click";
  recommendationId?: string | null;
  actedBy?: string | null;
};

export type CommitAssignmentResult = {
  success: true;
  jobId: string;
  truckId: string;
  unitNumber: string;
  jobTitle: string;
  recommendationId: string | null;
  assignmentSource: CommitAssignmentInput["assignmentSource"];
};

export function buildValidationId(snapshotId: string, truckId: string, jobId: string): string {
  return `${snapshotId}:${truckId}:${jobId}`;
}

export function parseValidationId(
  validationId: string
): { snapshotId: string; truckId: string; jobId: string } | null {
  const parts = validationId.split(":");
  if (parts.length < 3) return null;
  const snapshotId = parts[0];
  const truckId = parts[1];
  const jobId = parts.slice(2).join(":");
  if (!snapshotId || !truckId || !jobId) return null;
  return { snapshotId, truckId, jobId };
}

function computeEta(job: FleetDispatchJob, travelMinutes: number | null, now: Date): string | null {
  if (job.scheduled_start) return job.scheduled_start;
  if (travelMinutes == null) return null;
  return new Date(now.getTime() + travelMinutes * 60_000).toISOString();
}

function confidenceForCandidate(
  candidate: ScoredCandidate,
  violationCount: number
): number {
  return computeValidationConfidence({
    rankingScore: candidate.score,
    telematicsStatus: candidate.lane.telematics_status,
    factors: candidate.factors,
    constraintViolationCount: violationCount,
    freshness: "current",
    operatorOnPto: candidate.lane.operator_on_pto ?? false,
  });
}

function parseJobHoursFromJob(job: FleetDispatchJob): number {
  if (!job.scheduled_start || !job.scheduled_end) return 2;
  const start = Date.parse(job.scheduled_start);
  const end = Date.parse(job.scheduled_end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 2;
  return (end - start) / (1000 * 60 * 60);
}

function utilizationImpactLabelForJob(
  lane: FleetDispatchTruckLane,
  job: FleetDispatchJob,
  candidate: ScoredCandidate
): string | null {
  const pct = Math.round(lane.utilization * 100);
  const hours = parseJobHoursFromJob(job);
  const projected =
    lane.available_hours > 0
      ? Math.round(((lane.committed_hours + hours) / lane.available_hours) * 100)
      : pct;
  if (projected >= 100) return `Truck utilization rises to ${projected}% (over capacity risk)`;
  if (projected >= 85) return `Truck utilization rises to ${projected}%`;
  return `Truck utilization ${pct}% → ${projected}% after assignment`;
}

function overtimeRiskLabel(candidate: ScoredCandidate): string | null {
  if (candidate.profit.projected_overtime_hours <= 0) return "No overtime projected";
  return `${candidate.profit.projected_overtime_hours.toFixed(1)}h overtime projected ($${Math.round(candidate.profit.projected_overtime_cost)})`;
}

function slaImpactLabel(job: FleetDispatchJob, travelMinutes: number | null, now: Date): string | null {
  if (!job.scheduled_end) return null;
  const end = Date.parse(job.scheduled_end);
  if (!Number.isFinite(end)) return null;
  const etaMs = travelMinutes != null ? now.getTime() + travelMinutes * 60_000 : now.getTime();
  if (etaMs > end) return "Assignment may miss SLA window";
  return "Within SLA window";
}

function truckAlternativeFromScored(
  candidate: ScoredCandidate,
  job: FleetDispatchJob,
  board: FleetDispatchBoardData,
  best?: ScoredCandidate
): AssignmentAlternative {
  const alt = best && best.lane.truck_id !== candidate.lane.truck_id ? best : undefined;
  const reasons = buildProfitabilityReasons(candidate, alt);
  return {
    truckId: candidate.lane.truck_id,
    unitNumber: candidate.lane.unit_number,
    score: candidate.score,
    valid: true,
    blockingReasons: [],
    expectedContribution: candidate.profit.estimated_contribution,
    estimatedDeadheadMiles: candidate.deadhead?.miles ?? null,
    estimatedDriveMinutes: candidate.deadhead?.travelMinutes ?? null,
    confidence: confidenceForCandidate(candidate, 0),
    explanation: reasons.slice(0, 3),
  };
}

function jobAlternativeFromScored(
  job: FleetDispatchJob,
  candidate: ScoredCandidate,
  alt?: ScoredCandidate
): AssignmentAlternative {
  const reasons = buildProfitabilityReasons(candidate, alt);
  return {
    jobId: job.id,
    jobTitle: job.title,
    score: candidate.score,
    valid: true,
    blockingReasons: [],
    expectedContribution: candidate.profit.estimated_contribution,
    estimatedDeadheadMiles: candidate.deadhead?.miles ?? null,
    estimatedDriveMinutes: candidate.deadhead?.travelMinutes ?? null,
    confidence: confidenceForCandidate(candidate, 0),
    explanation: reasons.slice(0, 3),
  };
}

export function validateFleetAssignmentPair(args: {
  job: FleetDispatchJob;
  lane: FleetDispatchTruckLane;
  board: FleetDispatchBoardData;
  profitCtx: ProfitabilityContext;
  scored?: ScoredCandidate | null;
  alternativeScored?: ScoredCandidate[];
}): AssignmentValidationResult {
  const now = operationalNowForBoard(args.board);
  const snapshotId = hashOperationalSnapshot(args.board);
  const warnings: string[] = [];

  const jobCheck = isJobAssignable(args.job, args.board, now);
  if (!jobCheck.ok) {
    return {
      valid: false,
      validationId: buildValidationId(snapshotId, args.lane.truck_id, args.job.id),
      snapshotId,
      jobId: args.job.id,
      truckId: args.lane.truck_id,
      jobTitle: args.job.title,
      unitNumber: args.lane.unit_number,
      blockingReasons: [{ code: jobCheck.code, message: jobCheck.message }],
      warnings,
      expectedContribution: null,
      estimatedDeadheadMiles: null,
      estimatedDriveMinutes: null,
      eta: null,
      confidence: 0,
      alternatives: [],
      explanation: [jobCheck.message],
      utilizationImpact: null,
      overtimeRisk: null,
      slaImpact: null,
    };
  }

  const constraint = evaluateTruckJobHardConstraints({
    job: args.job,
    lane: args.lane,
    board: args.board,
    now,
  });

  if (!constraint.ok) {
    return {
      valid: false,
      validationId: buildValidationId(snapshotId, args.lane.truck_id, args.job.id),
      snapshotId,
      jobId: args.job.id,
      truckId: args.lane.truck_id,
      jobTitle: args.job.title,
      unitNumber: args.lane.unit_number,
      blockingReasons: [{ code: constraint.code, message: constraint.message }],
      warnings,
      expectedContribution: null,
      estimatedDeadheadMiles: null,
      estimatedDriveMinutes: null,
      eta: null,
      confidence: 0,
      alternatives: [],
      explanation: [constraint.message],
      utilizationImpact: null,
      overtimeRisk: null,
      slaImpact: null,
    };
  }

  const scored =
    args.scored ??
    rankTruckCandidatesForJob({
      job: args.job,
      board: args.board,
      profitCtx: args.profitCtx,
      now,
    }).find((c) => c.lane.truck_id === args.lane.truck_id) ??
    null;

  const travelMinutes = scored?.deadhead?.travelMinutes ?? null;
  if (args.lane.telematics_status === "stale") {
    warnings.push("GPS signal is delayed — deadhead estimate may be less accurate.");
  }

  const explanation = scored
    ? buildProfitabilityReasons(
        scored,
        rankTruckCandidatesForJob({
          job: args.job,
          board: args.board,
          profitCtx: args.profitCtx,
          now,
        })[1]
      )
    : [];

  const altScored =
    args.alternativeScored ??
    rankTruckCandidatesForJob({
      job: args.job,
      board: args.board,
      profitCtx: args.profitCtx,
      now,
    }).filter((c) => c.lane.truck_id !== args.lane.truck_id);

  return {
    valid: true,
    validationId: buildValidationId(snapshotId, args.lane.truck_id, args.job.id),
    snapshotId,
    jobId: args.job.id,
    truckId: args.lane.truck_id,
    jobTitle: args.job.title,
    unitNumber: args.lane.unit_number,
    blockingReasons: [],
    warnings,
    expectedContribution: scored?.profit.estimated_contribution ?? null,
    estimatedDeadheadMiles: scored?.deadhead?.miles ?? null,
    estimatedDriveMinutes: travelMinutes,
    eta: computeEta(args.job, travelMinutes, now),
    confidence: scored ? confidenceForCandidate(scored, 0) : 70,
    alternatives: altScored.slice(0, 3).map((c) =>
      truckAlternativeFromScored(c, args.job, args.board, scored ?? undefined)
    ),
    explanation: explanation.slice(0, 4),
    utilizationImpact: scored
      ? utilizationImpactLabelForJob(args.lane, args.job, scored)
      : null,
    overtimeRisk: scored ? overtimeRiskLabel(scored) : null,
    slaImpact: slaImpactLabel(args.job, travelMinutes, now),
  };
}

export function buildSyntheticRecommendation(args: {
  tenantId: string;
  job: FleetDispatchJob;
  board: FleetDispatchBoardData;
  profitCtx: ProfitabilityContext;
}): FleetRecommendationInstance | null {
  const scored = rankTruckCandidatesForJob({
    job: args.job,
    board: args.board,
    profitCtx: args.profitCtx,
  });
  const best = scored[0];
  if (!best) return null;

  const alt = scored[1];
  const reasons = buildProfitabilityReasons(best, alt);
  const snapshotHash = hashOperationalSnapshot(args.board);
  const candidateSnapshots = scored.slice(0, 3).map((candidate, index) =>
    scoredCandidateToSnapshot(candidate, args.job, args.board, index + 1)
  );

  return {
    id: `synthetic-${args.job.id}`,
    tenant_id: args.tenantId,
    branch_id: args.job.branch_id,
    recommendation_type: "truck_assignment",
    status: "pending",
    lifecycle: "ready",
    score: best.score,
    rationale: {
      title: `Assign ${best.lane.unit_number} to ${args.job.title}`,
      reasons,
      factors: best.factors,
      entities: {
        job_id: args.job.id,
        truck_id: best.lane.truck_id,
      },
      candidates: scored.slice(0, 3).map((candidate) => ({
        truck_id: candidate.lane.truck_id,
        unit_number: candidate.lane.unit_number,
        score: candidate.score,
      })),
      candidate_snapshots: candidateSnapshots,
      job_snapshot: buildJobSnapshot(args.job),
      generated_at: new Date().toISOString(),
      board_date: args.board.date,
      snapshot_hash: snapshotHash,
    },
    engine_version: FLEET_RECOMMENDATION_ENGINE_VERSION,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
  };
}

export async function loadAssignmentContext(
  supabase: SupabaseClient,
  tenantId: string,
  date: string,
  branchId?: string | null
): Promise<{
  board: FleetDispatchBoardData;
  profitCtx: ProfitabilityContext;
  snapshotId: string;
}> {
  const board = await loadFleetDispatchBoardData(supabase, tenantId, date, branchId ?? null);
  const profitCtx = await loadProfitabilityContext(supabase, tenantId, branchId ?? null, date);
  return {
    board,
    profitCtx,
    snapshotId: hashOperationalSnapshot(board),
  };
}

export async function suggestAssignmentForJob(args: {
  supabase: SupabaseClient;
  tenantId: string;
  jobId: string;
  date: string;
  branchId?: string | null;
  pendingRecommendations?: FleetRecommendationInstance[];
}): Promise<AssignmentSuggestResult> {
  const { board, profitCtx, snapshotId } = await loadAssignmentContext(
    args.supabase,
    args.tenantId,
    args.date,
    args.branchId
  );

  const job = board.jobs.find((j) => j.id === args.jobId);
  if (!job) {
    return {
      snapshotId,
      jobId: args.jobId,
      validation: null,
      recommendation: null,
      displayRecommendation: null,
      alternatives: [],
    };
  }

  const pending =
    args.pendingRecommendations?.find((r) => r.rationale.entities.job_id === args.jobId) ?? null;

  const scored = rankTruckCandidatesForJob({ job, board, profitCtx });
  const best = scored[0];
  const lane = best?.lane ?? board.truckLanes.find((l) => l.truck_id === pending?.rationale.entities.truck_id);

  let validation: AssignmentValidationResult | null = null;
  if (lane) {
    validation = validateFleetAssignmentPair({
      job,
      lane,
      board,
      profitCtx,
      scored: best,
      alternativeScored: scored.slice(1, 4),
    });
  }

  const displayRecommendation =
    pending ?? buildSyntheticRecommendation({ tenantId: args.tenantId, job, board, profitCtx });

  return {
    snapshotId,
    jobId: args.jobId,
    validation,
    recommendation: pending,
    displayRecommendation,
    alternatives:
      validation?.alternatives ??
      scored.slice(1, 4).map((c) => truckAlternativeFromScored(c, job, board, best)),
  };
}

export async function suggestAssignmentForTruck(args: {
  supabase: SupabaseClient;
  tenantId: string;
  truckId: string;
  date: string;
  branchId?: string | null;
}): Promise<AssignmentSuggestResult> {
  const { board, profitCtx, snapshotId } = await loadAssignmentContext(
    args.supabase,
    args.tenantId,
    args.date,
    args.branchId
  );

  const lane = board.truckLanes.find((l) => l.truck_id === args.truckId);
  if (!lane) {
    return {
      snapshotId,
      truckId: args.truckId,
      validation: null,
      recommendation: null,
      displayRecommendation: null,
      alternatives: [],
    };
  }

  const ranked = board.unassignedJobs
    .map((job) => {
      const candidate = rankTruckCandidatesForJob({ job, board, profitCtx }).find(
        (c) => c.lane.truck_id === lane.truck_id
      );
      return candidate ? { job, candidate } : null;
    })
    .filter((row): row is { job: FleetDispatchJob; candidate: ScoredCandidate } => row != null)
    .sort((a, b) => b.candidate.score - a.candidate.score);

  const best = ranked[0];
  let validation: AssignmentValidationResult | null = null;
  if (best) {
    validation = validateFleetAssignmentPair({
      job: best.job,
      lane,
      board,
      profitCtx,
      scored: best.candidate,
      alternativeScored: ranked.slice(1, 4).map((r) => r.candidate),
    });
  }

  const jobAlternatives = ranked.slice(0, 3).map((row, index) =>
    jobAlternativeFromScored(row.job, row.candidate, ranked[index + 1]?.candidate)
  );

  return {
    snapshotId,
    truckId: args.truckId,
    validation,
    recommendation: null,
    displayRecommendation: best
      ? buildSyntheticRecommendation({
          tenantId: args.tenantId,
          job: best.job,
          board,
          profitCtx,
        })
      : null,
    alternatives: jobAlternatives,
  };
}

export function previewInvalidAssignment(args: {
  job: FleetDispatchJob;
  lane: FleetDispatchTruckLane;
  board: FleetDispatchBoardData;
}): AssignmentValidationResult {
  const now = operationalNowForBoard(args.board);
  const snapshotId = hashOperationalSnapshot(args.board);
  const jobCheck = isJobAssignable(args.job, args.board, now);
  if (!jobCheck.ok) {
    return {
      valid: false,
      validationId: buildValidationId(snapshotId, args.lane.truck_id, args.job.id),
      snapshotId,
      jobId: args.job.id,
      truckId: args.lane.truck_id,
      jobTitle: args.job.title,
      unitNumber: args.lane.unit_number,
      blockingReasons: [{ code: jobCheck.code, message: jobCheck.message }],
      warnings: [],
      expectedContribution: null,
      estimatedDeadheadMiles: null,
      estimatedDriveMinutes: null,
      eta: null,
      confidence: 0,
      alternatives: [],
      explanation: [jobCheck.message],
      utilizationImpact: null,
      overtimeRisk: null,
      slaImpact: null,
    };
  }

  const constraint = evaluateTruckJobHardConstraints({
    job: args.job,
    lane: args.lane,
    board: args.board,
    now,
  });

  return {
    valid: false,
    validationId: buildValidationId(snapshotId, args.lane.truck_id, args.job.id),
    snapshotId,
    jobId: args.job.id,
    truckId: args.lane.truck_id,
    jobTitle: args.job.title,
    unitNumber: args.lane.unit_number,
    blockingReasons: constraint.ok ? [] : [{ code: constraint.code, message: constraint.message }],
    warnings: [],
    expectedContribution: null,
    estimatedDeadheadMiles: null,
    estimatedDriveMinutes: null,
    eta: null,
    confidence: 0,
    alternatives: [],
    explanation: constraint.ok ? [] : [constraint.message],
    utilizationImpact: null,
    overtimeRisk: null,
    slaImpact: null,
  };
}

export async function commitFleetAssignment(
  supabase: SupabaseClient,
  tenantId: string,
  input: CommitAssignmentInput
): Promise<CommitAssignmentResult> {
  const parsed = parseValidationId(input.validationId);
  if (
    !parsed ||
    parsed.truckId !== input.truckId ||
    parsed.jobId !== input.jobId
  ) {
    throw new Error("Invalid validation token.");
  }

  const { board, profitCtx, snapshotId } = await loadAssignmentContext(
    supabase,
    tenantId,
    input.date,
    input.branchId
  );

  if (snapshotId !== input.snapshotId || snapshotId !== parsed.snapshotId) {
    throw new Error("Operational snapshot changed — please revalidate before assigning.");
  }

  const job = board.jobs.find((j) => j.id === input.jobId);
  const lane = board.truckLanes.find((l) => l.truck_id === input.truckId);
  if (!job || !lane) {
    throw new Error("Job or truck is no longer on the dispatch board.");
  }

  const validation = validateFleetAssignmentPair({ job, lane, board, profitCtx });
  if (!validation.valid) {
    throw new Error(validation.blockingReasons[0]?.message ?? "Assignment is no longer valid.");
  }

  const { data: jobRow, error: jobFetchError } = await supabase
    .from("fleet_jobs")
    .select("id, assigned_truck_id, status, tenant_id")
    .eq("id", input.jobId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (jobFetchError) throw new Error(jobFetchError.message);
  if (!jobRow) throw new Error("Job not found.");

  const assigned = (jobRow as { assigned_truck_id: string | null }).assigned_truck_id;
  if (assigned && assigned !== input.truckId) {
    throw new Error("Job was assigned to another truck before commit.");
  }

  if (
    input.recommendationId &&
    !input.recommendationId.startsWith("synthetic-")
  ) {
    await applyRecommendationOutcome(supabase, tenantId, {
      recommendationId: input.recommendationId,
      action: "accepted",
      actedBy: input.actedBy ?? null,
      boardDate: input.date,
    });

    return {
      success: true,
      jobId: input.jobId,
      truckId: input.truckId,
      unitNumber: lane.unit_number,
      jobTitle: job.title,
      recommendationId: input.recommendationId,
      assignmentSource: input.assignmentSource,
    };
  }

  const { data: pendingRecs, error: recListError } = await supabase
    .from("recommendation_instances")
    .select("id, rationale")
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  if (recListError) throw new Error(recListError.message);

  const matchingRec = (pendingRecs ?? []).find((row) => {
    const rationale = row.rationale as { entities?: { job_id?: string } };
    return rationale.entities?.job_id === input.jobId;
  });

  if (matchingRec?.id) {
    const linkedRecId = matchingRec.id as string;
    await applyRecommendationOutcome(supabase, tenantId, {
      recommendationId: linkedRecId,
      action: "accepted",
      actedBy: input.actedBy ?? null,
      boardDate: input.date,
    });

    return {
      success: true,
      jobId: input.jobId,
      truckId: input.truckId,
      unitNumber: lane.unit_number,
      jobTitle: job.title,
      recommendationId: linkedRecId,
      assignmentSource: input.assignmentSource,
    };
  }

  const { error: assignError } = await supabase
    .from("fleet_jobs")
    .update({
      assigned_truck_id: input.truckId,
      status: "scheduled",
    })
    .eq("id", input.jobId)
    .eq("tenant_id", tenantId)
    .in("status", ["unassigned", "scheduled"]);

  if (assignError) throw new Error(assignError.message);

  return {
    success: true,
    jobId: input.jobId,
    truckId: input.truckId,
    unitNumber: lane.unit_number,
    jobTitle: job.title,
    recommendationId: null,
    assignmentSource: input.assignmentSource,
  };
}
