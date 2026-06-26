import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateDeadheadMiles } from "@/src/lib/fleet/marts/deadhead";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
import {
  buildRecommendationDecisionRecord,
} from "@/src/lib/fleet-recommendation-engine/explainability";
import {
  buildJobSnapshot,
  scoredCandidateToSnapshot,
} from "@/src/lib/fleet-recommendation-engine/candidate-metrics";
import {
  buildEstimatedImpactPayload,
  measureRecommendationOutcome,
} from "@/src/lib/fleet-recommendation-engine/outcome-tracking";
import { validateRecommendationAcceptance } from "@/src/lib/fleet-recommendation-engine/validate-recommendation";
import {
  attachValidationHealth,
  validateRecommendationInstance,
  type InvalidationSummary,
} from "@/src/lib/fleet-recommendation-engine/validation-engine";
import { evaluateTruckJobHardConstraints } from "@/src/lib/fleet-recommendation-engine/constraints";
import {
  dedupeRecommendationsByJobAndType,
  rankTruckCandidatesForJob,
} from "@/src/lib/fleet-recommendation-engine/pipeline";
import { buildCascadeReplacementForJob, insertCascadeReplacement } from "@/src/lib/fleet-recommendation-engine/cascade";
import {
  FLEET_RECOMMENDATION_ENGINE_VERSION,
  RECOMMENDATION_TTL_MS,
} from "@/src/lib/fleet-recommendation-engine/constants";
import { hashOperationalSnapshot } from "@/src/lib/fleet-recommendation-engine/snapshot-hash";
import { buildProfitabilityReasons } from "@/src/lib/fleet-recommendation-engine/profitability-scoring";
import { loadProfitabilityContext } from "@/src/lib/operational-profitability/queries";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import {
  clamp,
  computeCompositeScore,
  freshnessFactor,
  normalizeScore,
  parseJobHours,
  priorityWeight,
} from "@/src/lib/fleet-recommendation-engine/scoring-utils";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationFactors,
  FleetRecommendationHistoryEntry,
  FleetRecommendationInstance,
  FleetRecommendationOutcome,
  FleetRecommendationOutcomeAction,
  FleetRecommendationRationale,
  FleetRecommendationSummary,
  FleetRecommendationRecalculationNotice,
  FleetRecommendationRecalculationReplacement,
  FleetRecommendationsResponse,
  FleetRecommendationType,
  RecommendationLifecyclePhase,
} from "@/src/types/fleet";

export { FLEET_RECOMMENDATION_ENGINE_VERSION } from "@/src/lib/fleet-recommendation-engine/constants";
const MAX_TRUCK_ASSIGNMENT = 8;
const MAX_IDLE_MATCH = 8;
const MAX_CAPACITY_ALERTS = 4;

type RecommendationStatus =
  | "pending"
  | "accepted"
  | "dismissed"
  | "expired"
  | "applied"
  | "completed"
  | "failed";

type RecommendationInsert = {
  tenant_id: string;
  branch_id: string;
  recommendation_type: FleetRecommendationType;
  status: RecommendationStatus;
  lifecycle: RecommendationLifecyclePhase;
  score: number;
  rationale: FleetRecommendationRationale;
  engine_version: string;
  expires_at: string;
};

type RecommendationRow = {
  id: string;
  tenant_id: string;
  branch_id: string;
  recommendation_type: FleetRecommendationType;
  status: RecommendationStatus;
  lifecycle?: RecommendationLifecyclePhase;
  score: number;
  rationale: unknown;
  engine_version: string;
  created_at: string;
  expires_at: string;
};

type OutcomeRow = {
  id: string;
  recommendation_id: string;
  action: FleetRecommendationOutcomeAction;
  acted_by: string | null;
  acted_at: string;
  estimated_impact: Record<string, unknown> | null;
  notes: string | null;
};

