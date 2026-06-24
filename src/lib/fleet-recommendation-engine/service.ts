import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateDeadheadMiles } from "@/src/lib/fleet/marts/deadhead";
import { loadFleetDispatchBoardData } from "@/src/lib/fleet/queries/dispatch-board";
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
  FleetRecommendationsResponse,
  FleetRecommendationType,
} from "@/src/types/fleet";

export const FLEET_RECOMMENDATION_ENGINE_VERSION = "fleet_rules_v1";

const RECOMMENDATION_TTL_MS = 60 * 60 * 1000;
const MAX_TRUCK_ASSIGNMENT = 8;
const MAX_IDLE_MATCH = 8;
const MAX_CAPACITY_ALERTS = 4;

type RecommendationStatus = "pending" | "accepted" | "dismissed" | "expired";

type RecommendationInsert = {
  tenant_id: string;
  branch_id: string;
  recommendation_type: FleetRecommendationType;
  status: RecommendationStatus;
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

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeScore(value: number): number {
  return Math.round(clamp(value) * 100) / 100;
}

function parseJobHours(job: FleetDispatchJob): number {
  const start = job.scheduled_start ? Date.parse(job.scheduled_start) : Number.NaN;
  const end = job.scheduled_end ? Date.parse(job.scheduled_end) : Number.NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.min(8, Math.max(0.5, (end - start) / (1000 * 60 * 60)));
  }
  return 2;
}

function priorityWeight(priority: FleetDispatchJob["priority"]): number {
  switch (priority) {
    case "urgent":
      return 1;
    case "high":
      return 0.8;
    case "medium":
      return 0.5;
    case "low":
      return 0.25;
    default:
      return 0.5;
  }
}

function freshnessFactor(status: FleetDispatchTruckLane["telematics_status"]): number {
  switch (status) {
    case "online":
      return 100;
    case "stale":
      return 65;
    default:
      return 30;
  }
}

function computeCompositeScore(factors: FleetRecommendationFactors): number {
  const raw =
    factors.travelImpact * 0.35 +
    factors.utilizationImpact * 0.25 +
    factors.capacityImpact * 0.25 +
    factors.telematicsFreshness * 0.15;
  return normalizeScore(raw);
}

