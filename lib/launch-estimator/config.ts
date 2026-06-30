import type { BranchCountBand, IntegrationCategoryId, OperationalGoalId } from "./types";

export const STORAGE_KEY = "cornerstone-launch-estimator-v1";

export const INDUSTRY_OPTIONS = [
  "Industrial Services",
  "Waste & Environmental",
  "Utility & Infrastructure",
  "Construction & Heavy Haul",
  "Oil & Gas Field Services",
  "Transportation & Logistics",
  "HVAC & Mechanical",
  "Other",
] as const;

export const BRANCH_COUNT_OPTIONS: { value: BranchCountBand; label: string }[] = [
  { value: "1", label: "1" },
  { value: "2-3", label: "2–3" },
  { value: "4-6", label: "4–6" },
  { value: "7+", label: "7+" },
];

export type IntegrationOption = {
  id: string;
  label: string;
  category: IntegrationCategoryId;
};

export const INTEGRATION_CATEGORIES: {
  id: IntegrationCategoryId;
  title: string;
  options: IntegrationOption[];
}[] = [
  {
    id: "telematics",
    title: "Telematics",
    options: [
      { id: "samsara", label: "Samsara", category: "telematics" },
      { id: "geotab", label: "Geotab", category: "telematics" },
      { id: "motive", label: "Motive", category: "telematics" },
      { id: "verizon_connect", label: "Verizon Connect", category: "telematics" },
      { id: "telematics_other", label: "Other", category: "telematics" },
    ],
  },
  {
    id: "fleet",
    title: "Fleet",
    options: [
      { id: "fleetio", label: "Fleetio", category: "fleet" },
      { id: "whip_around", label: "Whip Around", category: "fleet" },
      { id: "assetworks", label: "AssetWorks", category: "fleet" },
      { id: "fleet_none", label: "None", category: "fleet" },
    ],
  },
  {
    id: "erp",
    title: "ERP / Accounting",
    options: [
      { id: "quickbooks", label: "QuickBooks", category: "erp" },
      { id: "netsuite", label: "NetSuite", category: "erp" },
      { id: "sage", label: "Sage", category: "erp" },
      { id: "acumatica", label: "Acumatica", category: "erp" },
      { id: "dynamics", label: "Dynamics", category: "erp" },
      { id: "erp_other", label: "Other", category: "erp" },
    ],
  },
  {
    id: "field_service",
    title: "Field Service",
    options: [
      { id: "service_titan", label: "ServiceTitan", category: "field_service" },
      { id: "buildops", label: "BuildOps", category: "field_service" },
      { id: "salesforce", label: "Salesforce", category: "field_service" },
      { id: "field_service_other", label: "Other", category: "field_service" },
    ],
  },
  {
    id: "payroll",
    title: "Payroll / HR",
    options: [
      { id: "adp", label: "ADP", category: "payroll" },
      { id: "paylocity", label: "Paylocity", category: "payroll" },
      { id: "ukg", label: "UKG", category: "payroll" },
      { id: "workday", label: "Workday", category: "payroll" },
    ],
  },
  {
    id: "other",
    title: "Other",
    options: [
      { id: "csv", label: "CSV", category: "other" },
      { id: "custom_database", label: "Custom Database", category: "other" },
      { id: "rest_api", label: "REST API", category: "other" },
      { id: "webhooks", label: "Webhooks", category: "other" },
    ],
  },
];

/** Options that do not count as active integrations */
export const NON_INTEGRATION_IDS = new Set(["fleet_none"]);

export const OPERATIONAL_GOALS: { id: OperationalGoalId; label: string }[] = [
  { id: "reduce_deadhead", label: "Reduce deadhead" },
  { id: "increase_utilization", label: "Increase utilization" },
  { id: "improve_dispatch", label: "Improve dispatch" },
  { id: "ai_recommendations", label: "AI recommendations" },
  { id: "executive_dashboards", label: "Executive dashboards" },
  { id: "branch_visibility", label: "Branch visibility" },
  { id: "capacity_planning", label: "Capacity planning" },
  { id: "better_reporting", label: "Better reporting" },
  { id: "reduce_overtime", label: "Reduce overtime" },
  { id: "increase_contribution", label: "Increase contribution" },
];

export const OPPORTUNITY_DISCLAIMER =
  "These ranges are illustrative estimates based on the information provided. Actual results depend on operational practices, data quality, adoption, and implementation scope.";

/** Pricing rules — update here to change estimator output */
export const PRICING_RULES = {
  base: 10_000,
  includedBranches: 1,
  includedTrucks: 25,
  includedIntegrations: 3,
  additionalBranch: 10_000,
  trucksPerBranch26to50: 5_000,
  trucksPerBranch51to100: 10_000,
  additionalIntegration: 1_500,
} as const;

export const CLEAN_PRICE_TIERS = [10_000, 25_000, 40_000, 65_000, 85_000, 100_000] as const;

/** Recurring platform pricing — design-partner pilot tiers */
export const MONTHLY_PRICING_RULES = {
  base: 5_000,
  includedBranches: 1,
  includedTrucks: 25,
  includedIntegrations: 3,
  additionalBranch: 2_500,
  trucksPerBranch26to50: 1_500,
  trucksPerBranch51to100: 3_000,
  additionalIntegration: 500,
} as const;

export const CLEAN_MONTHLY_TIERS = [5_000, 7_500, 10_000, 12_500, 15_000, 20_000] as const;

export function branchCountToNumber(band: BranchCountBand): number {
  switch (band) {
    case "1":
      return 1;
    case "2-3":
      return 2;
    case "4-6":
      return 4;
    case "7+":
      return 7;
    default:
      return 1;
  }
}

export function branchCountDisplay(band: BranchCountBand): string {
  return BRANCH_COUNT_OPTIONS.find((o) => o.value === band)?.label ?? band;
}

export function countActiveIntegrations(selected: string[]): number {
  return selected.filter((id) => !NON_INTEGRATION_IDS.has(id)).length;
}

export function integrationLabels(selected: string[]): string[] {
  const map = new Map<string, string>();
  for (const cat of INTEGRATION_CATEGORIES) {
    for (const opt of cat.options) {
      map.set(opt.id, opt.label);
    }
  }
  return selected
    .filter((id) => !NON_INTEGRATION_IDS.has(id))
    .map((id) => map.get(id) ?? id);
}
