import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import { filterEligibleTrucksForJob, operationalNowForBoard } from "./constraints";
import {
  finalizeCandidateScores,
  scoreTruckForJob,
  type ScoredCandidate,
} from "./profitability-scoring";

export type OperationalSnapshot = {
  board: FleetDispatchBoardData;
  captured_at: string;
  snapshot_version: string;
};

export function captureOperationalSnapshot(board: FleetDispatchBoardData): OperationalSnapshot {
  return {
    board,
    captured_at: new Date().toISOString(),
    snapshot_version: board.date,
  };
}

/** Constraint engine → eligible pool → scoring → ranking */
export function rankTruckCandidatesForJob(args: {
  job: FleetDispatchJob;
  board: FleetDispatchBoardData;
  profitCtx: ProfitabilityContext;
  now?: Date;
}): ScoredCandidate[] {
  const now = args.now ?? operationalNowForBoard(args.board);
  const eligible = filterEligibleTrucksForJob(
    args.job,
    args.board,
    now,
    args.profitCtx.rules
  );
  return finalizeCandidateScores(
    eligible.map((lane) =>
      scoreTruckForJob({
        job: args.job,
        lane,
        board: args.board,
        profitCtx: args.profitCtx,
      })
    )
  );
}

export function dedupeRecommendationsByJob(
  recommendations: FleetRecommendationInstance[]
): FleetRecommendationInstance[] {
  const byJob = new Map<string, FleetRecommendationInstance>();
  for (const rec of recommendations) {
    const jobId = rec.rationale.entities.job_id;
    if (!jobId) continue;
    const existing = byJob.get(jobId);
    if (!existing || rec.score > existing.score) {
      byJob.set(jobId, rec);
    }
  }
  return [...byJob.values()].sort((a, b) => b.score - a.score);
}

export function dedupeRecommendationsByJobAndType(
  recommendations: FleetRecommendationInstance[]
): FleetRecommendationInstance[] {
  const byKey = new Map<string, FleetRecommendationInstance>();
  for (const rec of recommendations) {
    const jobId = rec.rationale.entities.job_id ?? rec.id;
    const key = `${rec.recommendation_type}:${jobId}`;
    const existing = byKey.get(key);
    if (!existing || rec.score > existing.score) {
      byKey.set(key, rec);
    }
  }
  return [...byKey.values()].sort((a, b) => b.score - a.score);
}