function buildTruckAssignmentRecommendations(
  tenantId: string,
  board: FleetDispatchBoardData,
  expiresAt: string,
  profitCtx: ProfitabilityContext
): RecommendationInsert[] {
  const recommendations: RecommendationInsert[] = [];
  const sortedJobs = [...board.unassignedJobs].sort((a, b) => {
    const byPriority = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (byPriority !== 0) return byPriority;
    return a.id.localeCompare(b.id);
  });
  const highPriorityJobs = sortedJobs.filter((job) => {
    const p = priorityWeight(job.priority);
    return p >= 0.8;
  });
  const jobsForDirectAssignment =
    highPriorityJobs.length > 0 ? highPriorityJobs : sortedJobs.slice(0, 3);
  const snapshotHash = hashOperationalSnapshot(board);

  for (const job of jobsForDirectAssignment.slice(0, MAX_TRUCK_ASSIGNMENT)) {
    const scored = rankTruckCandidatesForJob({ job, board, profitCtx });

    const best = scored[0];
    if (!best) continue;
    const alt = scored[1];

    const reasons = buildProfitabilityReasons(best, alt);
    if (best.factors.capacityImpact >= 75) reasons.push("Branch capacity remains healthy after assignment.");
    if (best.factors.telematicsFreshness >= 90) reasons.push("GPS signal is current.");

    const title = `Assign ${best.lane.unit_number} to ${job.title}`;
    const candidateSnapshots = scored.slice(0, 3).map((candidate, index) =>
      scoredCandidateToSnapshot(candidate, job, board, index + 1)
    );
    recommendations.push({
      tenant_id: tenantId,
      branch_id: job.branch_id,
      recommendation_type: "truck_assignment",
      status: "pending",
      lifecycle: "ready",
      score: best.score,
      rationale: {
        title,
        reasons,
        factors: best.factors,
        entities: {
          job_id: job.id,
          truck_id: best.lane.truck_id,
        },
        candidates: scored.slice(0, 3).map((candidate) => ({
          truck_id: candidate.lane.truck_id,
          unit_number: candidate.lane.unit_number,
          score: candidate.score,
        })),
        candidate_snapshots: candidateSnapshots,
        job_snapshot: buildJobSnapshot(job),
        generated_at: new Date().toISOString(),
        board_date: board.date,
        snapshot_hash: snapshotHash,
      },
      engine_version: FLEET_RECOMMENDATION_ENGINE_VERSION,
      expires_at: expiresAt,
    });
  }

  return recommendations;
}

function buildCapacityOverloadRecommendations(
  tenantId: string,
  board: FleetDispatchBoardData,
  expiresAt: string
): RecommendationInsert[] {
  const overloaded = board.branchCapacity
    .filter((b) => b.available_truck_hours > 0 && b.committed_hours > b.available_truck_hours)
    .sort((a, b) => b.utilization - a.utilization || a.branch_id.localeCompare(b.branch_id))
    .slice(0, MAX_CAPACITY_ALERTS);
  const underutilized = [...board.branchCapacity]
    .filter((b) => b.available_truck_hours > 0 && b.utilization < 0.65)
    .sort((a, b) => a.utilization - b.utilization || a.branch_id.localeCompare(b.branch_id));

  const onlineRateByBranch = new Map<string, number>();
  const lanesByBranch = new Map<string, FleetDispatchTruckLane[]>();
  for (const lane of board.truckLanes) {
    const list = lanesByBranch.get(lane.branch_id) ?? [];
    list.push(lane);
    lanesByBranch.set(lane.branch_id, list);
  }
  for (const [branchId, lanes] of lanesByBranch) {
    const onlineCount = lanes.filter((lane) => lane.telematics_status === "online").length;
    onlineRateByBranch.set(branchId, lanes.length > 0 ? onlineCount / lanes.length : 0);
  }

  return overloaded.map((source) => {
    const target = underutilized.find((candidate) => candidate.branch_id !== source.branch_id) ?? null;
    const overloadPct = source.utilization * 100;
    const reliefPct = target ? (1 - target.utilization) * 100 : 0;

    const factors: FleetRecommendationFactors = {
      travelImpact: normalizeScore(target ? 70 : 45),
      utilizationImpact: normalizeScore(clamp(50 + reliefPct * 0.5)),
      capacityImpact: normalizeScore(clamp(60 + Math.max(0, overloadPct - 100) * 1.2)),
      telematicsFreshness: normalizeScore(
        clamp((onlineRateByBranch.get(source.branch_id) ?? 0.5) * 100)
      ),
    };

    const reasons = [
      `${source.branch_name} is over capacity (${source.committed_hours.toFixed(1)}h committed vs ${source.available_truck_hours.toFixed(1)}h available).`,
      target
        ? `${target.branch_name} has underutilized truck capacity available for balancing.`
        : "No underutilized branch was found; rebalance within this branch first.",
      "Rebalancing reduces utilization and branch overload risk.",
    ];

    return {
      tenant_id: tenantId,
      branch_id: source.branch_id,
      recommendation_type: "capacity_overload" as const,
      status: "pending" as const,
      lifecycle: "ready" as const,
      score: computeCompositeScore(factors),
      rationale: {
        title: target
          ? `Rebalance workload from ${source.branch_name} to ${target.branch_name}`
          : `Reduce overload in ${source.branch_name}`,
        reasons,
        factors,
        entities: {
          source_branch_id: source.branch_id,
          target_branch_id: target?.branch_id,
        },
        board_date: board.date,
        snapshot_hash: hashOperationalSnapshot(board),
      },
      engine_version: FLEET_RECOMMENDATION_ENGINE_VERSION,
      expires_at: expiresAt,
    };
  });
}

