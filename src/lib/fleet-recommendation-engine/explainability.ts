import { estimateDeadheadMiles } from "@/src/lib/fleet/marts/deadhead";
import {
  snapshotToCandidateMetrics,
  type CandidateMetrics,
  type StoredCandidateSnapshot,
} from "@/src/lib/fleet-recommendation-engine/candidate-metrics";
import { scoreTruckForJob } from "@/src/lib/fleet-recommendation-engine/profitability-scoring";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationFactors,
  FleetRecommendationInstance,
} from "@/src/types/fleet";
import {
  branchCapacityLabel,
  clamp,
  computeCompositeScore,
  freshnessFactor,
  gpsFreshnessLabel,
  normalizeScore,
  parseJobHours,
  priorityWeight,
} from "./scoring-utils";

export type RecommendationConfidence = "high" | "medium" | "low";

function recommendationConfidence(rec: FleetRecommendationInstance): RecommendationConfidence {
  const factors = rec.rationale.factors;
  const telematics = factors?.telematicsFreshness ?? 30;
  if (rec.score >= 75 && telematics >= 90) return "high";
  if (rec.score >= 55 && telematics >= 65) return "medium";
  return "low";
}

export type FactorQuality = "excellent" | "good" | "neutral" | "poor";

export type { CandidateMetrics } from "./candidate-metrics";

export type ComparisonRow = {
  key: string;
  label: string;
  lowerIsBetter: boolean;
  cells: Array<{ truckId: string; display: string; raw: number | string | null }>;
  winnerIndex: number | null;
};

export type FactorScoreDisplay = {
  key: string;
  label: string;
  quality: FactorQuality;
  detail: string;
};

export type DecisionImpactDisplay = {
  travelReducedMiles: number | null;
  arrivalImprovedMinutes: number | null;
  projectedUtilizationPct: number | null;
  branchCapacityLabel: string | null;
  revenueProtected: number | null;
  contributionImprovement: number | null;
  laborSaved: number | null;
  overtimeAvoided: number | null;
  fuelSaved: number | null;
};

const EMPTY_DECISION_IMPACT: DecisionImpactDisplay = {
  travelReducedMiles: null,
  arrivalImprovedMinutes: null,
  projectedUtilizationPct: null,
  branchCapacityLabel: null,
  revenueProtected: null,
  contributionImprovement: null,
  laborSaved: null,
  overtimeAvoided: null,
  fuelSaved: null,
};

export type RecommendationExplanation = {
  recommendationType: FleetRecommendationInstance["recommendation_type"];
  recommended: CandidateMetrics | null;
  alternatives: CandidateMetrics[];
  comparisonRows: ComparisonRow[];
  winnerReasons: string[];
  loserReasons: Array<{ unitNumber: string; reasons: string[] }>;
  factorScores: FactorScoreDisplay[];
  confidence: RecommendationConfidence;
  confidenceExplanation: string;
  decisionImpact: DecisionImpactDisplay;
  ignoreRisk: string | null;
  capacitySummary: {
    sourceBranch: string;
    targetBranch: string | null;
    overloadPct: number;
  } | null;
  dataFreshness: {
    telematicsLabel: string;
    generatedAt: string | null;
    isStale: boolean;
  } | null;
};

export type RecommendationDecisionRecord = {
  recommendation_id: string;
  recommendation_type: FleetRecommendationInstance["recommendation_type"];
  decision: "accepted" | "dismissed";
  timestamp: string;
  dispatcher_id: string | null;
  recommended_truck_id: string | null;
  recommended_unit_number: string | null;
  job_id: string | null;
  alternatives: Array<{ truck_id: string; unit_number: string; score: number }>;
  winner_reasons: string[];
  loser_reasons: Array<{ unit_number: string; reasons: string[] }>;
  confidence: RecommendationConfidence;
  confidence_explanation: string;
  projected_outcome: DecisionImpactDisplay;
  engine_score: number;
  factors: FleetRecommendationFactors;
};

