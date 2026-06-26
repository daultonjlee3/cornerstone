import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetRecommendationRecalculationReplacement,
  FleetRecommendationType,
} from "@/src/types/fleet";
import {
  buildJobSnapshot,
  scoredCandidateToSnapshot,
} from "./candidate-metrics";
import { buildProfitabilityReasons } from "./profitability-scoring";
import { rankTruckCandidatesForJob } from "./pipeline";
import { hashOperationalSnapshot } from "./snapshot-hash";
import { FLEET_RECOMMENDATION_ENGINE_VERSION } from "./constants";
import type { InvalidationSummary } from "./validation-engine";

export type CascadeRecommendationInsert = {
  tenant_id: string;
  branch_id: string;
  recommendation_type: FleetRecommendationType;
  status: "pending";
  score: number;
  lifecycle: "ready";
  rationale: {
    title: string;
    reasons: string[];
    factors: import("@/src/types/fleet").FleetRecommendationFactors;
    entities: { job_id: string; truck_id: string };
    candidates: Array<{ truck_id: string; unit_number: string; score: number }>;
    candidate_snapshots?: ReturnType<typeof scoredCandidateToSnapshot>[];
    job_snapshot?: ReturnType<typeof buildJobSnapshot>;
    generated_at: string;
    board_date: string;
    snapshot_hash: string;
    replaced_recommendation_id?: string;
    replacement_reason?: string;
  };
  engine_version: string;
  expires_at: string;
};

export function buildCascadeReplacementForJob(args: {
  tenantId: string;
  job: FleetDispatchJob;
  board: FleetDispatchBoardData;
  profitCtx: ProfitabilityContext;
  excludeTruckIds: string[];
  invalidated: InvalidationSummary;
  expiresAt: string;
}): { insert: CascadeRecommendationInsert; replacement: FleetRecommendationRecalculationReplacement } | null {
  const scored = rankTruckCandidatesForJob({
    job: args.job,
    board: args.board,
    profitCtx: args.profitCtx,
  }).filter((candidate) => !args.excludeTruckIds.includes(candidate.lane.truck_id));

  const best = scored[0];
  if (!best) return null;

  const alt = scored[1];
  const reasons = buildProfitabilityReasons(best, alt);
  reasons.unshift(
    `Replaced ${args.invalidated.previousUnitNumber ?? "previous truck"} after operational change (${args.invalidated.message}).`
  );

  const previousContribution =
    args.invalidated.previousContributionEstimate ?? null;
  const contributionDelta =
    previousContribution == null
      ? best.profit.estimated_contribution
      : Math.round((best.profit.estimated_contribution - previousContribution) * 100) / 100;

  const snapshotHash = hashOperationalSnapshot(args.board);
  const candidateSnapshots = scored.slice(0, 3).map((candidate, index) =>
    scoredCandidateToSnapshot(candidate, args.job, args.board, index + 1)
  );

  const insert: CascadeRecommendationInsert = {
    tenant_id: args.tenantId,
    branch_id: args.job.branch_id,
    recommendation_type: "truck_assignment",
    status: "pending",
    score: best.score,
    lifecycle: "ready",
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
      replaced_recommendation_id: args.invalidated.id,
      replacement_reason: args.invalidated.message,
    },
    engine_version: FLEET_RECOMMENDATION_ENGINE_VERSION,
    expires_at: args.expiresAt,
  };

  return {
    insert,
    replacement: {
      job_id: args.job.id,
      previous_unit_number: args.invalidated.previousUnitNumber,
      previous_truck_id: args.invalidated.previousTruckId,
      new_unit_number: best.lane.unit_number,
      new_truck_id: best.lane.truck_id,
      reason: args.invalidated.message,
      contribution_delta: contributionDelta,
      confidence: best.score,
      expected_contribution: best.profit.estimated_contribution,
    },
  };
}

export async function insertCascadeReplacement(
  supabase: SupabaseClient,
  insert: CascadeRecommendationInsert
): Promise<string | null> {
  const { data, error } = await supabase
    .from("recommendation_instances")
    .insert(insert)
    .select("id")
    .maybeSingle();
  if (error) return null;
  return (data as { id: string } | null)?.id ?? null;
}