function buildIdleTruckMatchRecommendations(
  tenantId: string,
  board: FleetDispatchBoardData,
  expiresAt: string,
  jobIdsAlreadyRecommended: Set<string>
): RecommendationInsert[] {
  const idleTrucks = board.truckLanes
    .filter(
      (lane) =>
        lane.status === "active" &&
        lane.committed_hours <= 0.5 &&
        lane.utilization <= 0.2
    )
    .sort((a, b) => a.unit_number.localeCompare(b.unit_number));

  const availableJobs = board.unassignedJobs
    .filter((job) => !jobIdsAlreadyRecommended.has(job.id))
    .sort((a, b) => {
      const byPriority = priorityWeight(b.priority) - priorityWeight(a.priority);
      if (byPriority !== 0) return byPriority;
      return a.id.localeCompare(b.id);
    });

  const branchCapacityById = new Map(board.branchCapacity.map((b) => [b.branch_id, b]));
  const recommendations: RecommendationInsert[] = [];

  for (const lane of idleTrucks.slice(0, MAX_IDLE_MATCH)) {
    const eligibleJobs = availableJobs.filter((job) => {
      return evaluateTruckJobHardConstraints({ job, lane, board }).ok;
    });

    const scored = eligibleJobs
      .map((job) => {
        const estimatedHours = parseJobHours(job);
        const deadhead = estimateDeadheadMiles(
          { latitude: lane.latitude, longitude: lane.longitude },
          { latitude: job.site_latitude, longitude: job.site_longitude }
        );
        const travelMinutes = deadhead?.travelMinutes ?? 90;
        const travelImpact = clamp(100 - travelMinutes * 1.5);

        const projectedTruckUtilization =
          lane.available_hours > 0
            ? (lane.committed_hours + estimatedHours) / lane.available_hours
            : 1.5;
        const utilizationImpact = clamp(100 - projectedTruckUtilization * 60);

        const branchCapacity = branchCapacityById.get(job.branch_id);
        const projectedBranchUtilization =
          branchCapacity && branchCapacity.available_truck_hours > 0
            ? (branchCapacity.committed_hours + estimatedHours) /
              branchCapacity.available_truck_hours
            : projectedTruckUtilization;
        const capacityImpact = clamp(100 - projectedBranchUtilization * 70);
        const telematicsFreshness = freshnessFactor(lane.telematics_status);
        const priorityBoost = priorityWeight(job.priority) * 12;

        const factors: FleetRecommendationFactors = {
          travelImpact: normalizeScore(travelImpact),
          utilizationImpact: normalizeScore(utilizationImpact),
          capacityImpact: normalizeScore(capacityImpact),
          telematicsFreshness: normalizeScore(telematicsFreshness),
        };
        const score = normalizeScore(computeCompositeScore(factors) + priorityBoost);

        return { job, factors, score, deadhead };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTravel = a.deadhead?.travelMinutes ?? Number.MAX_SAFE_INTEGER;
        const bTravel = b.deadhead?.travelMinutes ?? Number.MAX_SAFE_INTEGER;
        if (aTravel !== bTravel) return aTravel - bTravel;
        return a.job.id.localeCompare(b.job.id);
      });

    const best = scored[0];
    if (!best) continue;
    jobIdsAlreadyRecommended.add(best.job.id);

    recommendations.push({
      tenant_id: tenantId,
      branch_id: best.job.branch_id,
      recommendation_type: "idle_truck_match",
      status: "pending",
      lifecycle: "ready",
      score: best.score,
      rationale: {
        title: `Match idle truck ${lane.unit_number} with ${best.job.title}`,
        reasons: [
          `${lane.unit_number} is currently underutilized and available.`,
          "Estimated travel impact is low for this match.",
          "Assignment increases utilization without introducing branch capacity risk.",
        ],
        factors: best.factors,
        entities: {
          job_id: best.job.id,
          truck_id: lane.truck_id,
        },
        board_date: board.date,
        snapshot_hash: hashOperationalSnapshot(board),
      },
      engine_version: FLEET_RECOMMENDATION_ENGINE_VERSION,
      expires_at: expiresAt,
    });
  }

  return recommendations;
}

