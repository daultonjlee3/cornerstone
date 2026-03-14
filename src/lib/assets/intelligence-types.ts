export type HealthCategory = "excellent" | "good" | "warning" | "poor" | "critical";

export type AssetInsightSeverity = "low" | "medium" | "high" | "critical";

export type AssetIntelligenceInsightType =
  | "critical_asset_health"
  | "high_failure_risk"
  | "replacement_candidate"
  | "recurring_failure_pattern"
  | "abnormal_repair_frequency"
  | "pm_compliance_risk"
  | "downtime_risk"
  | "parts_replacement_frequency"
  | "maintenance_cost_pressure";

export type AssetIntelligenceInsight = {
  id: string;
  type: AssetIntelligenceInsightType;
  severity: AssetInsightSeverity;
  title: string;
  description: string;
  assetId: string;
  assetName: string;
  recommendation: string;
  createdAt: string;
  companyId?: string | null;
};

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

/** Canonical timeline event types for display and future extension (e.g. predictive, sensor, warranty). */
export type AssetTimelineEventType =
  | "WORK_ORDER_COMPLETED"
  | "WORK_ORDER_CREATED"
  | "PM_COMPLETED"
  | "PM_CREATED"
  | "ASSET_UPDATED"
  | "SUB_ASSET_ADDED"
  | "SUB_ASSET_MOVED"
  | "SUB_ASSET_REMOVED"
  | "PART_USED"
  | "NOTE_ADDED"
  | "ASSET_CREATED"
  | "ASSET_INSTALLATION"
  | "ASSET_EVENT";

export type AssetTimelineEvent = {
  id: string;
  eventAt: string;
  eventType: string;
  /** Canonical type for icons and grouping (maps from eventType when possible). */
  canonicalType?: AssetTimelineEventType;
  source: string;
  summary: string;
  details: string | null;
  technicianName: string | null;
  technicianId: string | null;
  workOrderId: string | null;
  workOrderNumber: string | null;
  /** When event is for a sub-asset, show on parent timeline with this context. */
  subAssetId: string | null;
  subAssetName: string | null;
  /** User who performed the action (e.g. from activity_log performed_by). */
  userName: string | null;
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
  topInsights: AssetIntelligenceInsight[];
  failurePatterns: {
    patternKey: string;
    label: string;
    occurrences: number;
    affectedAssets: number;
    severity: AssetInsightSeverity;
    recommendation: string;
  }[];
  replacementCandidates: {
    id: string;
    assetName: string;
    healthScore: number | null;
    failureRisk: number | null;
    expectedLifeYears: number | null;
    ageYears: number | null;
    maintenanceCostLast12Months: number;
    replacementCost: number | null;
    maintenancePercentOfReplacement: number | null;
    recommendation: string;
    severity: AssetInsightSeverity;
  }[];
  maintenanceCostLeaderboard: {
    id: string;
    assetName: string;
    maintenanceCostLast12Months: number;
    replacementCost: number | null;
    maintenancePercentOfReplacement: number | null;
    recommendation: string;
    severity: AssetInsightSeverity;
  }[];
};
