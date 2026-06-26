/**
 * Fleet Intelligence Copilot — routing, context, and response contract types.
 */

export type FleetCopilotIntent =
  | "analytics"
  | "operational_status"
  | "recommendation"
  | "product_help"
  | "integration"
  | "troubleshooting"
  | "unknown";

export type FleetContextLayer = "page" | "database" | "product_knowledge";

export type FleetContextPlan = {
  layers: FleetContextLayer[];
  queries: FleetCopilotQueryName[];
  productTopics: string[];
};

export type FleetCopilotQueryName =
  | "branch_performance"
  | "truck_performance"
  | "operator_performance"
  | "contribution_trend"
  | "open_recommendations"
  | "recommendation_detail"
  | "recommendation_alternatives"
  | "fleet_status"
  | "unavailable_trucks"
  | "unassigned_jobs"
  | "revenue_at_risk"
  | "integration_health"
  | "sync_history"
  | "operational_exceptions"
  | "dispatch_readiness"
  | "selected_entity";

export type CopilotQueryMeta = {
  source: string;
  retrievedAt: string;
  dateRange?: { from: string; to: string };
  branchId?: string | null;
};

export type CopilotQueryResult<T> = {
  data: T | null;
  meta: CopilotQueryMeta;
  missingData?: string[];
};

export type FleetCopilotSourceLabel = {
  title: string;
  layer: FleetContextLayer;
};

export type FleetCopilotAnswerMeta = {
  sourcesUsed: FleetCopilotSourceLabel[];
  confidence: "high" | "medium" | "low";
  dataFreshness?: string;
  missingData: string[];
  answerMethod: "deterministic" | "llm" | "product_knowledge";
};

export type DeterministicFleetAnswer = {
  answer: string;
  meta: FleetCopilotAnswerMeta;
  followUpSuggestions?: string[];
  bulletHighlights?: string[];
};

export type FetchedFleetCopilotContext = {
  pageContext?: import("../types").FleetCopilotPageContext;
  selectedRecommendation?: import("../types").FleetCopilotRecommendationSnapshot;
  productKnowledge: Array<{ topic: string; title: string; content: string }>;
  queries: Partial<Record<FleetCopilotQueryName, CopilotQueryResult<unknown>>>;
  missingData: string[];
  sourceLabels: FleetCopilotSourceLabel[];
};
