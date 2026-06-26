import type { FleetDispatchTruckLane, FleetRecommendationFactors } from "@/src/types/fleet";
import { clamp } from "./scoring-utils";

export function telematicsConfidencePenalty(status: FleetDispatchTruckLane["telematics_status"]): number {
  if (status === "online") return 0;
  if (status === "stale") return 18;
  return 100;
}

export function computeValidationConfidence(args: {
  rankingScore: number;
  telematicsStatus: FleetDispatchTruckLane["telematics_status"];
  factors?: FleetRecommendationFactors;
  constraintViolationCount: number;
  freshness: "current" | "stale";
  operatorOnPto?: boolean;
  snapshotMismatch?: boolean;
}): number {
  let confidence = args.rankingScore * 0.72;

  const telematicsFactor = args.factors?.telematicsFreshness;
  if (typeof telematicsFactor === "number") {
    confidence += (telematicsFactor - 70) * 0.15;
  }

  confidence -= telematicsConfidencePenalty(args.telematicsStatus);

  if (args.telematicsStatus === "stale") {
    confidence -= 8;
  }

  if (args.operatorOnPto) {
    confidence = 0;
  }

  if (args.snapshotMismatch) {
    confidence = Math.min(confidence, 25);
  }

  if (args.freshness === "stale") {
    confidence *= 0.88;
  }

  confidence -= args.constraintViolationCount * 12;

  return clamp(Math.round(confidence), 0, 100);
}