export function buildFleetRecommendationsFromBoard(
  tenantId: string,
  board: FleetDispatchBoardData,
  expiresAt: string,
  profitCtx?: ProfitabilityContext
): RecommendationInsert[] {
  const ctx =
    profitCtx ??
    ({
      rules: {
        id: "",
        tenant_id: tenantId,
        company_id: tenantId,
        custom_rules: {},
        regular_hours_per_day: 8,
        regular_hours_per_week: 40,
        daily_overtime_threshold: 8,
        weekly_overtime_threshold: 40,
        overtime_multiplier: 1.5,
        double_time_threshold: 12,
        double_time_multiplier: 2,
        saturday_multiplier: 1.5,
        sunday_multiplier: 2,
        holiday_multiplier: 2,
        night_shift_premium: 0.15,
        travel_time_pay_multiplier: 1,
        default_operator_hourly_rate: 45,
        fuel_cost_per_mile: 0.85,
        idle_cost_per_hour: 35,
        truck_fixed_cost_per_hour: 28,
      },
      truckProfiles: new Map(),
      typeProfiles: new Map(),
      operatorDailyHours: new Map(),
      operatorWeeklyHours: new Map(),
    } satisfies ProfitabilityContext);

  const truckAssignment = buildTruckAssignmentRecommendations(tenantId, board, expiresAt, ctx);
  const truckAssignmentJobIds = new Set(
    truckAssignment
      .map((rec) => rec.rationale.entities.job_id)
      .filter((id): id is string => typeof id === "string")
  );
  const capacityOverload = buildCapacityOverloadRecommendations(tenantId, board, expiresAt);
  const idleTruckMatch = buildIdleTruckMatchRecommendations(
    tenantId,
    board,
    expiresAt,
    truckAssignmentJobIds
  );

  return [...truckAssignment, ...capacityOverload, ...idleTruckMatch].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.recommendation_type !== b.recommendation_type) {
      return a.recommendation_type.localeCompare(b.recommendation_type);
    }
    return a.branch_id.localeCompare(b.branch_id);
  });
}

function normalizeRationale(raw: unknown): FleetRecommendationRationale {
  if (raw && typeof raw === "object") {
    return raw as FleetRecommendationRationale;
  }
  return {
    title: "Recommendation",
    reasons: [],
    factors: {
      travelImpact: 0,
      utilizationImpact: 0,
      capacityImpact: 0,
      telematicsFreshness: 0,
    },
    entities: {},
  };
}

function mapRecommendationRow(row: RecommendationRow): FleetRecommendationInstance {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    branch_id: row.branch_id,
    recommendation_type: row.recommendation_type,
    status: row.status,
    lifecycle: row.lifecycle,
    score: Number(row.score),
    rationale: normalizeRationale(row.rationale),
    engine_version: row.engine_version,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

function mapOutcomeRow(row: OutcomeRow & { measured_impact?: Record<string, unknown> | null; application_error?: string | null }): FleetRecommendationOutcome {
  return {
    id: row.id,
    recommendation_id: row.recommendation_id,
    action: row.action,
    acted_by: row.acted_by,
    acted_at: row.acted_at,
    estimated_impact: row.estimated_impact ?? {},
    measured_impact: row.measured_impact ?? {},
    application_error: row.application_error ?? null,
    notes: row.notes,
  };
}

function summarizeRecommendations(
  pending: FleetRecommendationInstance[],
  history: FleetRecommendationHistoryEntry[]
): FleetRecommendationSummary {
  const accepted = history.filter((h) => h.status === "accepted").length;
  const dismissed = history.filter((h) => h.status === "dismissed").length;
  const expired = history.filter((h) => h.status === "expired").length;
  const acted = accepted + dismissed;
  const volume = pending.length + history.length;
  return {
    volume,
    accepted,
    dismissed,
    expired,
    acceptanceRate: acted > 0 ? normalizeScore((accepted / acted) * 100) : null,
    dismissalRate: acted > 0 ? normalizeScore((dismissed / acted) * 100) : null,
  };
}

async function expireStalePendingRecommendations(
  supabase: SupabaseClient,
  tenantId: string,
  branchId?: string | null
): Promise<void> {
  let query = supabase
    .from("recommendation_instances")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
  if (branchId) query = query.eq("branch_id", branchId);

  const { data } = await query;
  const ids = (data ?? []).map((row) => (row as { id: string }).id);
  if (ids.length === 0) return;

  await supabase
    .from("recommendation_instances")
    .update({ status: "expired", lifecycle: "expired" })
    .in("id", ids)
    .eq("tenant_id", tenantId);

  await supabase.from("recommendation_outcomes").insert(
    ids.map((recommendationId) => ({
      recommendation_id: recommendationId,
      action: "expired" as FleetRecommendationOutcomeAction,
      acted_by: null,
      notes: "Expired automatically by recommendation engine TTL.",
      estimated_impact: {},
    }))
  );
}

async function loadPendingRecommendations(
  supabase: SupabaseClient,
  tenantId: string,
  branchId?: string | null
): Promise<FleetRecommendationInstance[]> {
  let query = supabase
    .from("recommendation_instances")
    .select(
      "id, tenant_id, branch_id, recommendation_type, status, lifecycle, score, rationale, engine_version, created_at, expires_at"
    )
    .eq("tenant_id", tenantId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .eq("engine_version", FLEET_RECOMMENDATION_ENGINE_VERSION)
    .order("score", { ascending: false })
    .order("created_at", { ascending: false });
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRecommendationRow(row as RecommendationRow));
}

async function loadRecommendationHistory(
  supabase: SupabaseClient,
  tenantId: string,
  branchId?: string | null
): Promise<FleetRecommendationHistoryEntry[]> {
  let query = supabase
    .from("recommendation_instances")
    .select(
      "id, tenant_id, branch_id, recommendation_type, status, score, rationale, engine_version, created_at, expires_at, recommendation_outcomes(id, recommendation_id, action, acted_by, acted_at, estimated_impact, measured_impact, application_error, notes)"
    )
    .eq("tenant_id", tenantId)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(30);
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const mapped = mapRecommendationRow(row as RecommendationRow);
    const outcomes = (((row as Record<string, unknown>).recommendation_outcomes ?? []) as OutcomeRow[])
      .map((outcome) => mapOutcomeRow(outcome))
      .sort((a, b) => Date.parse(b.acted_at) - Date.parse(a.acted_at));
    return { ...mapped, latest_outcome: outcomes[0] ?? null };
  });
}

