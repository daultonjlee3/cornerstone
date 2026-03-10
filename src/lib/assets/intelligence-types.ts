export type HealthCategory = "excellent" | "good" | "warning" | "poor" | "critical";

export type AssetInsightSeverity = "low" | "medium" | "high" | "critical";

export type AssetInsightRecord = {
  id: string;
  asset_id: string;
  pattern_type: string;
  frequency: number;
  recommendation: string;
  severity: AssetInsightSeverity;
  metadata: Record<string, unknown>;
  detected_at: string;
  last_seen_at: string;
  is_active: boolean;
};

export type AssetHealthBreakdown = {
  assetId: string;
  healthScore: number;
  failureRisk: number;
  healthCategory: HealthCategory;
  maintenanceCostLast12Months: number;
  replacementCost: number | null;
  expectedLifeYears: number | null;
  ageYears: number | null;
  remainingLifeYears: number | null;
  repairVsReplaceRatio: number | null;
  maintenanceSummary: {
    totalWorkOrdersLast12Months: number;
    repairWorkOrdersLast12Months: number;
    recurringIssueCount: number;
    overduePmCount: number;
    downtimeHoursLast12Months: number;
    negativeTechnicianNoteSignals: number;
  };
  factors: {
    label: string;
    impact: number;
    reason: string;
  }[];
  recommendation: string;
  lastCalculatedAt: string;
};

export type AssetFailureRiskResult = {
  assetId: string;
  failureRisk: number;
  healthCategory: HealthCategory;
  riskLabel: "low" | "moderate" | "high" | "urgent";
};

export type AssetTimelineEvent = {
  id: string;
  eventAt: string;
  eventType: string;
  source: string;
  summary: string;
  details: string | null;
  technicianName: string | null;
  technicianId: string | null;
  workOrderId: string | null;
  workOrderNumber: string | null;
};

export type AssetIntelligenceDashboard = {
  generatedAt: string;
  portfolio: {
    totalAssets: number;
    pmComplianceRate: number;
    assetsNearingEndOfLife: number;
  };
  healthDistribution: {
    category: HealthCategory;
    count: number;
  }[];
  highFailureRiskAssets: {
    id: string;
    assetName: string;
    companyId: string;
    healthScore: number | null;
    failureRisk: number | null;
    maintenanceCostLast12Months: number;
  }[];
  recurringIssues: {
    assetId: string;
    assetName: string;
    patternType: string;
    frequency: number;
    severity: AssetInsightSeverity;
    recommendation: string;
  }[];
  maintenanceCostLeaderboard: {
    id: string;
    assetName: string;
    maintenanceCostLast12Months: number;
    replacementCost: number | null;
  }[];
};