function factorQuality(value: number): FactorQuality {
  if (value >= 85) return "excellent";
  if (value >= 70) return "good";
  if (value >= 50) return "neutral";
  return "poor";
}

function factorQualityLabel(quality: FactorQuality): string {
  switch (quality) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "neutral":
      return "Neutral";
    default:
      return "Poor";
  }
}

function scoreCandidateForJob(
  lane: FleetDispatchTruckLane,
  job: FleetDispatchJob,
  board: FleetDispatchBoardData,
  profitCtx: ProfitabilityContext,
  engineScore?: number,
  priorityBoost = 0
): CandidateMetrics {
  const scored = scoreTruckForJob({ job, lane, board, profitCtx });
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

  const score =
    engineScore ?? normalizeScore(computeCompositeScore(scored.factors) + priorityBoost);

  return {
    truckId: lane.truck_id,
    unitNumber: lane.unit_number,
    rank: 0,
    score,
    factors: scored.factors,
    travelMinutes: scored.deadhead?.travelMinutes ?? null,
    deadheadMiles: scored.deadhead?.miles ?? null,
    distanceMiles: scored.deadhead?.miles ?? null,
    currentUtilizationPct: Math.round(lane.utilization * 100),
    projectedUtilizationPct: Math.round(projectedTruckUtilization * 100),
    branchUtilizationPct: Math.round(projectedBranchUtilization * 100),
    branchCapacityLabel: branchCapacityLabel(projectedBranchUtilization),
    revenueImpact: job.revenue_estimate,
    gpsFreshnessPct: freshnessFactor(lane.telematics_status),
    gpsLabel: gpsFreshnessLabel(lane.telematics_status),
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    operatorAvailable: hoursRemaining >= estimatedHours,
    operatorName: lane.operator_name ?? null,
    branchName: lane.branch_name ?? branchCapacity?.branch_name ?? null,
    maintenanceStatus,
    truckTypeMatch,
    equipmentMatch: truckTypeMatch,
    estimated_contribution: scored.profit.estimated_contribution,
    estimated_labor: scored.profit.estimated_labor,
    estimated_fuel: scored.profit.estimated_fuel,
    projected_overtime_cost: scored.profit.projected_overtime_cost,
    telematicsStatus: lane.telematics_status,
  };
}

function resolveCandidates(
  rec: FleetRecommendationInstance,
  job: FleetDispatchJob,
  board: FleetDispatchBoardData,
  profitCtx?: ProfitabilityContext
): CandidateMetrics[] {
  const storedSnapshots = rec.rationale.candidate_snapshots;
  if (storedSnapshots && storedSnapshots.length > 0) {
    return storedSnapshots.map((snapshot, index) =>
      snapshotToCandidateMetrics(snapshot as StoredCandidateSnapshot, index + 1)
    );
  }

  if (!profitCtx) {
    return [];
  }

  const primaryTruckId =
    rec.rationale.entities.truck_id ?? rec.rationale.candidates?.[0]?.truck_id ?? null;

  const eligible = board.truckLanes
    .filter((lane) => {
      if (lane.status !== "active") return false;
      if (job.required_truck_type === "any") return true;
      return lane.truck_type === job.required_truck_type;
    })
    .map((lane) => {
      const boost =
        rec.recommendation_type === "idle_truck_match" ? priorityWeight(job.priority) * 12 : 0;
      const engineScore = rec.rationale.candidates?.find((c) => c.truck_id === lane.truck_id)?.score;
      return scoreCandidateForJob(lane, job, board, profitCtx, engineScore, boost);
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aTravel = a.travelMinutes ?? Number.MAX_SAFE_INTEGER;
      const bTravel = b.travelMinutes ?? Number.MAX_SAFE_INTEGER;
      if (aTravel !== bTravel) return aTravel - bTravel;
      return a.unitNumber.localeCompare(b.unitNumber);
    });

  const ordered =
    primaryTruckId != null
      ? [
          ...eligible.filter((c) => c.truckId === primaryTruckId),
          ...eligible.filter((c) => c.truckId !== primaryTruckId),
        ]
      : eligible;

  return ordered.slice(0, 3).map((c, index) => ({ ...c, rank: index + 1 }));
}

