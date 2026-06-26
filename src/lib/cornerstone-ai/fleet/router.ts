/**
 * Fleet Copilot intent classification and context routing.
 */

import type {
  FleetContextPlan,
  FleetCopilotIntent,
  FleetCopilotQueryName,
} from "./types";
import type { CornerstoneAiContext } from "../types";

const SQL_INJECTION_PATTERNS = [
  /\b(select|insert|update|delete|drop|truncate|alter|create)\b[\s\S]{0,40}\b(from|into|table|where|join|database)\b/i,
  /\brun\s+(sql|query|statement)\b/i,
  /\bexecute\s+(sql|query)\b/i,
  /\bunion\s+select\b/i,
];

export function isUnsafeFleetCopilotQuery(query: string): boolean {
  return SQL_INJECTION_PATTERNS.some((p) => p.test(query));
}

export function classifyFleetCopilotIntent(query: string): FleetCopilotIntent {
  const q = query.toLowerCase();

  if (
    /\b(how does|how do|what does|what is|what are|explain|mean|definition|workflow|how to|where do i|what screen)\b/.test(
      q
    ) &&
    !/\b(highest|most|which|today|now)\b/.test(q)
  ) {
    return "product_help";
  }

  if (/\b(samsara|integration|sync|connected|webhook|telematics feed|missing data)\b/.test(q)) {
    return "integration";
  }

  if (
    /\b(recommend|confidence|reject|accept|alternative|why is this truck|why was)\b/.test(q)
  ) {
    return "recommendation";
  }

  if (
    /\b(contribution|revenue|margin|profitable|performance|deadhead cost|utilization trend)\b/.test(
      q
    ) &&
    /\b(branch|truck|operator|highest|most|driving|trend)\b/.test(q)
  ) {
    return "analytics";
  }

  if (/\b(unavailable|offline|idle|unassigned|at risk|exception|blocker|ready|attention|late)\b/.test(q)) {
    return "operational_status";
  }

  if (/\b(fix|broken|not working|error|issue|troubleshoot|why can't)\b/.test(q)) {
    return "troubleshooting";
  }

  if (
    /\b(branch|truck|job|dispatch|fleet|deadhead|contribution|revenue|operator)\b/.test(q)
  ) {
    return "operational_status";
  }

  return "unknown";
}

export function planFleetContext(
  intent: FleetCopilotIntent,
  query: string,
  context?: CornerstoneAiContext
): FleetContextPlan {
  const q = query.toLowerCase();
  const layers: FleetContextPlan["layers"] = [];
  const queries: FleetCopilotQueryName[] = [];
  const productTopics: string[] = [];

  const hasPagePerformance = Boolean(context?.fleet?.pageContext?.branchPerformance?.length);
  const hasSelectedRec = Boolean(context?.fleet?.selectedRecommendation?.id);

  if (hasPagePerformance || hasSelectedRec || context?.fleet?.pageContext) {
    layers.push("page");
  }

  if (intent === "product_help" || /\bwhat does|what is|how does|how do i connect\b/.test(q)) {
    layers.push("product_knowledge");
    productTopics.push("*");
  }

  if (intent !== "product_help") {
    layers.push("database");
  }

  switch (intent) {
    case "analytics":
      if (!hasPagePerformance) queries.push("branch_performance", "truck_performance", "operator_performance");
      if (/\bdeadhead|trend|week\b/.test(q)) queries.push("contribution_trend");
      break;
    case "operational_status":
      if (/\bunavailable|offline|idle|truck\b/.test(q)) queries.push("unavailable_trucks", "fleet_status");
      if (/\bunassigned|at risk|job\b/.test(q)) queries.push("unassigned_jobs", "revenue_at_risk");
      if (/\bexception|blocker|attention\b/.test(q)) queries.push("operational_exceptions");
      if (/\bready|dispatch ready\b/.test(q)) queries.push("dispatch_readiness");
      if (!queries.length) queries.push("fleet_status", "operational_exceptions");
      break;
    case "recommendation":
      if (hasSelectedRec) queries.push("selected_entity", "recommendation_alternatives");
      queries.push("open_recommendations");
      if (/\bconfidence|why\b/.test(q)) productTopics.push("confidence", "soft_scoring");
      break;
    case "integration":
      queries.push("integration_health", "sync_history");
      if (/\bsamsara\b/.test(q)) productTopics.push("connect_samsara", "integrations");
      if (/\bmissing|reliable|required\b/.test(q)) productTopics.push("data_freshness", "implementation_center");
      break;
    case "troubleshooting":
      queries.push("operational_exceptions", "integration_health", "dispatch_readiness");
      break;
    case "product_help":
      break;
    default:
      queries.push("fleet_status", "operational_exceptions");
  }

  if (intent === "recommendation" && !productTopics.includes("confidence")) {
    productTopics.push("recommendations", "recommendation_engine");
  }

  const uniqueLayers = [...new Set(layers.length ? layers : (["database"] as const))];
  const uniqueQueries = [...new Set(queries)];

  return {
    layers: uniqueLayers as FleetContextPlan["layers"],
    queries: uniqueQueries,
    productTopics: [...new Set(productTopics)],
  };
}
