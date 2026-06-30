import {
  buildRecommendationExplanation,
  type RecommendationConfidence,
} from "@/src/lib/fleet-recommendation-engine/explainability";
import type { RecommendationMeasuredImpact } from "@/src/lib/fleet-recommendation-engine/outcome-tracking";
import type { ProfitabilityContext } from "@/src/lib/operational-profitability/types";
import type {
  FleetDispatchBoardData,
  FleetRecommendationHistoryEntry,
  FleetRecommendationInstance,
  FleetRecommendationTrustAlternative,
  FleetRecommendationTrustSurface,
} from "@/src/types/fleet";

function confidenceLabelFromScore(score: number): RecommendationConfidence {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function resolveConfidenceScore(rec: FleetRecommendationInstance): number {
  const validationScore = rec.rationale.validation_health?.confidence;
  if (typeof validationScore === "number" && Number.isFinite(validationScore)) {
    return Math.round(Math.max(0, Math.min(100, validationScore)));
  }
  return Math.round(Math.max(0, Math.min(100, rec.score)));
}

function buildAlternativeOptions(
  explanation: ReturnType<typeof buildRecommendationExplanation>
): FleetRecommendationTrustAlternative[] {
  const recommended = explanation.recommended;
  const alts = explanation.alternatives.map((alt, index) => {
    const loser = explanation.loserReasons[index];
    return {
      truck_id: alt.truckId,
      unit_number: alt.unitNumber,
      score: alt.score,
      travel_minutes: alt.travelMinutes,
      deadhead_miles: alt.deadheadMiles,
      estimated_contribution: alt.estimated_contribution,
      summary: loser?.reasons.slice(0, 2).join("; ") || "Lower overall score",
    };
  });

  if (recommended && alts.length === 0) {
    return [];
  }

  return alts.slice(0, 3);
}

function buildRisks(
  rec: FleetRecommendationInstance,
  explanation: ReturnType<typeof buildRecommendationExplanation>
): string[] {
  const risks: string[] = [];

  if (explanation.ignoreRisk) risks.push(explanation.ignoreRisk);

  for (const violation of rec.rationale.validation_health?.constraint_violations ?? []) {
    risks.push(violation.message);
  }

  if (explanation.confidence === "low") {
    risks.push("Confidence is low — verify GPS and capacity signals before dispatching.");
  }

  if (rec.rationale.validation_health?.freshness === "stale") {
    risks.push("Operational snapshot may be stale — refresh recommendations before acting.");
  }

  for (const loser of explanation.loserReasons) {
    for (const reason of loser.reasons.slice(0, 2)) {
      if (reason.toLowerCase().includes("overtime")) {
        risks.push(`Alternative ${loser.unitNumber}: ${reason}`);
      }
    }
  }

  return [...new Set(risks)].slice(0, 6);
}

/** Build enterprise trust surface for a live recommendation using existing explainability. */
export function buildRecommendationTrustSurface(
  rec: FleetRecommendationInstance,
  board: FleetDispatchBoardData,
  profitCtx?: ProfitabilityContext
): FleetRecommendationTrustSurface {
  const explanation = buildRecommendationExplanation(rec, board, profitCtx);
  const impact = explanation.decisionImpact;
  const primary = explanation.recommended;
  const confidenceScore = resolveConfidenceScore(rec);

  const financialImpact =
    impact.contributionImprovement ??
    primary?.estimated_contribution ??
    primary?.revenueImpact ??
    null;

  return {
    financialImpact: financialImpact != null ? Math.round(financialImpact * 100) / 100 : null,
    confidenceScore,
    confidenceLabel: explanation.confidence,
    confidenceExplanation: explanation.confidenceExplanation,
    whyThisRecommendation: explanation.winnerReasons.length
      ? explanation.winnerReasons
      : rec.rationale.reasons.slice(0, 5),
    alternativeOptions: buildAlternativeOptions(explanation),
    risks: buildRisks(rec, explanation),
    estimatedContributionImprovement: impact.contributionImprovement,
    deadheadReductionMiles: impact.travelReducedMiles,
    overtimeImpact: impact.overtimeAvoided,
    revenueProtected: impact.revenueProtected,
    timeSavingsMinutes: impact.arrivalImprovedMinutes,
    fuelSaved: impact.fuelSaved,
    laborSaved: impact.laborSaved,
    projectedUtilizationPct: impact.projectedUtilizationPct,
    branchCapacityLabel: impact.branchCapacityLabel,
  };
}

/** Reconstruct trust surface from stored outcome data (history entries). */
export function buildTrustSurfaceFromHistory(
  entry: FleetRecommendationHistoryEntry
): FleetRecommendationTrustSurface | null {
  const outcome = entry.latest_outcome;
  if (!outcome?.estimated_impact) return null;

  const impact = outcome.estimated_impact as Record<string, unknown>;
  const financial = (impact.financial_estimate as Record<string, unknown> | undefined) ?? {};
  const record = (impact.decision_record as Record<string, unknown> | undefined) ?? {};
  const projected = (record.projected_outcome as Record<string, unknown> | undefined) ?? {};

  const confidenceScore =
    typeof record.engine_score === "number"
      ? Math.round(record.engine_score as number)
      : Math.round(entry.score);

  const confidenceRaw = record.confidence as RecommendationConfidence | undefined;

  const measured = outcome.measured_impact as RecommendationMeasuredImpact | undefined;

  return {
    financialImpact: Number(
      financial.contribution_improvement ??
        projected.contributionImprovement ??
        financial.estimated_contribution ??
        0
    ),
    confidenceScore,
    confidenceLabel: confidenceRaw ?? confidenceLabelFromScore(confidenceScore),
    confidenceExplanation:
      (record.confidence_explanation as string | undefined) ??
      "Recorded from dispatcher decision.",
    whyThisRecommendation: Array.isArray(record.winner_reasons)
      ? (record.winner_reasons as string[])
      : entry.rationale.reasons.slice(0, 5),
    alternativeOptions: Array.isArray(record.alternatives)
      ? (record.alternatives as Array<{ truck_id: string; unit_number: string; score: number }>).map(
          (alt) => ({
            truck_id: alt.truck_id,
            unit_number: alt.unit_number,
            score: alt.score,
            travel_minutes: null,
            deadhead_miles: null,
            estimated_contribution: null,
            summary: "Alternative at decision time",
          })
        )
      : [],
    risks: [],
    estimatedContributionImprovement: Number(
      financial.contribution_improvement ?? projected.contributionImprovement ?? 0
    ),
    deadheadReductionMiles: Number(
      financial.deadhead_reduction_miles ?? projected.travelReducedMiles ?? 0
    ),
    overtimeImpact: Number(financial.overtime_avoided ?? projected.overtimeAvoided ?? 0),
    revenueProtected: Number(financial.revenue_protected ?? projected.revenueProtected ?? 0),
    timeSavingsMinutes: Number(
      financial.travel_reduction_minutes ?? projected.arrivalImprovedMinutes ?? 0
    ),
    fuelSaved: Number(projected.fuelSaved ?? 0),
    laborSaved: Number(projected.laborSaved ?? 0),
    projectedUtilizationPct:
      typeof projected.projectedUtilizationPct === "number"
        ? (projected.projectedUtilizationPct as number)
        : null,
    branchCapacityLabel:
      typeof projected.branchCapacityLabel === "string"
        ? (projected.branchCapacityLabel as string)
        : null,
    measuredOutcome: measured ?? null,
  };
}

export function attachTrustToRecommendations(
  recommendations: FleetRecommendationInstance[],
  board: FleetDispatchBoardData,
  profitCtx?: ProfitabilityContext
): FleetRecommendationInstance[] {
  return recommendations.map((rec) => ({
    ...rec,
    trust: buildRecommendationTrustSurface(rec, board, profitCtx),
  }));
}

export function attachTrustToHistory(
  history: FleetRecommendationHistoryEntry[]
): FleetRecommendationHistoryEntry[] {
  return history.map((entry) => {
    const trust = buildTrustSurfaceFromHistory(entry);
    return trust ? { ...entry, trust } : entry;
  });
}
