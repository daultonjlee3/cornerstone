/**
 * Cornerstone AI request pipeline: classify → retrieve → prompt → quota → LLM → record → format.
 * Server-only. All model usage and retrieval are tenant-scoped.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyAiIntent } from "./intent";
import type { CornerstoneAiContext, CornerstoneAiResponse } from "./types";
import * as help from "./help";
import * as retrieval from "./retrieval";
import { buildAiPrompt } from "./prompts";
import type { RetrievedHelpContext, RetrievedOpsContext, RetrievedSummaryContext } from "./prompts";
import { callCornerstoneLlm } from "./llm";
import { formatAiResponse, sourcesFromHelpSections } from "./format";
import {
  checkAiQuotaBeforeRequest,
  recordAiUsage,
  resolveAiExecutionMode,
  estimateAiRequestCost,
} from "@/src/lib/ai/metering";
import { costUsdToCredits } from "@/src/lib/ai/credits";

const FEATURE_KEY = "cornerstone_ai";

/** Rough token estimate (chars / 4) for quota pre-check. */
function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

export type ExecuteAiRequestParams = {
  supabase: SupabaseClient;
  tenantId: string;
  userId?: string | null;
  companyIds: string[];
  query: string;
  context?: CornerstoneAiContext;
  /** Platform super admins bypass tenant quota but still record usage. */
  isPlatformSuperAdmin?: boolean;
};

/**
 * Run the full pipeline and return a structured response.
 * Throws on quota block or LLM/config errors.
 */