function buildComparisonRows(candidates: CandidateMetrics[]): ComparisonRow[] {
  if (candidates.length === 0) return [];

  const defs: Array<{
    key: string;
    label: string;
    lowerIsBetter: boolean;
    getRaw: (c: CandidateMetrics) => number | string | null;
    format: (raw: number | string | null, candidate?: CandidateMetrics) => string;
  }> = [
    {
      key: "eta",
      label: "ETA / travel",
      lowerIsBetter: true,
      getRaw: (c) => c.travelMinutes,
      format: (raw) => (typeof raw === "number" ? `${Math.round(raw)} min` : "—"),
    },
    {
      key: "deadhead",
      label: "Deadhead",
      lowerIsBetter: true,
      getRaw: (c) => c.deadheadMiles,
      format: (raw) => (typeof raw === "number" ? `${raw.toFixed(1)} mi` : "—"),
    },
    {
      key: "distance",
      label: "Distance",
      lowerIsBetter: true,
      getRaw: (c) => c.distanceMiles,
      format: (raw) => (typeof raw === "number" ? `${raw.toFixed(1)} mi` : "—"),
    },
    {
      key: "current_util",
      label: "Current utilization",
      lowerIsBetter: true,
      getRaw: (c) => c.currentUtilizationPct,
      format: (raw) => (typeof raw === "number" ? `${raw}%` : "—"),
    },
    {
      key: "projected_util",
      label: "Projected utilization",
      lowerIsBetter: true,
      getRaw: (c) => c.projectedUtilizationPct,
      format: (raw) => (typeof raw === "number" ? `${raw}%` : "—"),
    },
    {
      key: "branch_capacity",
      label: "Branch capacity",
      lowerIsBetter: true,
      getRaw: (c) => c.branchUtilizationPct,
      format: (raw, c?: CandidateMetrics) =>
        typeof raw === "number"
          ? `${raw}% · ${c?.branchCapacityLabel ?? ""}`.replace(/ · $/, "")
          : "—",
    },
    {
      key: "revenue",
      label: "Revenue impact",
      lowerIsBetter: false,
      getRaw: (c) => c.revenueImpact,
      format: (raw) =>
        typeof raw === "number"
          ? new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(raw)
          : "—",
    },
    {
      key: "gps",
      label: "GPS freshness",
      lowerIsBetter: false,
      getRaw: (c) => c.gpsFreshnessPct,
      format: (raw) => (typeof raw === "number" ? `${Math.round(raw)}%` : "—"),
    },
    {
      key: "hours",
      label: "Hours remaining",
      lowerIsBetter: false,
      getRaw: (c) => c.hoursRemaining,
      format: (raw) => (typeof raw === "number" ? `${raw.toFixed(1)}h` : "—"),
    },
    {
      key: "maintenance",
      label: "Maintenance",
      lowerIsBetter: true,
      getRaw: (c) => c.maintenanceStatus,
      format: (raw) => (typeof raw === "string" ? raw : "—"),
    },
    {
      key: "truck_type",
      label: "Truck type match",
      lowerIsBetter: false,
      getRaw: (c) => (c.truckTypeMatch ? 1 : 0),
      format: (raw) => (raw === 1 ? "Match" : "Mismatch"),
    },
    {
      key: "equipment",
      label: "Equipment match",
      lowerIsBetter: false,
      getRaw: (c) => (c.equipmentMatch ? 1 : 0),
      format: (raw) => (raw === 1 ? "Match" : "Mismatch"),
    },
    {
      key: "score",
      label: "Overall score",
      lowerIsBetter: false,
      getRaw: (c) => c.score,
      format: (raw) => (typeof raw === "number" ? raw.toFixed(0) : "—"),
    },
  ];

  return defs.map((def) => {
    const cells = candidates.map((c) => {
      const raw = def.getRaw(c);
      return { truckId: c.truckId, display: def.format(raw, c), raw };
    });

    const numericCells = cells
      .map((cell, index) => ({ index, raw: cell.raw }))
      .filter((cell): cell is { index: number; raw: number } => typeof cell.raw === "number");

    let winnerIndex: number | null = null;
    if (numericCells.length > 0) {
      winnerIndex = numericCells.reduce((best, cell) => {
        if (best === null) return cell.index;
        const bestVal = numericCells.find((c) => c.index === best)!.raw;
        if (def.lowerIsBetter) {
          return cell.raw < bestVal ? cell.index : best;
        }
        return cell.raw > bestVal ? cell.index : best;
      }, numericCells[0].index);
    } else if (def.key === "maintenance") {
      const readyIndex = cells.findIndex((c) => c.raw === "Ready");
      winnerIndex = readyIndex >= 0 ? readyIndex : 0;
    }

    return {
      key: def.key,
      label: def.label,
      lowerIsBetter: def.lowerIsBetter,
      cells,
      winnerIndex,
    };
  });
}