async function expirePendingForRegeneration(
  supabase: SupabaseClient,
  tenantId: string,
  branchId?: string | null
): Promise<void> {
  let query = supabase
    .from("recommendation_instances")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "pending");
  if (branchId) query = query.eq("branch_id", branchId);

  const { data } = await query;
  const ids = (data ?? []).map((row) => (row as { id: string }).id);
  if (ids.length === 0) return;

  await supabase
    .from("recommendation_instances")
    .update({ status: "expired", lifecycle: "expired" })
    .in("id", ids)
    .eq("tenant_id", tenantId);
}

async function markRecommendationInvalid(
  supabase: SupabaseClient,
  tenantId: string,
  recommendation: FleetRecommendationInstance,
  code: string,
  message: string
): Promise<void> {
  await supabase
    .from("recommendation_instances")
    .update({ status: "failed", lifecycle: "failed" })
    .eq("id", recommendation.id)
    .eq("tenant_id", tenantId);

  await supabase.from("recommendation_outcomes").insert({
    recommendation_id: recommendation.id,
    action: "failed",
    acted_by: null,
    notes: "Invalidated by read-time validation pipeline.",
    application_error: message,
    estimated_impact: { failure_code: code, phase: "pre_display" },
    measured_impact: {},
  });
}

async function partitionValidatedPending(
  supabase: SupabaseClient,
  tenantId: string,
  pending: FleetRecommendationInstance[],
  board: FleetDispatchBoardData,
  profitCtx: ProfitabilityContext,
  expiresAt: string
): Promise<{
  valid: FleetRecommendationInstance[];
  invalidated: InvalidationSummary[];
  replacements: FleetRecommendationRecalculationReplacement[];
}> {
  const valid: FleetRecommendationInstance[] = [];
  const invalidated: InvalidationSummary[] = [];
  const replacements: FleetRecommendationRecalculationReplacement[] = [];

  for (const rec of pending) {
    const result = validateRecommendationInstance({
      recommendation: rec,
      board,
      lifecycle: "validating",
    });
    if (result.ok) {
      valid.push(attachValidationHealth(rec, board));
      continue;
    }

    const truckId =
      rec.rationale.entities.truck_id ?? rec.rationale.candidates?.[0]?.truck_id;
    const lane = truckId ? board.truckLanes.find((l) => l.truck_id === truckId) : undefined;
    const jobId = rec.rationale.entities.job_id;
    const previousContribution =
      rec.rationale.candidate_snapshots?.[0]?.estimated_contribution ?? null;

    const summary: InvalidationSummary = {
      id: rec.id,
      code: result.code,
      message: result.message,
      previousTruckId: truckId,
      previousUnitNumber: lane?.unit_number ?? rec.rationale.candidates?.[0]?.unit_number,
      previousContributionEstimate: previousContribution,
      jobId,
    };
    invalidated.push(summary);
    await markRecommendationInvalid(supabase, tenantId, rec, result.code, result.message);

    if (
      rec.recommendation_type === "truck_assignment" &&
      jobId &&
      truckId
    ) {
      const job = board.jobs.find((j) => j.id === jobId);
      if (job) {
        const cascade = buildCascadeReplacementForJob({
          tenantId,
          job,
          board,
          profitCtx,
          excludeTruckIds: [truckId],
          invalidated: summary,
          expiresAt,
        });
        if (cascade) {
          const newId = await insertCascadeReplacement(supabase, cascade.insert);
          if (newId) {
            replacements.push(cascade.replacement);
            const replacementInstance: FleetRecommendationInstance = {
              id: newId,
              tenant_id: tenantId,
              branch_id: cascade.insert.branch_id,
              recommendation_type: "truck_assignment",
              status: "pending",
              lifecycle: "ready",
              score: cascade.insert.score,
              rationale: cascade.insert.rationale,
              engine_version: cascade.insert.engine_version,
              created_at: new Date().toISOString(),
              expires_at: cascade.insert.expires_at,
            };
            valid.push(attachValidationHealth(replacementInstance, board));
          }
        }
      }
    }
  }

  return { valid, invalidated, replacements };
}

