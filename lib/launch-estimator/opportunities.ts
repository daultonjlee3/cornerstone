import type { LaunchEstimatorInput, OpportunityEstimate } from "./types";
import { OPPORTUNITY_DISCLAIMER } from "./config";

export function buildOperationalFocus(input: LaunchEstimatorInput): string[] {
  const items = [
    "Integration setup",
    "Fleet onboarding",
    "Historical baseline",
    "AI recommendation tuning",
    "Dispatcher training",
    "Go live",
  ];

  const goalSet = new Set(input.goals);

  if (
    goalSet.has("executive_dashboards") ||
    goalSet.has("better_reporting") ||
    goalSet.has("branch_visibility")
  ) {
    items.splice(5, 0, "Executive dashboards");
  }

  if (goalSet.has("capacity_planning") || goalSet.has("branch_visibility")) {
    items.splice(4, 0, "Branch capacity modeling");
  }

  return items;
}

export function buildOpportunities(input: LaunchEstimatorInput): OpportunityEstimate[] {
  const integrations = input.integrations.filter((id) => id !== "fleet_none").length;
  const hasTelematics = input.integrations.some((id) =>
    ["samsara", "geotab", "motive", "verizon_connect", "telematics_other"].includes(id)
  );

  let deadheadRange = "3–8%";
  if (hasTelematics && input.truckCount >= 20) deadheadRange = "5–15%";
  if (input.goals.includes("reduce_deadhead")) deadheadRange = "8–18%";

  let dispatchRange = "15–35%";
  if (input.dispatcherCount >= 3 || input.dailyJobs >= 50) dispatchRange = "20–50%";

  let utilizationRange = "2–6%";
  if (input.truckCount >= 30) utilizationRange = "3–10%";
  if (input.goals.includes("increase_utilization")) utilizationRange = "5–12%";

  let coverageRange = "70–85%";
  if (integrations >= 4) coverageRange = "80–95%";
  if (integrations >= 6 && hasTelematics) coverageRange = "85–95%";

  return [
    { label: "Potential deadhead reduction opportunity", value: deadheadRange },
    { label: "Dispatcher planning efficiency opportunity", value: dispatchRange },
    { label: "Fleet utilization opportunity", value: utilizationRange },
    { label: "Operational visibility", value: "Real-time" },
    { label: "Recommendation coverage", value: `${coverageRange} of dispatchable work` },
  ];
}

export { OPPORTUNITY_DISCLAIMER };