function buildWinnerReasons(winner: CandidateMetrics, alt: CandidateMetrics | undefined, job: FleetDispatchJob): string[] {
  const reasons: string[] = [];
  if (alt && winner.travelMinutes != null && alt.travelMinutes != null) {
    const diff = Math.round(alt.travelMinutes - winner.travelMinutes);
    if (diff >= 2) {
      reasons.push(`${diff} minutes closer than ${alt.unitNumber}`);
    }
  }
  if (alt && winner.deadheadMiles != null && alt.deadheadMiles != null) {
    const diff = Math.round((alt.deadheadMiles - winner.deadheadMiles) * 10) / 10;
    if (diff >= 0.5) {
      reasons.push(`${diff} fewer deadhead miles than ${alt.unitNumber}`);
    }
  }
  if (winner.branchCapacityLabel === "Healthy" || winner.branchCapacityLabel === "Moderate") {
    if (job.branch_name) {
      reasons.push(`Keeps ${job.branch_name} below overload capacity`);
    } else {
      reasons.push("Branch capacity remains healthy after assignment");
    }
  }
  if (winner.hoursRemaining >= parseJobHours(job)) {
    reasons.push(`Operator has ${winner.hoursRemaining.toFixed(1)} hours remaining today`);
  }
  if (winner.gpsFreshnessPct >= 90) {
    reasons.push(`GPS signal is ${winner.gpsLabel.toLowerCase()}`);
  } else if (winner.gpsFreshnessPct >= 65) {
    reasons.push(`GPS usable (${winner.gpsLabel.toLowerCase()})`);
  }
  if (winner.equipmentMatch) {
    reasons.push("Correct equipment already installed");
  }
  if (winner.projectedUtilizationPct <= 80 && alt && winner.projectedUtilizationPct < alt.projectedUtilizationPct) {
    reasons.push(`Projected utilization stays at ${winner.projectedUtilizationPct}%`);
  }
  if (reasons.length === 0) {
    reasons.push("Best overall operational score among eligible trucks");
  }
  return reasons.slice(0, 6);
}