function buildRecalculationNotice(
  invalidated: InvalidationSummary[],
  replacedCount: number,
  replacements: FleetRecommendationRecalculationReplacement[] = []
): FleetRecommendationRecalculationNotice | undefined {
  if (invalidated.length === 0) return undefined;
  const first = invalidated[0];
  const firstReplacement = replacements[0];
  const unit = first.previousUnitNumber ?? "Recommended truck";
  return {
    message:
      replacements.length === 1 && firstReplacement?.new_unit_number
        ? `${unit} became unavailable after recommendations were generated. Cornerstone recalculated automatically.`
        : invalidated.length === 1
          ? `${unit} became unavailable after recommendations were generated. Cornerstone recalculated automatically.`
          : `${invalidated.length} recommendations were outdated. Cornerstone recalculated from the latest operational snapshot.`,
    invalidated_count: invalidated.length,
    replaced_count: replacedCount,
    replacements,
    details: invalidated.slice(0, 3).map((item) => ({
      previous_unit_number: item.previousUnitNumber,
      reason: item.message,
    })),
  };
}

async function markDisplayed(
  supabase: SupabaseClient,
  tenantId: string,
  recommendations: FleetRecommendationInstance[]
): Promise<FleetRecommendationInstance[]> {
  const ids = recommendations.map((rec) => rec.id);
  if (ids.length > 0) {
    await supabase
      .from("recommendation_instances")
      .update({ lifecycle: "displayed" })
      .in("id", ids)
      .eq("tenant_id", tenantId);
  }

  return recommendations.map((rec) => ({
    ...rec,
    lifecycle: "displayed" as const,
    rationale: {
      ...rec.rationale,
      validation_health: rec.rationale.validation_health
        ? { ...rec.rationale.validation_health, lifecycle: "displayed" as const }
        : undefined,
    },
  }));
}

async function generateAndLoadPending(
  supabase: SupabaseClient,
  tenantId: string,
  board: FleetDispatchBoardData,
  branchId: string | null,
  date: string,
  profitCtx: ProfitabilityContext,
  expiresAt: string
): Promise<FleetRecommendationInstance[]> {
  const generated = buildFleetRecommendationsFromBoard(tenantId, board, expiresAt, profitCtx);
  if (generated.length > 0) {
    const { error } = await supabase.from("recommendation_instances").insert(generated);
    if (error) {
      const existing = await loadPendingRecommendations(supabase, tenantId, branchId);
      if (existing.length > 0) return existing;
      throw new Error(error.message);
    }
  }
  return loadPendingRecommendations(supabase, tenantId, branchId);
}

