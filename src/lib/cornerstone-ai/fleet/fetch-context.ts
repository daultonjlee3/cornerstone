/**
 * Fetch structured context for Fleet Copilot from approved layers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CornerstoneAiContext } from "../types";
import type { FleetContextPlan, FetchedFleetCopilotContext, FleetCopilotQueryName } from "./types";
import { searchFleetProductKnowledge } from "./product-knowledge";
import * as qt from "./query-tools";
import { getRecommendationAlternatives } from "./query-tools";

function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchFleetCopilotContext(
  supabase: SupabaseClient,
  tenantId: string,
  plan: FleetContextPlan,
  query: string,
  context?: CornerstoneAiContext
): Promise<FetchedFleetCopilotContext> {
  const scope: qt.FleetQueryScope = {
    tenantId,
    branchId: context?.fleet?.branchId ?? context?.fleet?.pageContext?.filters?.branch_id ?? null,
    date: context?.fleet?.pageContext?.dateRange?.to ?? todayDateOnly(),
    dateRange: context?.fleet?.pageContext?.dateRange,
  };

  const missingData: string[] = [];
  const sourceLabels: FetchedFleetCopilotContext["sourceLabels"] = [];
  const queries: FetchedFleetCopilotContext["queries"] = {};

  if (plan.layers.includes("page") && context?.fleet?.pageContext) {
    sourceLabels.push({ title: "Current screen data", layer: "page" });
  }
  if (context?.fleet?.selectedRecommendation) {
    sourceLabels.push({ title: "Selected recommendation", layer: "page" });
  }

  const productKnowledge =
    plan.layers.includes("product_knowledge") || plan.productTopics.length
      ? searchFleetProductKnowledge(query, 4).map((t) => ({
          topic: t.id,
          title: t.title,
          content: t.content,
        }))
      : [];

  if (productKnowledge.length) {
    sourceLabels.push({ title: "Fleet Intelligence product guide", layer: "product_knowledge" });
  }

  async function runQuery(name: FleetCopilotQueryName) {
    switch (name) {
      case "branch_performance":
        queries.branch_performance = await qt.getBranchPerformanceSummary(supabase, scope);
        break;
      case "truck_performance":
        queries.truck_performance = await qt.getTruckPerformanceSummary(supabase, scope);
        break;
      case "operator_performance":
        queries.operator_performance = await qt.getOperatorPerformanceSummary(supabase, scope);
        break;
      case "contribution_trend":
        queries.contribution_trend = await qt.getContributionTrend(supabase, scope);
        break;
      case "open_recommendations":
        queries.open_recommendations = await qt.getOpenRecommendations(supabase, scope);
        break;
      case "recommendation_detail": {
        const id = context?.fleet?.selectedRecommendation?.id;
        if (id) queries.recommendation_detail = await qt.getRecommendationById(supabase, tenantId, id);
        break;
      }
      case "recommendation_alternatives": {
        const selId = context?.fleet?.selectedRecommendation?.id;
        if (selId) {
          const detail = await qt.getRecommendationById(supabase, tenantId, selId);
          if (detail.data) {
            queries.recommendation_alternatives = await getRecommendationAlternatives(detail.data);
          }
        } else if (context?.fleet?.selectedRecommendation) {
          // Use page snapshot only — alternatives need full instance
          queries.recommendation_alternatives = {
            data: [],
            meta: { source: "Page context", retrievedAt: new Date().toISOString() },
            missingData: ["full_recommendation_record_for_alternatives"],
          };
        }
        break;
      }
      case "fleet_status":
        queries.fleet_status = await qt.getFleetStatusSummary(supabase, tenantId);
        break;
      case "unavailable_trucks":
        queries.unavailable_trucks = await qt.getUnavailableTrucks(supabase, scope);
        break;
      case "unassigned_jobs":
        queries.unassigned_jobs = await qt.getUnassignedJobs(supabase, scope);
        break;
      case "revenue_at_risk":
        queries.revenue_at_risk = await qt.getRevenueAtRisk(supabase, scope);
        break;
      case "integration_health":
        queries.integration_health = await qt.getIntegrationHealth(supabase, tenantId);
        break;
      case "sync_history":
        queries.sync_history = await qt.getSyncHistory(supabase, tenantId);
        break;
      case "operational_exceptions":
        queries.operational_exceptions = await qt.getOperationalExceptions(supabase, scope);
        break;
      case "dispatch_readiness":
        queries.dispatch_readiness = await qt.getDispatchReadiness(supabase, scope);
        break;
      case "selected_entity":
        queries.selected_entity = await qt.getSelectedEntityContext(
          supabase,
          scope,
          context?.fleet?.selectedRecommendation?.id
        );
        break;
    }

    const result = queries[name];
    if (result?.missingData?.length) missingData.push(...result.missingData);
    if (result?.meta?.source) {
      const label = result.meta.source;
      if (!sourceLabels.some((s) => s.title === label)) {
        sourceLabels.push({ title: label, layer: "database" });
      }
    }
  }

  if (plan.layers.includes("database")) {
    await Promise.all(plan.queries.map((name) => runQuery(name)));
  }

  return {
    pageContext: context?.fleet?.pageContext,
    selectedRecommendation: context?.fleet?.selectedRecommendation,
    productKnowledge,
    queries,
    missingData: [...new Set(missingData)],
    sourceLabels,
  };
}