function buildLoserReasons(
  winner: CandidateMetrics,
  alt: CandidateMetrics
): string[] {
  const reasons: string[] = [];
  if (
    alt.travelMinutes != null &&
    winner.travelMinutes != null &&
    alt.travelMinutes > winner.travelMinutes + 1
  ) {
    reasons.push("Longer travel");
  }
  if (alt.projectedUtilizationPct > winner.projectedUtilizationPct + 5) {
    reasons.push("Higher projected utilization");
  }
  if (alt.projectedUtilizationPct >= 100) {
    reasons.push("Would exceed planned workload");
  }
  if (alt.projected_overtime_cost > 0 && alt.projected_overtime_cost > (winner?.projected_overtime_cost ?? 0)) {
    reasons.push("Would enter overtime");
  }
  if (alt.estimated_labor > (winner?.estimated_labor ?? 0) + 10) {
    reasons.push("Higher labor cost");
  }
  if (alt.deadheadMiles != null && winner.deadheadMiles != null && alt.deadheadMiles > winner.deadheadMiles + 0.5) {
    reasons.push("Requires additional travel");
  }
  if (alt.gpsFreshnessPct < winner.gpsFreshnessPct - 10) {
    reasons.push(`Weaker GPS (${alt.gpsLabel})`);
  }
  if (alt.maintenanceStatus !== "Ready") {
    reasons.push(alt.maintenanceStatus);
  }
  if (!alt.operatorAvailable) {
    reasons.push("Insufficient hours remaining");
  }
  if (reasons.length === 0) {
    reasons.push("Lower overall score");
  }
  return reasons.slice(0, 4);
}

function buildFactorScores(factors: FleetRecommendationFactors, winner: CandidateMetrics): FactorScoreDisplay[] {
  const revenueQuality: FactorQuality =
    winner.revenueImpact >= 5000 ? "excellent" : winner.revenueImpact >= 2000 ? "good" : "neutral";
  const equipmentQuality: FactorQuality = winner.equipmentMatch ? "excellent" : "poor";
  const operatorQuality: FactorQuality = winner.operatorAvailable
    ? winner.hoursRemaining >= 4
      ? "excellent"
      : "good"
    : "poor";

  return [
    {
      key: "travelImpact",
      label: "Travel",
      quality: factorQuality(factors.travelImpact),
      detail: factorQualityLabel(factorQuality(factors.travelImpact)),
    },
    {
      key: "deadhead",
      label: "Deadhead",
      quality: factorQuality(factors.travelImpact),
      detail: factorQualityLabel(factorQuality(factors.travelImpact)),
    },
    {
      key: "utilizationImpact",
      label: "Utilization",
      quality: factorQuality(factors.utilizationImpact),
      detail: factorQualityLabel(factorQuality(factors.utilizationImpact)),
    },
    {
      key: "capacityImpact",
      label: "Capacity",
      quality: factorQuality(factors.capacityImpact),
      detail: factorQualityLabel(factorQuality(factors.capacityImpact)),
    },
    {
      key: "telematicsFreshness",
      label: "GPS",
      quality: factorQuality(factors.telematicsFreshness),
      detail: factorQualityLabel(factorQuality(factors.telematicsFreshness)),
    },
    {
      key: "revenue",
      label: "Revenue",
      quality: revenueQuality,
      detail: factorQualityLabel(revenueQuality),
    },
    {
      key: "equipment",
      label: "Equipment match",
      quality: equipmentQuality,
      detail: factorQualityLabel(equipmentQuality),
    },
    {
      key: "operator",
      label: "Operator availability",
      quality: operatorQuality,
      detail: factorQualityLabel(operatorQuality),
    },
  ];
}