function buildTruckAssignmentRecommendations(
  tenantId: string,
  board: FleetDispatchBoardData,
  expiresAt: string
): RecommendationInsert[] {
  const branchCapacityById = new Map(board.branchCapacity.map((b) => [b.branch_id, b]));
  const recommendations: RecommendationInsert[] = [];
  const sortedJobs = [...board.unassignedJobs].sort((a, b) => {
    const byPriority = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (byPriority !== 0) return byPriority;
    return a.id.localeCompare(b.id);
  });

  for (const job of sortedJobs.slice(0, MAX_TRUCK_ASSIGNMENT)) {
    const estimatedHours = parseJobHours(job);
    const eligibleLanes = board.truckLanes.filter((lane) => {
      if (lane.status !== "active") return false;
      if (job.required_truck_type === "any") return true;
      return lane.truck_type === job.required_truck_type;
    });

    const scored = eligibleLanes
      .map((lane) => {
        const deadhead = estimateDeadheadMiles(
          { latitude: lane.latitude, longitude: lane.longitude },
          { latitude: job.site_latitude, longitude: job.site_longitude }
        );
        const travelMinutes = deadhead?.travelMinutes ?? 90;
        const travelImpact = clamp(100 - travelMinutes * 1.75);

        const projectedTruckUtilization =
          lane.available_hours > 0
            ? (lane.committed_hours + estimatedHours) / lane.available_hours
            : 1.5;
        const utilizationImpact = clamp(100 - projectedTruckUtilization * 70);

        const branchCapacity = branchCapacityById.get(job.branch_id);
        const projectedBranchUtilization =
          branchCapacity && branchCapacity.available_truck_hours > 0
            ? (branchCapacity.committed_hours + estimatedHours) /
              branchCapacity.available_truck_hours
            : projectedTruckUtilization;
        const capacityImpact = clamp(100 - projectedBranchUtilization * 65);

        const telematicsFreshness = freshnessFactor(lane.telematics_status);
        const factors: FleetRecommendationFactors = {
          travelImpact: normalizeScore(travelImpact),
          utilizationImpact: normalizeScore(utilizationImpact),
          capacityImpact: normalizeScore(capacityImpact),
          telematicsFreshness: normalizeScore(telematicsFreshness),
        };

        const score = computeCompositeScore(factors);
        return { lane, factors, score, deadhead };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTravel = a.deadhead?.travelMinutes ?? Number.MAX_SAFE_INTEGER;
        const bTravel = b.deadhead?.travelMinutes ?? Number.MAX_SAFE_INTEGER;
        if (aTravel !== bTravel) return aTravel - bTravel;
        return a.lane.unit_number.localeCompare(b.lane.unit_number);
      });

    const best = scored[0];
    if (!best) continue;

    const reasons: string[] = [];
    reasons.push(`Closest eligible truck by estimated travel and deadhead.`);
    if (best.factors.capacityImpact >= 75) reasons.push("No branch capacity risk after assignment.");
    else reasons.push("Branch capacity remains manageable after assignment.");
    if (best.factors.utilizationImpact >= 70) reasons.push("Projected truck utilization remains below fleet pressure.");
    else reasons.push("Projected truck utilization is acceptable for today.");
    if (best.factors.telematicsFreshness >= 90) reasons.push("Telematics freshness is current.");
    else reasons.push("Telematics freshness is usable for dispatching.");

    const title = `Assign ${best.lane.unit_number} to ${job.title}`;
    recommendations.push({
      tenant_id: tenantId,
      branch_id: job.branch_id,
      recommendation_type: "truck_assignment",
      status: "pending",
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
      if (job.required_truck_type === "any") return true;
      return job.required_truck_type === lane.truck_type;
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
  expiresAt: string
): RecommendationInsert[] {
  const truckAssignment = buildTruckAssignmentRecommendations(tenantId, board, expiresAt);
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
    score: Number(row.score),
    rationale: normalizeRationale(row.rationale),
    engine_version: row.engine_version,
    created_at: row.created_at,
    expires_at: row.expires_at,
  };
}

function mapOutcomeRow(row: OutcomeRow): FleetRecommendationOutcome {
  return {
    id: row.id,
    recommendation_id: row.recommendation_id,
    action: row.action,
    acted_by: row.acted_by,
    acted_at: row.acted_at,
    estimated_impact: row.estimated_impact ?? {},
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
    .update({ status: "expired" })
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
      "id, tenant_id, branch_id, recommendation_type, status, score, rationale, engine_version, created_at, expires_at"
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
      "id, tenant_id, branch_id, recommendation_type, status, score, rationale, engine_version, created_at, expires_at, recommendation_outcomes(id, recommendation_id, action, acted_by, acted_at, estimated_impact, notes)"
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

  let pending = await loadPendingRecommendations(supabase, tenantId, branchId);
  if (pending.length === 0 || options?.forceRefresh) {
    const board = await loadFleetDispatchBoardData(supabase, tenantId, date, branchId);
    const expiresAt = new Date(Date.now() + RECOMMENDATION_TTL_MS).toISOString();
    const generated = buildFleetRecommendationsFromBoard(tenantId, board, expiresAt);
    if (generated.length > 0) {
      const { error } = await supabase
        .from("recommendation_instances")
        .insert(generated);
      if (error) throw new Error(error.message);
    }
    pending = await loadPendingRecommendations(supabase, tenantId, branchId);
  }

  const history = await loadRecommendationHistory(supabase, tenantId, branchId);
  const summary = summarizeRecommendations(pending, history);

  return {
    generatedAt: new Date().toISOString(),
    engineVersion: FLEET_RECOMMENDATION_ENGINE_VERSION,
    pending,
    history,
    summary,
  };
}

export async function applyRecommendationOutcome(
  supabase: SupabaseClient,
  tenantId: string,
  input: {
    recommendationId: string;
    action: Exclude<FleetRecommendationOutcomeAction, "expired">;
    actedBy: string | null;
    notes?: string | null;
  }
): Promise<FleetRecommendationInstance> {
  const { data: row, error } = await supabase
    .from("recommendation_instances")
    .select(
      "id, tenant_id, branch_id, recommendation_type, status, score, rationale, engine_version, created_at, expires_at"
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

  if (input.action === "accepted") {
    const jobId = recommendation.rationale.entities.job_id;
    const truckId = recommendation.rationale.entities.truck_id;
    if (jobId && truckId) {
      const { error: assignError } = await supabase
        .from("fleet_jobs")
        .update({
          assigned_truck_id: truckId,
          status: "scheduled",
        })
        .eq("id", jobId)
        .eq("tenant_id", tenantId);
      if (assignError) throw new Error(assignError.message);
    }
  }

  const nextStatus = input.action === "accepted" ? "accepted" : "dismissed";
  const { error: updateError } = await supabase
    .from("recommendation_instances")
    .update({ status: nextStatus })
    .eq("id", recommendation.id)
    .eq("tenant_id", tenantId);
  if (updateError) throw new Error(updateError.message);

  const estimatedImpact = {
    factors: recommendation.rationale.factors,
    score: recommendation.score,
  };
  const { error: outcomeError } = await supabase.from("recommendation_outcomes").insert({
    recommendation_id: recommendation.id,
    action: input.action,
    acted_by: input.actedBy,
    notes: input.notes ?? null,
    estimated_impact: estimatedImpact,
  });
  if (outcomeError) throw new Error(outcomeError.message);

  return { ...recommendation, status: nextStatus };
}
