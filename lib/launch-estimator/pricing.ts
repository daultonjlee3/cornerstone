import type { ComplexityTier, LaunchEstimatorInput } from "./types";
import {
  branchCountToNumber,
  CLEAN_PRICE_TIERS,
  countActiveIntegrations,
  PRICING_RULES,
} from "./config";
import { computeComplexity, trucksPerBranch } from "./complexity";

function snapToCleanPrice(raw: number): number {
  for (const tier of CLEAN_PRICE_TIERS) {
    if (raw <= tier * 1.15) return tier;
  }
  return Math.ceil(raw / 10_000) * 10_000;
}

export function computeRawImplementationPrice(input: LaunchEstimatorInput): {
  raw: number;
  customPlanningRecommended: boolean;
} {
  const rules = PRICING_RULES;
  const branches = branchCountToNumber(input.branchCount);
  const integrations = countActiveIntegrations(input.integrations);
  const perBranchTrucks = trucksPerBranch(input.truckCount, input.branchCount);

  let total = rules.base;

  const extraBranches = Math.max(0, branches - rules.includedBranches);
  total += extraBranches * rules.additionalBranch;

  if (perBranchTrucks > 25 && perBranchTrucks <= 50) {
    total += rules.trucksPerBranch26to50;
  } else if (perBranchTrucks > 50 && perBranchTrucks <= 100) {
    total += rules.trucksPerBranch51to100;
  }

  const extraIntegrations = Math.max(0, integrations - rules.includedIntegrations);
  total += extraIntegrations * rules.additionalIntegration;

  const { tier } = computeComplexity(input);
  const customPlanningRecommended =
    tier === "Enterprise" || perBranchTrucks > 100 || branches >= 7 || integrations >= 10;

  return { raw: total, customPlanningRecommended };
}

export function computeImplementationPrice(input: LaunchEstimatorInput): {
  amount: number;
  label: string;
  customPlanningRecommended: boolean;
} {
  const { raw, customPlanningRecommended } = computeRawImplementationPrice(input);
  const amount = snapToCleanPrice(raw);
  const label = customPlanningRecommended
    ? `$${amount.toLocaleString()} + custom planning`
    : `$${amount.toLocaleString()}`;
  return { amount, label, customPlanningRecommended };
}

export function computeTimeline(complexity: ComplexityTier): {
  label: string;
  weeksDisplay: string;
} {
  switch (complexity) {
    case "Low":
      return { label: "2–3 weeks", weeksDisplay: "3 Weeks" };
    case "Medium":
      return { label: "3–5 weeks", weeksDisplay: "4 Weeks" };
    case "High":
      return { label: "5–8 weeks", weeksDisplay: "6 Weeks" };
    case "Enterprise":
      return { label: "Custom rollout", weeksDisplay: "Custom" };
    default:
      return { label: "3–5 weeks", weeksDisplay: "4 Weeks" };
  }
}

export function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}
