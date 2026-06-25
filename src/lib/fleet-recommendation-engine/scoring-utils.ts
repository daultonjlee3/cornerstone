import type {
  FleetDispatchJob,
  FleetDispatchTruckLane,
  FleetRecommendationFactors,
} from "@/src/types/fleet";

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeScore(value: number): number {
  return Math.round(clamp(value) * 100) / 100;
}

export function parseJobHours(job: FleetDispatchJob): number {
  const start = job.scheduled_start ? Date.parse(job.scheduled_start) : Number.NaN;
  const end = job.scheduled_end ? Date.parse(job.scheduled_end) : Number.NaN;
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.min(8, Math.max(0.5, (end - start) / (1000 * 60 * 60)));
  }
  return 2;
}

export function priorityWeight(priority: FleetDispatchJob["priority"]): number {
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

export function freshnessFactor(status: FleetDispatchTruckLane["telematics_status"]): number {
  switch (status) {
    case "online":
      return 100;
    case "stale":
      return 65;
    default:
      return 30;
  }
}

export function computeCompositeScore(factors: FleetRecommendationFactors): number {
  const hasProfitability =
    factors.profitabilityImpact != null ||
    factors.laborCostImpact != null ||
    factors.overtimeRiskImpact != null;

  if (!hasProfitability) {
    const raw =
      factors.travelImpact * 0.35 +
      factors.utilizationImpact * 0.25 +
      factors.capacityImpact * 0.25 +
      factors.telematicsFreshness * 0.15;
    return normalizeScore(raw);
  }

  const profitability = factors.profitabilityImpact ?? 50;
  const labor = factors.laborCostImpact ?? 50;
  const overtime = factors.overtimeRiskImpact ?? 50;
  const sla = factors.slaRiskImpact ?? 50;

  const raw =
    factors.travelImpact * 0.2 +
    factors.utilizationImpact * 0.12 +
    factors.capacityImpact * 0.12 +
    factors.telematicsFreshness * 0.08 +
    profitability * 0.28 +
    labor * 0.1 +
    overtime * 0.05 +
    sla * 0.05;
  return normalizeScore(raw);
}

export function gpsFreshnessLabel(status: FleetDispatchTruckLane["telematics_status"]): string {
  switch (status) {
    case "online":
      return "Current";
    case "stale":
      return "Delayed";
    default:
      return "Unavailable";
  }
}

export function branchCapacityLabel(utilization: number): string {
  if (utilization >= 1) return "Overloaded";
  if (utilization >= 0.85) return "Near limit";
  if (utilization >= 0.65) return "Moderate";
  return "Healthy";
}