export function buildConfidenceExplanation(
  rec: FleetRecommendationInstance,
  winner: CandidateMetrics | null,
  alt: CandidateMetrics | undefined
): string {
  const confidence = recommendationConfidence(rec);
  if (confidence === "high") {
    if (winner && alt && winner.score - alt.score >= 8) {
      return `All operational factors strongly favor ${winner.unitNumber}.`;
    }
    return winner
      ? `All operational factors strongly favor ${winner.unitNumber}.`
      : "Strong alignment across travel, capacity, and GPS factors.";
  }
  if (confidence === "medium") {
    if (winner && alt) {
      const travelFavorsWinner =
        winner.travelMinutes != null &&
        alt.travelMinutes != null &&
        winner.travelMinutes <= alt.travelMinutes;
      const utilFavorsAlt = alt.projectedUtilizationPct < winner.projectedUtilizationPct;
      if (travelFavorsWinner && utilFavorsAlt) {
        return `Travel favors ${winner.unitNumber} but ${alt.unitNumber} has slightly better utilization.`;
      }
    }
    return "Most factors align; review comparison before accepting.";
  }
  return "GPS or capacity signals are weak — verify manually before dispatching.";
}

function buildDecisionImpact(
  winner: CandidateMetrics,
  alt: CandidateMetrics | undefined
): DecisionImpactDisplay {
  let travelReducedMiles: number | null = null;
  let arrivalImprovedMinutes: number | null = null;
  if (alt && winner.deadheadMiles != null && alt.deadheadMiles != null) {
    travelReducedMiles = Math.max(0, Math.round((alt.deadheadMiles - winner.deadheadMiles) * 10) / 10);
  }
  if (alt && winner.travelMinutes != null && alt.travelMinutes != null) {
    arrivalImprovedMinutes = Math.max(0, Math.round(alt.travelMinutes - winner.travelMinutes));
  }

  let contributionImprovement: number | null = null;
  let laborSaved: number | null = null;
  let overtimeAvoided: number | null = null;
  let fuelSaved: number | null = null;
  if (alt) {
    contributionImprovement = Math.max(
      0,
      Math.round((winner.estimated_contribution - alt.estimated_contribution) * 100) / 100
    );
    laborSaved = Math.max(
      0,
      Math.round((alt.estimated_labor - winner.estimated_labor) * 100) / 100
    );
    overtimeAvoided = Math.max(
      0,
      Math.round((alt.projected_overtime_cost - winner.projected_overtime_cost) * 100) / 100
    );
    fuelSaved = Math.max(
      0,
      Math.round((alt.estimated_fuel - winner.estimated_fuel) * 100) / 100
    );
  }

  return {
    travelReducedMiles,
    arrivalImprovedMinutes,
    projectedUtilizationPct: winner.projectedUtilizationPct,
    branchCapacityLabel: winner.branchCapacityLabel,
    revenueProtected: winner.revenueImpact > 0 ? winner.revenueImpact : null,
    contributionImprovement,
    laborSaved,
    overtimeAvoided,
    fuelSaved,
  };
}

function buildIgnoreRisk(
  rec: FleetRecommendationInstance,
  winner: CandidateMetrics | null,
  alt: CandidateMetrics | undefined,
  job: FleetDispatchJob | undefined
): string | null {
  if (rec.recommendation_type === "capacity_overload") {
    return "Ignoring may leave branch overloaded and delay lower-priority assignments.";
  }
  if (!job || !winner) return null;
  const minutes =
    alt && winner.travelMinutes != null && alt.travelMinutes != null
      ? Math.max(0, Math.round(alt.travelMinutes - winner.travelMinutes))
      : winner.travelMinutes != null
        ? Math.round(winner.travelMinutes * 0.25)
        : null;
  const revenue = job.revenue_estimate;
  if (minutes != null && revenue > 0) {
    return `Ignoring this recommendation could delay arrival by approximately ${minutes} minute${minutes === 1 ? "" : "s"} and place ${new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(revenue)} of revenue at risk.`;
  }
  if (revenue > 0) {
    return `${new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(revenue)} of revenue remains at risk if unassigned.`;
  }
  return null;
}