export async function executeCornerstoneAiRequest(
  params: ExecuteAiRequestParams
): Promise<CornerstoneAiResponse> {
  const { supabase, tenantId, userId, companyIds, query, context, isPlatformSuperAdmin } = params;
  const trimmed = query?.trim() || "";
  if (!trimmed) {
    return formatAiResponse(
      "Please ask a question or request a summary.",
      "UNKNOWN",
      "LIGHT",
      { warnings: ["No query provided."] }
    );
  }

  const intent = classifyAiIntent(trimmed, {
    entityType: context?.entityType,
    entityId: context?.entityId,
  });

  let system = "";
  let user = "";
  let sources: { title: string; moduleKey?: string; path?: string }[] = [];

  if (intent === "HELP") {
    const sections = help.searchHelpDocs(trimmed).length
      ? help.searchHelpDocs(trimmed)
      : help.getAllHelpSections().slice(0, 8);
    const retrieved: RetrievedHelpContext = { sections };
    const built = buildAiPrompt(intent, trimmed, retrieved);
    system = built.system;
    user = built.user;
    sources = sourcesFromHelpSections(sections);
  } else if (intent === "OPS_QUERY") {
    const q = trimmed.toLowerCase();
    const today = new Date().toISOString().slice(0, 10);
    const ops: RetrievedOpsContext = {};

    if (/\boverdue\b/.test(q) || /\bdue\s+today\b/.test(q)) {
      ops.workOrders = await retrieval.getOpenWorkOrderSummary(supabase, companyIds, {
        overdue: /\boverdue\b/.test(q),
        dueToday: /\bdue\s+today\b/.test(q),
        limit: 25,
      });
    }
    if (/\bpm\b|\bpreventive\b|\bscheduled\b/.test(q) || /\bdue\s+this\s+week\b/.test(q)) {
      ops.pmDue = await retrieval.getDuePmSummary(supabase, companyIds, {
        dueBy: today,
        limit: 20,
      });
    }
    if (/\btechnician\b|\btech\b|\bworkload\b|\boverloaded\b|\bschedule\b/.test(q)) {
      ops.technicianWorkload = await retrieval.getTechnicianWorkloadSummary(supabase, companyIds, {
        from: today,
        to: today,
      });
    }
    if (!ops.workOrders?.length && !ops.pmDue?.length && !ops.technicianWorkload?.length) {
      ops.workOrders = await retrieval.getOpenWorkOrderSummary(supabase, companyIds, { limit: 25 });
      ops.listSummary = await retrieval.getListSummaryContext(supabase, companyIds, "work_orders");
    } else if (!ops.listSummary) {
      ops.listSummary = await retrieval.getListSummaryContext(supabase, companyIds, "work_orders");
    }

    // Derived metrics and signals for analyst-style prompts
    const wo = ops.workOrders ?? [];
    const totalOpen = ops.listSummary?.total ?? wo.length;
    const todayDate = today;
    const overdue = wo.filter(
      (w) => w.due_date && w.due_date < todayDate
    ).length;
    const highPriority = wo.filter((w) =>
      (w.priority ?? "").toLowerCase().match(/high|urgent|emergency/)
    ).length;
    const unassigned = wo.filter((w) => !w.assigned_to).length;
    const percentOverdue =
      totalOpen > 0 ? Math.round((overdue / totalOpen) * 100) : 0;
    const percentHighPriority =
      totalOpen > 0 ? Math.round((highPriority / totalOpen) * 100) : 0;

    // Top locations by open count (using first segment of location)
    if (wo.length) {
      const byLocation = new Map<string, number>();
      for (const w of wo) {
        if (!w.location) continue;
        const label = String(w.location).split(" / ")[0] || "Unknown";
        byLocation.set(label, (byLocation.get(label) ?? 0) + 1);
      }
      const topLocations = Array.from(byLocation.entries())
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      if (!ops.breakdowns) ops.breakdowns = {};
      ops.breakdowns.topLocations = topLocations;
      if (topLocations.length) {
        const top = topLocations[0];
        ops.signals = ops.signals ?? {};
        ops.signals.backlogConcentration = `${top.label} has the largest share of open work (${top.count} orders).`;
      }
    }

    // Technician workload top list
    if (ops.technicianWorkload?.length) {
      const topTechs = [...ops.technicianWorkload]
        .sort((a, b) => b.open_count - a.open_count)
        .slice(0, 3)
        .map((t) => ({
          name: t.technician_name ?? t.technician_id,
          openCount: t.open_count,
        }));
      if (!ops.breakdowns) ops.breakdowns = {};
      ops.breakdowns.topTechnicians = topTechs;
    }

    ops.summary = {
      totalOpen,
      overdue,
      highPriority,
      unassigned,
    };
    ops.derivedMetrics = {
      percentOverdue,
      percentHighPriority,
    };

    const built = buildAiPrompt(intent, trimmed, ops);
    system = built.system;
    user = built.user;
  } else if (intent === "RECORD_SUMMARY" && context?.entityId && context?.entityType) {
    if (context.entityType === "work_order") {
      const ctx = await retrieval.getWorkOrderSummaryContext(supabase, companyIds, context.entityId);
      if (!ctx) {
        return formatAiResponse(
          "This work order was not found or you don’t have access to it.",
          intent,
          "LIGHT",
          { warnings: ["Record not found or out of scope."] }
        );
      }
      const sum: RetrievedSummaryContext = {
        workOrder: { ...ctx.workOrder, notesExcerpt: ctx.notesExcerpt },
      };
      const built = buildAiPrompt(intent, trimmed, sum);
      system = built.system;
      user = built.user;
    } else if (context.entityType === "asset") {
      const asset = await retrieval.getAssetSummaryContext(supabase, companyIds, context.entityId);
      if (!asset) {
        return formatAiResponse(
          "This asset was not found or you don’t have access to it.",
          intent,
          "LIGHT",
          { warnings: ["Record not found or out of scope."] }
        );
      }
      const built = buildAiPrompt(intent, trimmed, { asset } as RetrievedSummaryContext);
      system = built.system;
      user = built.user;
    } else {
      const built = buildAiPrompt("UNKNOWN", trimmed, {});
      system = built.system;
      user = built.user;
    }
  } else if (intent === "LIST_SUMMARY" && context?.entityType === "list") {
    const entityType = (context.listFilters?.entityType as "work_orders" | "assets") ?? "work_orders";
    const listSummary = await retrieval.getListSummaryContext(supabase, companyIds, entityType, {
      status: context.listFilters?.status,
      priority: context.listFilters?.priority,
    });
    const built = buildAiPrompt(intent, trimmed, { listSummary } as RetrievedSummaryContext);
    system = built.system;
    user = built.user;
  } else {
    const built = buildAiPrompt(intent, trimmed, { sections: [] } as RetrievedHelpContext);
    system = built.system;
    user = built.user;
  }

  const inputEstimate = estimateTokens(system + user);
  const outputEstimate = 512;

  let mode: "FULL" | "LIGHT";
  let decision: Awaited<ReturnType<typeof checkAiQuotaBeforeRequest>>;

  if (isPlatformSuperAdmin) {
    // Super admins bypass tenant quota but still run in LIGHT mode for cost control.
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
      outputTokens: outputEstimate,
      featureKey: FEATURE_KEY,
    });
    mode = resolveAiExecutionMode(decision) as "FULL" | "LIGHT";
  }

  const llm = await callCornerstoneLlm(system, user, mode);

  const modelShort = llm.model.includes("/") ? llm.model.slice(llm.model.indexOf("/") + 1) : llm.model;
  const costUsd = estimateAiRequestCost(
    llm.provider,
    modelShort,
    llm.inputTokens,
    llm.outputTokens
  );
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
    metadata: { intent },
  });

  const warnings: string[] = [];
  if (decision.warning) warnings.push(decision.warning);
  if (decision.uiMessage && decision.softLimitReached) warnings.push(decision.uiMessage);

  return formatAiResponse(llm.content, intent, mode, {
    sources,
    quotaStatus: {
      remainingBudgetUsd: decision.remainingEstimatedBudgetUsd,
      remainingCredits: decision.remainingCredits,
    },
    warnings,
  });
}
