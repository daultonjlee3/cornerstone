export const FLEET_KPI_IDS = [
  "active-trucks",
  "idle-offline",
  "jobs-today",
  "utilization",
  "est-contribution",
  "deadhead-cost",
  "overtime-risk",
  "acceptance-rate",
] as const;

export type FleetKpiId = (typeof FLEET_KPI_IDS)[number];

export type FleetInsightTab = "overview" | "records" | "recommendations" | "history";

export type FleetInsightColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type FleetInsightRecord = Record<string, string | number | null>;

export type FleetInsightAction = {
  id: string;
  label: string;
  href: string;
};

export type FleetInsightRecommendation = {
  id: string;
  title: string;
  detail: string;
  impact?: string;
  href?: string;
};

export type FleetInsightTrend = {
  label: string;
  direction: "improved" | "declined" | "unchanged" | "unknown";
  value?: string;
};

export type FleetInsightSummaryItem = {
  label: string;
  value: string;
};

export type FleetInsightGroup = {
  id: string;
  label: string;
  count: number;
};

export type FleetKpiInsightPayload = {
  kpiId: FleetKpiId;
  title: string;
  description: string;
  lastUpdated: string;
  primaryValue: string;
  primaryLabel: string;
  trend?: FleetInsightTrend;
  summary: FleetInsightSummaryItem[];
  groups?: FleetInsightGroup[];
  records: FleetInsightRecord[];
  columns: FleetInsightColumn[];
  recommendations: FleetInsightRecommendation[];
  history: FleetInsightRecord[];
  historyColumns: FleetInsightColumn[];
  impactSummary: {
    estimatedImpact?: string;
    revenueProtected?: string;
    timeSaved?: string;
    operationalScore?: string;
  };
  actions: FleetInsightAction[];
};

export type FleetKpiRegistryEntry = {
  id: FleetKpiId;
  title: string;
  description: string;
};
