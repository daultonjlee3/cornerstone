/**
 * Fleet Intelligence Copilot execution pipeline.
 * Context routing → deterministic answers → LLM synthesis (read-only).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { can } from "@/src/lib/permissions";
import type { CornerstoneAiContext, CornerstoneAiResponse } from "../types";
import { formatAiResponse } from "../format";
import { callCornerstoneLlm } from "../llm";
import {
  checkAiQuotaBeforeRequest,
  recordAiUsage,
  resolveAiExecutionMode,
  estimateAiRequestCost,
} from "@/src/lib/ai/metering";
import { costUsdToCredits } from "@/src/lib/ai/credits";
import {
  classifyFleetCopilotIntent,
  isUnsafeFleetCopilotQuery,
  planFleetContext,
} from "./router";
import { fetchFleetCopilotContext } from "./fetch-context";
import { tryDeterministicFleetAnswer } from "./deterministic";
import { buildFleetCopilotLlmPrompt, stringifySourcesForUi } from "./prompt-builder";

const FEATURE_KEY = "cornerstone_ai";

export type ExecuteFleetCopilotParams = {
  supabase: SupabaseClient;
  tenantId: string;
  userId?: string | null;
  query: string;
  context?: CornerstoneAiContext;
  isPlatformSuperAdmin?: boolean;
};

function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

function toCornerstoneResponse(
  answer: string,
  options: {
    sources: { title: string }[];
    followUpSuggestions?: string[];
    bulletHighlights?: string[];
    fleetCopilot: CornerstoneAiResponse["fleetCopilot"];
    mode?: "FULL" | "LIGHT";
    quotaStatus?: CornerstoneAiResponse["quotaStatus"];
    warnings?: string[];
  }
): CornerstoneAiResponse {
  return {
    intent: "OPS_QUERY",
    answer,
    bulletHighlights: options.bulletHighlights ?? [],
    sources: options.sources,
    followUpSuggestions: options.followUpSuggestions ?? [],
    mode: options.mode ?? "LIGHT",
    quotaStatus: options.quotaStatus,
    warnings: options.warnings ?? [],
    fleetCopilot: options.fleetCopilot,
  };
}

export async function executeFleetCopilotRequest(
  params: ExecuteFleetCopilotParams
): Promise<CornerstoneAiResponse> {
  const { supabase, tenantId, userId, query, context, isPlatformSuperAdmin } = params;
  const trimmed = query.trim();

  if (!trimmed) {
    return toCornerstoneResponse("Please ask about dispatch, fleet status, revenue risk, or today's plan.", {
      sources: [],
      fleetCopilot: {
        sourcesUsed: [],
        confidence: "low",
        missingData: ["empty_query"],
        answerMethod: "deterministic",
      },
    });
  }

  if (isUnsafeFleetCopilotQuery(trimmed)) {
    return toCornerstoneResponse(
      "I can't run custom SQL or database commands. Ask about fleet operations in plain language — for example: which trucks are unavailable, or what branch has the highest contribution.",
      {
        sources: [{ title: "Fleet Copilot security policy" }],
        fleetCopilot: {
          sourcesUsed: [{ title: "Security policy", layer: "product_knowledge" }],
          confidence: "high",
          missingData: [],
          answerMethod: "deterministic",
        },
      }
    );
  }

  const hasFleetAccess = await can("fleet.view");
  if (!hasFleetAccess) {
    return toCornerstoneResponse(
      "You don't have permission to view fleet operational data. Contact your administrator for Fleet Intelligence access.",
      {
        sources: [],
        fleetCopilot: {
          sourcesUsed: [],
          confidence: "high",
          missingData: ["permission_denied"],
          answerMethod: "deterministic",
        },
      }
    );
  }

  const intent = classifyFleetCopilotIntent(trimmed);
  const plan = planFleetContext(intent, trimmed, context);
  const fetched = await fetchFleetCopilotContext(supabase, tenantId, plan, trimmed, context);

  const deterministic = tryDeterministicFleetAnswer(trimmed, intent, fetched, context);
  if (deterministic) {
    return toCornerstoneResponse(deterministic.answer, {
      sources: deterministic.meta.sourcesUsed.map((s) => ({ title: s.title })),
      followUpSuggestions: deterministic.followUpSuggestions,
      bulletHighlights: deterministic.bulletHighlights,
      fleetCopilot: deterministic.meta,
    });
  }

  if (
    fetched.missingData.includes("no_operational_data") ||
    (Object.keys(fetched.queries).length === 0 &&
      !fetched.productKnowledge.length &&
      !fetched.pageContext &&
      !fetched.selectedRecommendation)
  ) {
    return toCornerstoneResponse(
      "I don't have enough data to answer that reliably. Connect integrations, import fleet data, and open the relevant screen (Dispatch, Command Center, or Fleet Performance).",
      {
        sources: [],
        followUpSuggestions: [
          "Which integrations are unhealthy?",
          "What data is missing before recommendations are reliable?",
          "Is dispatch ready?",
        ],
        fleetCopilot: {
          sourcesUsed: [],
          confidence: "low",
          missingData: fetched.missingData.length ? fetched.missingData : ["no_context"],
          answerMethod: "deterministic",
        },
      }
    );
  }

  const built = buildFleetCopilotLlmPrompt(trimmed, fetched);
  const inputEstimate = estimateTokens(built.system + built.user);

  let mode: "FULL" | "LIGHT";
  let decision: Awaited<ReturnType<typeof checkAiQuotaBeforeRequest>>;

  if (isPlatformSuperAdmin) {
    mode = "LIGHT";
    decision = {
      allowed: true,
      mode: "LIGHT",
      reason: "Bypassed quota for platform super admin.",
      warning: null,
      softLimitReached: false,
      hardLimitReached: false,
      remainingEstimatedBudgetUsd: Number.POSITIVE_INFINITY,
      remainingCredits: Number.POSITIVE_INFINITY,
      uiMessage: null,
    };
  } else {
    decision = await checkAiQuotaBeforeRequest(tenantId, supabase, {
      requestedMode: "FULL",
      inputTokens: inputEstimate,
      outputTokens: 512,
      featureKey: FEATURE_KEY,
    });
    mode = resolveAiExecutionMode(decision) as "FULL" | "LIGHT";
  }

  const llm = await callCornerstoneLlm(built.system, built.user, mode);
  const modelShort = llm.model.includes("/") ? llm.model.slice(llm.model.indexOf("/") + 1) : llm.model;
  const costUsd = estimateAiRequestCost(llm.provider, modelShort, llm.inputTokens, llm.outputTokens);

  await recordAiUsage(supabase, {
    tenantId,
    userId: userId ?? null,
    featureKey: isPlatformSuperAdmin ? `${FEATURE_KEY}_internal` : FEATURE_KEY,
    provider: llm.provider,
    model: llm.model,
    mode,
    inputTokens: llm.inputTokens,
    outputTokens: llm.outputTokens,
    estimatedTotalCostUsd: costUsd,
    creditsUsed: costUsdToCredits(costUsd),
    status: "SUCCESS",
    metadata: { intent: "fleet_copilot", fleetIntent: intent },
  });

  const warnings: string[] = [];
  if (decision.warning) warnings.push(decision.warning);

  const sources = stringifySourcesForUi(
    fetched.sourceLabels,
    context?.fleet?.pageContext?.dateRange
  );

  const latestFreshness = Object.values(fetched.queries)
    .map((q) => q?.meta.retrievedAt)
    .filter(Boolean)
    .sort()
    .pop();

  const formatted = formatAiResponse(llm.content, "OPS_QUERY", mode, {
    sources,
    warnings,
    quotaStatus: {
      remainingBudgetUsd: decision.remainingEstimatedBudgetUsd,
      remainingCredits: decision.remainingCredits,
    },
  });

  return {
    ...formatted,
    fleetCopilot: {
      sourcesUsed: fetched.sourceLabels,
      confidence: fetched.missingData.length ? "medium" : "high",
      dataFreshness: latestFreshness,
      missingData: fetched.missingData,
      answerMethod: "llm",
    },
  };
}
