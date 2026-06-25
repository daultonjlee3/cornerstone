import type { FleetRecommendationInstance } from "@/src/types/fleet";

export type RecommendationConfidence = "high" | "medium" | "low";

export function recommendationConfidence(rec: FleetRecommendationInstance): RecommendationConfidence {
  const factors = rec.rationale.factors;
  const telematics = factors?.telematicsFreshness ?? 30;
  if (rec.score >= 75 && telematics >= 90) return "high";
  if (rec.score >= 55 && telematics >= 65) return "medium";
  return "low";
}

export function confidenceLabel(confidence: RecommendationConfidence): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    default:
      return "Low confidence";
  }
}

export function formatRecommendationType(value: string): string {
  return value.replaceAll("_", " ");
}

export function factorLabel(key: keyof FleetRecommendationInstance["rationale"]["factors"]): string {
  switch (key) {
    case "travelImpact":
      return "Travel";
    case "utilizationImpact":
      return "Utilization";
    case "capacityImpact":
      return "Capacity";
    case "telematicsFreshness":
      return "GPS freshness";
    case "profitabilityImpact":
      return "Contribution";
    case "laborCostImpact":
      return "Labor cost";
    case "overtimeRiskImpact":
      return "Overtime risk";
    case "slaRiskImpact":
      return "SLA risk";
    default:
      return key;
  }
}
