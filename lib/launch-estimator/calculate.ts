import type {
  LaunchEstimatorCrmPayload,
  LaunchEstimatorInput,
  LaunchEstimatorLead,
  LaunchEstimatorResult,
} from "./types";
import { branchCountToNumber, branchCountDisplay, countActiveIntegrations } from "./config";
import { computeComplexity } from "./complexity";
import { computeImplementationPrice, computeTimeline } from "./pricing";
import {
  buildOperationalFocus,
  buildOpportunities,
  OPPORTUNITY_DISCLAIMER,
} from "./opportunities";

export function calculateLaunchEstimate(input: LaunchEstimatorInput): LaunchEstimatorResult {
  const { tier, score } = computeComplexity(input);
  const integrationCount = countActiveIntegrations(input.integrations);
  const pricing = computeImplementationPrice(input);
  const timeline = computeTimeline(tier);

  return {
    complexity: tier,
    complexityScore: score,
    integrationCount,
    estimatedImplementation: pricing.amount,
    estimatedImplementationLabel: `$${pricing.amount.toLocaleString()}`,
    customPlanningRecommended: pricing.customPlanningRecommended,
    timelineLabel: timeline.label,
    timelineWeeksDisplay: timeline.weeksDisplay,
    branchCountNumeric: branchCountToNumber(input.branchCount),
    branchCountDisplay: branchCountDisplay(input.branchCount),
    operationalFocus: buildOperationalFocus(input),
    opportunities: buildOpportunities(input),
    disclaimer: OPPORTUNITY_DISCLAIMER,
  };
}

export function buildCrmPayload(
  input: LaunchEstimatorInput,
  lead: LaunchEstimatorLead,
  result: LaunchEstimatorResult
): LaunchEstimatorCrmPayload {
  return {
    source: "launch_estimator",
    submitted_at: new Date().toISOString(),
    company_name: lead.companyName || input.companyName,
    email: lead.email,
    phone: lead.phone?.trim() || null,
    industry: input.industry,
    branch_count: input.branchCount,
    truck_count: input.truckCount,
    daily_jobs: input.dailyJobs,
    dispatcher_count: input.dispatcherCount,
    integration_count: result.integrationCount,
    integrations: input.integrations,
    goals: input.goals,
    estimated_implementation: result.estimatedImplementation,
    estimated_implementation_label: result.estimatedImplementationLabel,
    complexity: result.complexity,
    timeline: result.timelineLabel,
    custom_planning_recommended: result.customPlanningRecommended,
  };
}

export function normalizeInput(partial: Partial<LaunchEstimatorInput>): LaunchEstimatorInput | null {
  if (
    !partial.companyName?.trim() ||
    !partial.industry?.trim() ||
    !partial.branchCount ||
    partial.truckCount == null ||
    partial.dailyJobs == null ||
    partial.dispatcherCount == null ||
    !partial.integrations ||
    !partial.goals
  ) {
    return null;
  }

  return {
    companyName: partial.companyName.trim(),
    industry: partial.industry.trim(),
    branchCount: partial.branchCount,
    truckCount: partial.truckCount,
    dailyJobs: partial.dailyJobs,
    dispatcherCount: partial.dispatcherCount,
    integrations: partial.integrations,
    goals: partial.goals,
  };
}

export const DEFAULT_INPUT: Partial<LaunchEstimatorInput> = {
  companyName: "",
  industry: "",
  branchCount: "1",
  truckCount: 25,
  dailyJobs: 30,
  dispatcherCount: 2,
  integrations: [],
  goals: [],
};
