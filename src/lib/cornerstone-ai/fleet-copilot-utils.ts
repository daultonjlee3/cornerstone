import type { FleetRecommendationInstance } from "@/src/types/fleet";
import type { FleetCopilotRecommendationSnapshot } from "./types";

export function recommendationConfidence(
  rec: FleetRecommendationInstance
): "high" | "medium" | "low" {
  if (rec.score >= 0.85) return "high";
  if (rec.score >= 0.65) return "medium";
  return "low";
}

export function snapshotFromRecommendation(
  rec: FleetRecommendationInstance
): FleetCopilotRecommendationSnapshot {
  const top = rec.rationale.candidates?.[0];
  const snapshot = rec.rationale.candidate_snapshots?.[0];
  const job = rec.rationale.entities;
  const confidence = recommendationConfidence(rec);
  const reasons = rec.rationale.reasons ?? [];

  return {
    id: rec.id,
    title: rec.rationale.title,
    recommendation_type: rec.recommendation_type,
    status: rec.status,
    score: rec.score,
    confidence,
    confidence_explanation:
      reasons.length > 0
        ? reasons.slice(0, 3).join(" ")
        : "Confidence reflects travel estimates, branch capacity, telematics freshness, and profitability impact.",
    job_id: job?.job_id ?? null,
    job_title: rec.rationale.title ?? null,
    recommended_truck_id: top?.truck_id ?? null,
    recommended_unit_number: top?.unit_number ?? snapshot?.unit_number ?? null,
    winner_reasons: reasons,
    loser_reasons: [],
    projected_outcome: undefined,
    expires_at: rec.expires_at,
    factors: rec.rationale.factors,
    deadhead_miles: snapshot?.deadhead_miles ?? null,
    travel_minutes: snapshot?.travel_minutes ?? null,
  };
}