export function buildRecommendationExplanation(
  rec: FleetRecommendationInstance,
  board: FleetDispatchBoardData,
  profitCtx?: ProfitabilityContext
): RecommendationExplanation {
  const jobId = rec.rationale.entities.job_id;
  const job = jobId ? board.jobs.find((j) => j.id === jobId) : undefined;

  if (rec.recommendation_type === "capacity_overload") {
    const source = board.branchCapacity.find(
      (b) => b.branch_id === rec.rationale.entities.source_branch_id
    );
    const target = board.branchCapacity.find(
      (b) => b.branch_id === rec.rationale.entities.target_branch_id
    );
    const confidence = recommendationConfidence(rec);
    return {
      recommendationType: rec.recommendation_type,
      recommended: null,
      alternatives: [],
      comparisonRows: [],
      winnerReasons: rec.rationale.reasons.slice(0, 5),
      loserReasons: [],
      factorScores: buildFactorScores(rec.rationale.factors, {
        truckId: "",
        unitNumber: "",
        rank: 1,
        score: rec.score,
        factors: rec.rationale.factors,
        travelMinutes: null,
        deadheadMiles: null,
        distanceMiles: null,
        currentUtilizationPct: 0,
        projectedUtilizationPct: 0,
        branchUtilizationPct: source ? Math.round(source.utilization * 100) : 0,
        branchCapacityLabel: source ? branchCapacityLabel(source.utilization) : "Overloaded",
        revenueImpact: 0,
        gpsFreshnessPct: rec.rationale.factors.telematicsFreshness,
        gpsLabel: "Fleet average",
        hoursRemaining: 0,
        operatorAvailable: true,
        operatorName: null,
        branchName: source?.branch_name ?? null,
        maintenanceStatus: "N/A",
        truckTypeMatch: true,
        equipmentMatch: true,
        estimated_contribution: 0,
        estimated_labor: 0,
        estimated_fuel: 0,
        projected_overtime_cost: 0,
      }),
      confidence,
      confidenceExplanation: buildConfidenceExplanation(rec, null, undefined),
      decisionImpact: {
        ...EMPTY_DECISION_IMPACT,
        projectedUtilizationPct: source ? Math.round(source.utilization * 100) : null,
        branchCapacityLabel: source ? branchCapacityLabel(source.utilization) : "Overloaded",
      },
      ignoreRisk: buildIgnoreRisk(rec, null, undefined, job),
      capacitySummary: source
        ? {
            sourceBranch: source.branch_name,
            targetBranch: target?.branch_name ?? null,
            overloadPct: Math.round(source.utilization * 100),
          }
        : null,
      dataFreshness: {
        telematicsLabel: "Fleet average",
        generatedAt: rec.rationale.generated_at ?? rec.created_at,
        isStale: Date.now() - Date.parse(rec.rationale.generated_at ?? rec.created_at) > 60 * 60 * 1000,
      },
    };
  }

  if (!job) {
    const confidence = recommendationConfidence(rec);
    return {
      recommendationType: rec.recommendation_type,
      recommended: null,
      alternatives: [],
      comparisonRows: [],
      winnerReasons: rec.rationale.reasons,
      loserReasons: [],
      factorScores: [],
      confidence,
      confidenceExplanation: buildConfidenceExplanation(rec, null, undefined),
      decisionImpact: EMPTY_DECISION_IMPACT,
      ignoreRisk: null,
      capacitySummary: null,
      dataFreshness: rec.rationale.generated_at
        ? {
            telematicsLabel: "Unknown",
            generatedAt: rec.rationale.generated_at,
            isStale: Date.now() - Date.parse(rec.rationale.generated_at) > 60 * 60 * 1000,
          }
        : null,
    };
  }

  const candidates = resolveCandidates(rec, job, board, profitCtx);
  const recommended = candidates[0] ?? null;
  const alternatives = candidates.slice(1);
  const primaryAlt = alternatives[0];

  const dataFreshness = recommended
    ? {
        telematicsLabel: recommended.gpsLabel,
        generatedAt: rec.rationale.generated_at ?? rec.created_at,
        isStale: recommended.telematicsStatus === "stale" || recommended.telematicsStatus === "offline",
      }
    : rec.rationale.generated_at
      ? {
          telematicsLabel: "Unknown",
          generatedAt: rec.rationale.generated_at,
          isStale: Date.now() - Date.parse(rec.rationale.generated_at) > 60 * 60 * 1000,
        }
      : null;

  return {
    recommendationType: rec.recommendation_type,
    recommended,
    alternatives,
    comparisonRows: buildComparisonRows(candidates),
    winnerReasons: recommended ? buildWinnerReasons(recommended, primaryAlt, job) : rec.rationale.reasons,
    loserReasons: alternatives.map((alt) => ({
      unitNumber: alt.unitNumber,
      reasons: recommended ? buildLoserReasons(recommended, alt) : ["Not selected"],
    })),
    factorScores: recommended
      ? buildFactorScores(recommended.factors, recommended)
      : buildFactorScores(rec.rationale.factors, {
          truckId: "",
          unitNumber: "",
          rank: 1,
          score: rec.score,
          factors: rec.rationale.factors,
          travelMinutes: null,
          deadheadMiles: null,
          distanceMiles: null,
          currentUtilizationPct: 0,
          projectedUtilizationPct: 0,
          branchUtilizationPct: 0,
          branchCapacityLabel: "Unknown",
          revenueImpact: job.revenue_estimate,
          gpsFreshnessPct: rec.rationale.factors.telematicsFreshness,
          gpsLabel: "Unknown",
          hoursRemaining: 0,
          operatorAvailable: false,
          operatorName: null,
          branchName: job.branch_name,
          maintenanceStatus: "Unknown",
          truckTypeMatch: true,
          equipmentMatch: true,
          estimated_contribution: 0,
          estimated_labor: 0,
          estimated_fuel: 0,
          projected_overtime_cost: 0,
        }),
    confidence: recommendationConfidence(rec),
    confidenceExplanation: buildConfidenceExplanation(rec, recommended, primaryAlt),
    decisionImpact: recommended
      ? buildDecisionImpact(recommended, primaryAlt)
      : EMPTY_DECISION_IMPACT,
    ignoreRisk: buildIgnoreRisk(rec, recommended, primaryAlt, job),
    capacitySummary: null,
    dataFreshness,
  };
}