export async function getFleetRecommendations(
  supabase: SupabaseClient,
  tenantId: string,
  options?: {
    branchId?: string | null;
    date?: string;
    forceRefresh?: boolean;
  }
): Promise<FleetRecommendationsResponse> {
  const branchId = options?.branchId ?? null;
  const date = options?.date ?? new Date().toISOString().slice(0, 10);

  await expireStalePendingRecommendations(supabase, tenantId, branchId);

  const board = await loadFleetDispatchBoardData(supabase, tenantId, date, branchId);
  const profitCtx = await loadProfitabilityContext(supabase, tenantId, null, date);
  const expiresAt = new Date(Date.now() + RECOMMENDATION_TTL_MS).toISOString();

  if (options?.forceRefresh) {
    await expirePendingForRegeneration(supabase, tenantId, branchId);
  }

  let pending = await loadPendingRecommendations(supabase, tenantId, branchId);
  const wrongBoardDate = pending.filter(
    (rec) => rec.rationale.board_date && rec.rationale.board_date !== date
  );
  for (const rec of wrongBoardDate) {
    await markRecommendationInvalid(
      supabase,
      tenantId,
      rec,
      "board_date_mismatch",
      `Recommendation was generated for ${rec.rationale.board_date} but the board date is ${date}.`
    );
  }
  pending = pending.filter(
    (rec) => !rec.rationale.board_date || rec.rationale.board_date === date
  );
  let invalidated: InvalidationSummary[] = wrongBoardDate.map((rec) => ({
    id: rec.id,
    code: "board_date_mismatch",
    message: `Recommendation was generated for ${rec.rationale.board_date} but the board date is ${date}.`,
    previousTruckId: rec.rationale.entities.truck_id,
    previousUnitNumber: rec.rationale.candidates?.[0]?.unit_number,
    previousContributionEstimate:
      rec.rationale.candidate_snapshots?.[0]?.estimated_contribution ?? null,
    jobId: rec.rationale.entities.job_id,
  }));
  let replacements: FleetRecommendationRecalculationReplacement[] = [];

  if (pending.length > 0) {
    const partition = await partitionValidatedPending(
      supabase,
      tenantId,
      pending,
      board,
      profitCtx,
      expiresAt
    );
    pending = dedupeRecommendationsByJobAndType(partition.valid);
    invalidated = partition.invalidated;
    replacements = partition.replacements;
  }

  const needsRegeneration = pending.length === 0;
  if (needsRegeneration) {
    pending = await generateAndLoadPending(
      supabase,
      tenantId,
      board,
      branchId,
      date,
      profitCtx,
      expiresAt
    );
    const partition = await partitionValidatedPending(
      supabase,
      tenantId,
      pending,
      board,
      profitCtx,
      expiresAt
    );
    pending = dedupeRecommendationsByJobAndType(partition.valid);
    invalidated = [...invalidated, ...partition.invalidated];
    replacements = [...replacements, ...partition.replacements];
  }

  const replacedCount = replacements.length;
  const recalculationNotice = buildRecalculationNotice(invalidated, replacedCount, replacements);
  pending = await markDisplayed(supabase, tenantId, pending);

  const history = await loadRecommendationHistory(supabase, tenantId, branchId);
  const summary = summarizeRecommendations(pending, history);

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
    pending,
    history,
    summary,
    recalculationNotice,
  };
}

