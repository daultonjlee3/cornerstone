import type { SupabaseClient } from "@supabase/supabase-js";
import { callCornerstoneLlm } from "./llm";
import {
  checkAiQuotaBeforeRequest,
  recordAiUsage,
  resolveAiExecutionMode,
  estimateAiRequestCost,
} from "@/src/lib/ai/metering";
import { costUsdToCredits } from "@/src/lib/ai/credits";

import type {
  AiActionType,
  AiIntent,
  CornerstoneAiContext,
  CornerstoneAiResponse,
} from "./types";
import {
  previewAssignWorkOrders,
  previewCreateWorkOrder,
  type AssignWorkOrdersParameters,
  type CreateWorkOrderParameters,
} from "./action-registry";

const FEATURE_KEY = "cornerstone_ai";

function estimateTokens(text: string): number {
  return Math.ceil((text?.length ?? 0) / 4);
}

function safeExtractFirstJsonObject(text: string): unknown {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const ACTION_PLANNER_SYSTEM = `You are Cornerstone AI, an action planner for Cornerstone OS.

Goal: convert a user's natural language request into a structured action plan.

Rules:
- You MUST respond with ONLY valid JSON (no markdown, no extra text).
- The JSON MUST match this schema exactly:
{
  "intent": "assign_work_orders" | "create_work_order" | "summarize_operations",
  "confidence": number,            // 0.0 - 1.0
  "parameters": object            // parameters depend on intent
}
- Do not invent record IDs.
- When referencing a technician by name, use the provided technician list labels/IDs when available; otherwise leave technicianId null.
- When referencing an asset, use the provided asset list IDs when available OR use assetIdFromRecordSummary when the action is triggered from an asset page; otherwise leave assetId null.

Supported actions:
1) assign_work_orders
   parameters:
   {
     "filter": "unassigned" | "overdue" | "urgent",
     "technicianId": string | null,
     "reassignExisting": boolean,
     "maxRecords": number | null
   }

2) create_work_order
   parameters:
   {
     "title": string | null,
     "description": string | null,
     "due_date": "YYYY-MM-DD" | null,
     "priority": "low"|"medium"|"high"|"urgent"|"emergency" | null,
     "category": "repair"|"preventive_maintenance"|"inspection"|"installation"|"emergency"|"general" | null,
     "assetId": string | null
   }

3) summarize_operations
   parameters: {}
`;

function serializeForPrompt(actionContext: CornerstoneAiContext["actionContext"]): unknown {
  const workOrders = actionContext?.workOrders?.slice(0, 20) ?? [];
  const technicians = actionContext?.technicians?.slice(0, 15) ?? [];
  const assets = actionContext?.assets?.slice(0, 10) ?? [];
  return { workOrders, technicians, assets };
}

type ParsedActionPlan =
  | {
      intent: AiActionType;
      confidence: number;
      parameters: Record<string, unknown>;
    }
  | null;

function normalizeParsedPlan(v: unknown): ParsedActionPlan {
  const obj = v as any;
  if (!obj || typeof obj !== "object") return null;
  const intent = obj.intent as AiActionType | undefined;
  if (!intent || !["assign_work_orders", "create_work_order", "summarize_operations"].includes(intent)) return null;
  const confidence = typeof obj.confidence === "number" ? obj.confidence : Number(obj.confidence);
  if (!Number.isFinite(confidence)) return null;
  const parameters = (obj.parameters && typeof obj.parameters === "object" ? obj.parameters : {}) as Record<string, unknown>;
  return { intent, confidence: Math.max(0, Math.min(1, confidence)), parameters };
}

function fallbackParseIntent(query: string): { intent: AiActionType; parameters: Record<string, unknown>; confidence: number } {
  const q = query.toLowerCase();
  if (/(assign|dispatch).*(work order|work orders|jobs|unassigned|overdue)/.test(q)) {
    const filter: AssignWorkOrdersParameters["filter"] = q.includes("urgent") ? "urgent" : q.includes("overdue") ? "overdue" : "unassigned";
    return { intent: "assign_work_orders", confidence: 0.55, parameters: { filter, technicianId: null, reassignExisting: false, maxRecords: 10 } };
  }
  if (/(create|new|add).*(work order)|broken|hvac/.test(q)) {
    return { intent: "create_work_order", confidence: 0.55, parameters: { title: null, description: null, due_date: null, priority: null, category: null, assetId: null } };
  }
  return { intent: "summarize_operations", confidence: 0.4, parameters: {} };
}

function mapIntentToAiIntent(action: AiActionType): AiIntent {
  if (action === "assign_work_orders") return "ACTION_ASSIGN_WORK_ORDERS";
  if (action === "create_work_order") return "ACTION_CREATE_WORK_ORDER";
  return "ACTION_SUMMARIZE_OPERATIONS";
}

export async function planCornerstoneAiAction(args: {
  supabase: SupabaseClient;
  tenantId: string;
  userId?: string | null;
  companyIds: string[];
  query: string;
  context?: CornerstoneAiContext;
  isPlatformSuperAdmin?: boolean;
}): Promise<CornerstoneAiResponse> {
  const { supabase, tenantId, userId, companyIds, query, context, isPlatformSuperAdmin } = args;
  const trimmed = query.trim();
  const actionContext = context?.actionContext;
  const today = new Date().toISOString().slice(0, 10);

  const system = ACTION_PLANNER_SYSTEM;
  const user = `User request: ${trimmed}

UI action context (may be partial, already tenant-scoped):
${JSON.stringify(serializeForPrompt(actionContext), null, 2)}

Entity context:
{
  "entityType": ${context?.entityType ? JSON.stringify(context.entityType) : "null"},
  "entityId": ${context?.entityId ? JSON.stringify(context.entityId) : "null"},
  "assetIdFromRecordSummary": ${context?.recordSummary?.asset?.id ? JSON.stringify(context.recordSummary.asset.id) : "null"}
}
`;

  const inputEstimate = estimateTokens(system + user);
  const outputEstimate = 512;

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
      outputTokens: outputEstimate,
      featureKey: FEATURE_KEY,
    });
    mode = resolveAiExecutionMode(decision) as "FULL" | "LIGHT";
  }

  const llm = await callCornerstoneLlm(system, user, mode);
  const parsed = normalizeParsedPlan(safeExtractFirstJsonObject(llm.content));
  const fallback = !parsed ? fallbackParseIntent(trimmed) : null;
  const plan = parsed ?? fallback;

  const modelShort = llm.model.includes("/") ? llm.model.slice(llm.model.indexOf("/") + 1) : llm.model;
  const costUsd = estimateAiRequestCost(llm.provider, modelShort, llm.inputTokens, llm.outputTokens);
  const recordedIntent: AiIntent = plan ? mapIntentToAiIntent(plan.intent) : "UNKNOWN";
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
    metadata: { intent: recordedIntent },
  });

  if (!plan) {
    return {
      intent: "UNKNOWN",
      answer: "I couldn’t complete that action. Try refining your request and confirm again.",
      bulletHighlights: [],
      sources: [],
      followUpSuggestions: ["Try a more specific assignment request.", "Try creating a work order with required fields."],
      mode: "LIGHT",
      warnings: [],
    };
  }

  const actionIntent = mapIntentToAiIntent(plan.intent);
  if (plan.intent === "assign_work_orders") {
    const parameters = plan.parameters as Record<string, unknown> as AssignWorkOrdersParameters;
    const preview = await previewAssignWorkOrders({
      supabase,
      context: context ?? {},
      companyIds,
      parameters: {
        filter: (parameters.filter as any) ?? "unassigned",
        technicianId: (parameters.technicianId as any) ?? undefined,
        reassignExisting: (parameters.reassignExisting as any) ?? false,
        maxRecords: parameters.maxRecords as any,
      },
    });

    const targetCount = preview.preview.workOrders.length;
    return {
      intent: actionIntent,
      answer: `I found ${targetCount} work order${targetCount === 1 ? "" : "s"} that match your request. Confirm to assign them.`,
      bulletHighlights: [
        `Recommendation: ${preview.preview.recommendedTechnician.label}`,
        `Affects: ${targetCount} record${targetCount === 1 ? "" : "s"}`,
      ],
      sources: [],
      followUpSuggestions: ["Confirm to execute.", "Cancel to keep your current assignments."],
      mode: "LIGHT",
      warnings: [],
      proposedAction: {
        actionType: "assign_work_orders",
        requiresConfirmation: true,
        preview: preview.preview,
        executeSpec: preview.executeSpec,
      },
    };
  }

  if (plan.intent === "create_work_order") {
    const parameters = plan.parameters as Record<string, unknown> as CreateWorkOrderParameters;
    const companyId = companyIds[0];
    const preview = await previewCreateWorkOrder({
      parameters: {
        ...parameters,
        companyId,
      },
      context: context ?? {},
    });

    const assetLabel = preview.preview.assetId ? `Asset: ${preview.preview.assetId}` : "";
    return {
      intent: actionIntent,
      answer: `I can create a new work order${preview.preview.title ? `: ${preview.preview.title}` : ""}. Confirm to execute.`,
      bulletHighlights: [
        `Title: ${preview.preview.title}`,
        preview.preview.due_date ? `Due: ${preview.preview.due_date}` : "",
        assetLabel,
      ].filter(Boolean),
      sources: [],
      followUpSuggestions: ["Confirm to create.", "Cancel to adjust the request."],
      mode: "LIGHT",
      warnings: [],
      proposedAction: {
        actionType: "create_work_order",
        requiresConfirmation: true,
        preview: preview.preview,
        executeSpec: preview.executeSpec,
      },
    };
  }

  // summarize_operations
  const workOrders = context?.actionContext?.workOrders ?? [];
  const total = workOrders.length;
  const unassigned = workOrders.filter(
    (w) => !w.assigned_technician_id && !w.assigned_crew_id && !w.vendor_id
  ).length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const overdue = workOrders.filter((w) => Boolean(w.due_date && w.due_date < todayIso)).length;
  const urgent = workOrders.filter((w) => {
    const p = w.priority ? String(w.priority).toLowerCase() : "";
    return p === "urgent" || p === "emergency";
  }).length;
  const highPriority = urgent;
  return {
    intent: actionIntent,
    answer: `Operations snapshot: ${unassigned} unassigned, ${overdue} overdue, and ${highPriority} urgent work orders in the current UI context.`,
    bulletHighlights: [`Total in context: ${total}`, `Overdue: ${overdue}`, `Urgent: ${urgent}`],
    sources: [],
    followUpSuggestions: ["Ask me to assign work orders.", "Ask me to create a work order for a specific issue."],
    mode: "LIGHT",
    warnings: [],
  };
}