export function buildRecommendationDecisionRecord(
  rec: FleetRecommendationInstance,
  board: FleetDispatchBoardData,
  input: {
    action: "accepted" | "dismissed";
    actedBy: string | null;
    actedAt?: string;
    profitCtx?: ProfitabilityContext;
  }
): RecommendationDecisionRecord {
  const explanation = buildRecommendationExplanation(rec, board, input.profitCtx);
  const candidates = [
    ...(explanation.recommended ? [explanation.recommended] : []),
    ...explanation.alternatives,
  ];

  return {
    recommendation_id: rec.id,
    recommendation_type: rec.recommendation_type,
    decision: input.action,
    timestamp: input.actedAt ?? new Date().toISOString(),
    dispatcher_id: input.actedBy,
    recommended_truck_id: explanation.recommended?.truckId ?? rec.rationale.entities.truck_id ?? null,
    recommended_unit_number: explanation.recommended?.unitNumber ?? null,
    job_id: rec.rationale.entities.job_id ?? null,
    alternatives: candidates.slice(1, 3).map((c) => ({
      truck_id: c.truckId,
      unit_number: c.unitNumber,
      score: c.score,
    })),
    winner_reasons: explanation.winnerReasons,
    loser_reasons: explanation.loserReasons.map((l) => ({
      unit_number: l.unitNumber,
      reasons: l.reasons,
    })),
    confidence: explanation.confidence,
    confidence_explanation: explanation.confidenceExplanation,
    projected_outcome: explanation.decisionImpact,
    engine_score: rec.score,
    factors: rec.rationale.factors,
  };
}

export { factorQualityLabel };