export async function applyRecommendationOutcome(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    recommendationId: string;
    action: Exclude<FleetRecommendationOutcomeAction, "expired" | "applied" | "failed">;
    actedBy: string | null;
    notes?: string | null;
    /** Dispatch board date (YYYY-MM-DD) — must match the date shown on the dispatch console */
    boardDate?: string | null;
  }
): Promise<FleetRecommendationInstance> {
  const { data: row, error } = await supabase
    .from("recommendation_instances")
    .select(
      "id, tenant_id, branch_id, recommendation_type, status, lifecycle, score, rationale, engine_version, created_at, expires_at"
    )
    .eq("tenant_id", tenantId)
    .eq("id", input.recommendationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Recommendation not found.");

  const recommendation = mapRecommendationRow(row as RecommendationRow);
  if (recommendation.status !== "pending") {
    throw new Error("Recommendation is no longer pending.");
  }

  const date =
    input.boardDate?.trim() ||
    recommendation.rationale.board_date ||
    new Date().toISOString().slice(0, 10);
  const board = await loadFleetDispatchBoardData(supabase, tenantId, date, recommendation.branch_id);
  const profitCtx = await loadProfitabilityContext(supabase, tenantId, null, date);

  if (input.action === "accepted") {
    const validation = validateRecommendationAcceptance({ recommendation, board });
    if (!validation.ok) {
      await supabase
        .from("recommendation_instances")
        .update({ status: "failed" })
        .eq("id", recommendation.id)
        .eq("tenant_id", tenantId);

      await supabase.from("recommendation_outcomes").insert({
        recommendation_id: recommendation.id,
        action: "failed",
        acted_by: input.actedBy,
        notes: input.notes ?? null,
        application_error: validation.message,
        estimated_impact: { failure_code: validation.code },
        measured_impact: {},
      });

      throw new Error(validation.message);
    }
  }

  const decisionRecord = buildRecommendationDecisionRecord(recommendation, board, {
    action: input.action,
    actedBy: input.actedBy,
    profitCtx,
  });

  const snapshots = recommendation.rationale.candidate_snapshots ?? [];
  const primarySnapshot = snapshots[0] ?? null;
  const altSnapshot = snapshots[1] ?? null;
  const explanation = decisionRecord.projected_outcome;

  let assignmentApplied = false;
  let nextStatus: RecommendationStatus =
    input.action === "accepted" ? "accepted" : "dismissed";

  if (input.action === "accepted") {
    const jobId = recommendation.rationale.entities.job_id;
    const truckId =
      recommendation.rationale.entities.truck_id ??
      recommendation.rationale.candidates?.[0]?.truck_id;

    if (
      jobId &&
      truckId &&
      (recommendation.recommendation_type === "truck_assignment" ||
        recommendation.recommendation_type === "idle_truck_match")
    ) {
      const { data: jobRow, error: jobFetchError } = await supabase
        .from("fleet_jobs")
        .select("id, assigned_truck_id, status")
        .eq("id", jobId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (jobFetchError) throw new Error(jobFetchError.message);

      if (
        jobRow &&
        (jobRow as { assigned_truck_id: string | null }).assigned_truck_id &&
        (jobRow as { assigned_truck_id: string | null }).assigned_truck_id !== truckId
      ) {
        const message = "Job was assigned to another truck before this recommendation could be applied.";
        await supabase
          .from("recommendation_instances")
          .update({ status: "failed" })
          .eq("id", recommendation.id)
          .eq("tenant_id", tenantId);
        await supabase.from("recommendation_outcomes").insert({
          recommendation_id: recommendation.id,
          action: "failed",
          acted_by: input.actedBy,
          application_error: message,
          estimated_impact: { failure_code: "job_already_assigned" },
          measured_impact: {},
        });
        throw new Error(message);
      }

      const { error: assignError } = await supabase
        .from("fleet_jobs")
        .update({
          assigned_truck_id: truckId,
          status: "scheduled",
        })
        .eq("id", jobId)
        .eq("tenant_id", tenantId)
        .in("status", ["unassigned", "scheduled"]);

      if (assignError) {
        await supabase
          .from("recommendation_instances")
          .update({ status: "failed" })
          .eq("id", recommendation.id)
          .eq("tenant_id", tenantId);
        await supabase.from("recommendation_outcomes").insert({
          recommendation_id: recommendation.id,
          action: "failed",
          acted_by: input.actedBy,
          application_error: assignError.message,
          estimated_impact: {},
          measured_impact: {},
        });
        throw new Error(assignError.message);
      }

      assignmentApplied = true;
      nextStatus = "applied";
    } else if (recommendation.recommendation_type === "capacity_overload") {
      nextStatus = "accepted";
    }
  }

  const { error: updateError } = await supabase
    .from("recommendation_instances")
    .update({
      status: nextStatus,
      lifecycle: input.action === "accepted" ? "accepted" : "rejected",
    })
    .eq("id", recommendation.id)
    .eq("tenant_id", tenantId);
  if (updateError) throw new Error(updateError.message);

  const job = recommendation.rationale.entities.job_id
    ? board.jobs.find((j) => j.id === recommendation.rationale.entities.job_id)
    : undefined;

  const measuredImpact = measureRecommendationOutcome({
    job: job
      ? {
          ...job,
          assigned_truck_id:
            assignmentApplied
              ? recommendation.rationale.entities.truck_id ?? job.assigned_truck_id
              : job.assigned_truck_id,
          status: assignmentApplied ? "scheduled" : job.status,
        }
      : null,
    recommendedTruckId: recommendation.rationale.entities.truck_id ?? null,
    estimatedTravelMinutes: primarySnapshot?.travel_minutes ?? null,
    estimatedContribution: primarySnapshot?.estimated_contribution ?? null,
    estimatedDeadheadMiles: primarySnapshot?.deadhead_miles ?? null,
    scheduledStart: job?.scheduled_start ?? null,
  });

  const estimatedImpactPayload = buildEstimatedImpactPayload({
    recommendation,
    decisionRecord: decisionRecord as unknown as Record<string, unknown>,
    projectedOutcome: explanation,
    primarySnapshot,
    altSnapshot,
    actedBy: input.actedBy,
    assignmentApplied,
    outcomeStatus: nextStatus,
  });

  const estimatedImpact = {
    score: recommendation.score,
    decision_record: decisionRecord,
    ...estimatedImpactPayload,
  };

  const { error: outcomeError } = await supabase.from("recommendation_outcomes").insert({
    recommendation_id: recommendation.id,
    action: input.action,
    acted_by: input.actedBy,
    notes: input.notes ?? null,
    estimated_impact: estimatedImpact,
    measured_impact: measuredImpact,
  });
  if (outcomeError) throw new Error(outcomeError.message);

  if (assignmentApplied) {
    await supabase.from("recommendation_outcomes").insert({
      recommendation_id: recommendation.id,
      action: "applied",
      acted_by: input.actedBy,
      notes: "Truck assignment applied to job.",
      estimated_impact: estimatedImpact,
      measured_impact: measuredImpact,
    });
  }

  return { ...recommendation, status: nextStatus };
}
