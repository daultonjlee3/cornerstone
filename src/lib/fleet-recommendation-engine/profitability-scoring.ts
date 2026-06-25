import { estimateDeadheadMiles } from "@/src/lib/fleet/marts/deadhead";
import {
  computeJobProfitability,
  profitabilityImpactScore,
} from "@/src/lib/operational-profitability/job-estimates";
import {
  laborCostImpactScore,
  overtimeRiskImpactScore,
} from "@/src/lib/operational-profitability/labor";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import type {
  FleetDispatchBoardData,
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationFactors,
} from "@/src/types/fleet";
import type { JobProfitabilityEstimate } from "@/src/lib/operational-profitability/types";
import {
  clamp,
  computeCompositeScore,
  freshnessFactor,
  normalizeScore,
  parseJobHours,
} from "./scoring-utils";

export type ScoredCandidate = {
  lane: FleetDispatchTruckLane;
  factors: FleetRecommendationFactors;
  score: number;
  deadhead: ReturnType<typeof estimateDeadheadMiles>;
  profit: JobProfitabilityEstimate;
};

export function scoreTruckForJob(args: {
  job: FleetDispatchJob;
  lane: FleetDispatchTruckLane;
  board: FleetDispatchBoardData;
  profitCtx: ProfitabilityContext;
}): ScoredCandidate {
  const { job, lane, board, profitCtx } = args;
  const estimatedHours = parseJobHours(job);
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

  const branchCapacity = board.branchCapacity.find((b) => b.branch_id === job.branch_id);
  const projectedBranchUtilization =
    branchCapacity && branchCapacity.available_truck_hours > 0
      ? (branchCapacity.committed_hours + estimatedHours) / branchCapacity.available_truck_hours
      : projectedTruckUtilization;
  const capacityImpact = clamp(100 - projectedBranchUtilization * 65);

  const telematicsFreshness = freshnessFactor(lane.telematics_status);

  const operatorRate = lane.operator_name ? profitCtx.rules.default_operator_hourly_rate : profitCtx.rules.default_operator_hourly_rate;
  const profit = computeJobProfitability({
    job,
    lane,
    ctx: profitCtx,
    operatorHourlyRate: operatorRate,
    deadheadMiles: deadhead?.miles ?? null,
    travelMinutes,
    operatorId: lane.truck_id,
  });

  const factors: FleetRecommendationFactors = {
    travelImpact: normalizeScore(travelImpact),
    utilizationImpact: normalizeScore(utilizationImpact),
    capacityImpact: normalizeScore(capacityImpact),
    telematicsFreshness: normalizeScore(telematicsFreshness),
    profitabilityImpact: 50,
    laborCostImpact: laborCostImpactScore(profit.estimated_labor, job.revenue_estimate),
    overtimeRiskImpact: overtimeRiskImpactScore(profit.projected_overtime_hours, estimatedHours),
    slaRiskImpact: normalizeScore(100 - profit.sla_risk_score),
  };

  return {
    lane,
    factors,
    score: computeCompositeScore(factors),
    deadhead,
    profit,
  };
}

export function finalizeCandidateScores(candidates: ScoredCandidate[]): ScoredCandidate[] {
  if (candidates.length === 0) return candidates;
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const bestContribution = sorted[0]?.profit.estimated_contribution ?? 0;

  return sorted.map((candidate, index) => {
    const altContribution = sorted[index + 1]?.profit.estimated_contribution ?? null;
    const factors = {
      ...candidate.factors,
      profitabilityImpact: profitabilityImpactScore(
        candidate.profit.estimated_contribution,
        index === 0 ? altContribution : bestContribution
      ),
    };
    return {
      ...candidate,
      factors,
      score: computeCompositeScore(factors),
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTravel = a.deadhead?.travelMinutes ?? Number.MAX_SAFE_INTEGER;
    const bTravel = b.deadhead?.travelMinutes ?? Number.MAX_SAFE_INTEGER;
    if (aTravel !== bTravel) return aTravel - bTravel;
    return a.lane.unit_number.localeCompare(b.lane.unit_number);
  });
}

export function buildProfitabilityReasons(
  best: ScoredCandidate,
  alt: ScoredCandidate | undefined
): string[] {
  const reasons: string[] = [];
  reasons.push(
    `Highest estimated contribution (${formatMoney(best.profit.estimated_contribution)}) among eligible trucks.`
  );
  if (best.deadhead?.travelMinutes != null && alt?.deadhead?.travelMinutes != null) {
    const saved = Math.round(alt.deadhead.travelMinutes - best.deadhead.travelMinutes);
    if (saved >= 2) reasons.push(`Saves ${saved} minutes travel vs ${alt.lane.unit_number}.`);
  }
  if (best.deadhead?.miles != null && alt?.deadhead?.miles != null) {
    const savedMi = Math.round((alt.deadhead.miles - best.deadhead.miles) * 10) / 10;
    if (savedMi >= 0.5) reasons.push(`Reduces deadhead by ${savedMi} miles.`);
  }
  if (best.profit.projected_overtime_hours <= 0) {
    reasons.push("Avoids operator overtime on this assignment.");
  } else if (alt && alt.profit.projected_overtime_hours > best.profit.projected_overtime_hours) {
    reasons.push("Lower overtime exposure than alternatives.");
  }
  if (alt && best.profit.estimated_labor + 5 < alt.profit.estimated_labor) {
    const laborSaved = Math.round(alt.profit.estimated_labor - best.profit.estimated_labor);
    reasons.push(`Saves ${formatMoney(laborSaved)} estimated labor vs ${alt.lane.unit_number}.`);
  }
  if (alt && best.profit.estimated_contribution > alt.profit.estimated_contribution + 25) {
    const delta = Math.round(best.profit.estimated_contribution - alt.profit.estimated_contribution);
    reasons.push(`Estimated contribution improves by ${formatMoney(delta)}.`);
  }
  return reasons;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
