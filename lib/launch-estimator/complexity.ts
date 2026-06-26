import type { BranchCountBand, ComplexityTier, LaunchEstimatorInput } from "./types";
import { branchCountToNumber, countActiveIntegrations } from "./config";

/** Internal weighted score — not exposed in UI */
export function computeComplexityScore(input: LaunchEstimatorInput): number {
  const branches = branchCountToNumber(input.branchCount);
  const integrations = countActiveIntegrations(input.integrations);

  let score = 0;

  score += branches === 1 ? 4 : branches <= 3 ? 10 : branches <= 6 ? 18 : 28;
  score += input.truckCount <= 25 ? 4 : input.truckCount <= 50 ? 10 : input.truckCount <= 100 ? 18 : 28;
  score += integrations <= 2 ? 4 : integrations <= 4 ? 10 : integrations <= 6 ? 16 : 24;
  score += input.dispatcherCount <= 2 ? 3 : input.dispatcherCount <= 5 ? 8 : 14;
  score += input.dailyJobs <= 30 ? 3 : input.dailyJobs <= 80 ? 8 : input.dailyJobs <= 150 ? 14 : 20;
  score += input.goals.length >= 6 ? 6 : input.goals.length >= 3 ? 3 : 0;

  if (branches >= 7 || input.truckCount > 100 || integrations >= 8) {
    score += 12;
  }

  return score;
}

export function scoreToComplexityTier(score: number): ComplexityTier {
  if (score >= 66) return "Enterprise";
  if (score >= 46) return "High";
  if (score >= 26) return "Medium";
  return "Low";
}

export function computeComplexity(input: LaunchEstimatorInput): {
  tier: ComplexityTier;
  score: number;
} {
  const score = computeComplexityScore(input);
  return { tier: scoreToComplexityTier(score), score };
}

export function trucksPerBranch(truckCount: number, branchBand: BranchCountBand): number {
  const branches = Math.max(1, branchCountToNumber(branchBand));
  return Math.ceil(truckCount / branches);
}
