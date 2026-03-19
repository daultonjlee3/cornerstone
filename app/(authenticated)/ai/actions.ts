"use server";

import { createClient } from "@/src/lib/supabase/server";
import { getAuthContext } from "@/src/lib/auth-context";
import { executeCornerstoneAiRequest } from "@/src/lib/cornerstone-ai/execute";
import type { CornerstoneAiContext, CornerstoneAiResponse } from "@/src/lib/cornerstone-ai/types";
import {
  executeCornerstoneAiAction,
  type ExecuteCornerstoneAiActionParams,
} from "@/src/lib/cornerstone-ai/action-execute";

import {
  previewAssignWorkOrders,
  previewCreateWorkOrder,
  type AssignWorkOrdersParameters,
  type CreateWorkOrderParameters,
} from "@/src/lib/cornerstone-ai/action-registry";
import type { AiActionType, AiIntent } from "@/src/lib/cornerstone-ai/types";

export type SubmitCornerstoneAiQueryResult =
  | { ok: true; data: CornerstoneAiResponse }
  | { ok: false; error: string };

export async function submitCornerstoneAiQuery(
  query: string,
  context?: CornerstoneAiContext
): Promise<SubmitCornerstoneAiQueryResult> {
  const supabase = await createClient();
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch (err) {
    console.error("[Cornerstone AI] Failed to resolve auth context", err);
    return { ok: false, error: "You must be signed in to use Cornerstone AI." };
  }

  if (!auth.tenantId || !auth.companyIds?.length) {
    return { ok: false, error: "No organization context. Complete onboarding first." };
  }

  try {
    const data = await executeCornerstoneAiRequest({
      supabase,
      tenantId: auth.tenantId,
      userId: auth.effectiveUserId,
      companyIds: auth.companyIds,
      query,
      context,
      isPlatformSuperAdmin: auth.isPlatformSuperAdmin,
    });
    return { ok: true, data };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[Cornerstone AI] Execution error", {
      message: err.message,
      stack: err.stack,
    });

    let message = err.message || "Something went wrong.";
    if (message.includes("OPENAI_API_KEY")) {
      message = "AI service not configured (OpenAI API key is missing).";
    } else if (message.toLowerCase().includes("monthly ai hard limit reached") ||
               message.toLowerCase().includes("ai is disabled for this organization")) {
      // Internal tenant quota block
      message = "Request blocked by AI usage limits for this organization.";
    } else if (message.toLowerCase().includes("you exceeded your current quota")) {
      // Upstream provider quota, not tenant-level
      message = "AI provider quota exceeded (OpenAI). Check provider billing/limits.";
    }

    return { ok: false, error: message };
  }
}

export type ExecuteCornerstoneAiActionRequest = {
  actionType: ExecuteCornerstoneAiActionParams["actionType"];
  executeSpec: ExecuteCornerstoneAiActionParams["executeSpec"];
};

export type ExecuteCornerstoneAiActionResult =
  | { ok: true; data: CornerstoneAiResponse }
  | { ok: false; error: string };

export async function executeCornerstoneAiActionRequest(
  request: ExecuteCornerstoneAiActionRequest
): Promise<ExecuteCornerstoneAiActionResult> {
  const supabase = await createClient();
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch (err) {
    console.error("[Cornerstone AI] Failed to resolve auth context", err);
    return { ok: false, error: "You must be signed in to use Cornerstone AI." };
  }

  if (!auth.tenantId || !auth.companyIds?.length) {
    return { ok: false, error: "No organization context. Complete onboarding first." };
  }

  try {
    const data = await executeCornerstoneAiAction({
      supabase,
      tenantId: auth.tenantId,
      userId: auth.effectiveUserId,
      companyIds: auth.companyIds,
      actionType: request.actionType,
      executeSpec: request.executeSpec,
    });

    return { ok: true, data };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[Cornerstone AI] Action execution error", {
      message: err.message,
      stack: err.stack,
    });
    return { ok: false, error: err.message || "Something went wrong." };
  }
}

export type PreviewCornerstoneAiActionRequest = {
  actionType: ExecuteCornerstoneAiActionParams["actionType"];
  parameters: Record<string, unknown>;
};

export type PreviewCornerstoneAiActionResult =
  | { ok: true; data: CornerstoneAiResponse }
  | { ok: false; error: string };

function actionTypeToIntent(actionType: AiActionType): AiIntent {
  if (actionType === "assign_work_orders") return "ACTION_ASSIGN_WORK_ORDERS";
  if (actionType === "create_work_order") return "ACTION_CREATE_WORK_ORDER";
  return "ACTION_SUMMARIZE_OPERATIONS";
}

export async function previewCornerstoneAiActionRequest(
  request: PreviewCornerstoneAiActionRequest
): Promise<PreviewCornerstoneAiActionResult> {
  const supabase = await createClient();
  let auth;
  try {
    auth = await getAuthContext(supabase);
  } catch (err) {
    console.error("[Cornerstone AI] Failed to resolve auth context", err);
    return { ok: false, error: "You must be signed in to use Cornerstone AI." };
  }

  if (!auth.tenantId || !auth.companyIds?.length) {
    return { ok: false, error: "No organization context. Complete onboarding first." };
  }

  try {
    const companyIds = auth.companyIds;
    const context: CornerstoneAiContext = {
      entityType: "list",
      listFilters: { company_id: companyIds[0] ?? "" },
      actionContext: { workOrders: [], technicians: [] },
    };

    if (request.actionType === "assign_work_orders") {
      const previewResult = await previewAssignWorkOrders({
        supabase,
        context,
        companyIds,
        parameters: request.parameters as AssignWorkOrdersParameters,
      });

      return {
        ok: true,
        data: {
          intent: actionTypeToIntent(request.actionType),
          answer: "Review this action preview before confirming.",
          bulletHighlights: [],
          sources: [],
          followUpSuggestions: [],
          mode: "LIGHT",
          warnings: [],
          proposedAction: {
            actionType: request.actionType,
            requiresConfirmation: previewResult.requiresConfirmation,
            preview: previewResult.preview,
            executeSpec: previewResult.executeSpec,
          },
        },
      };
    }

    if (request.actionType === "create_work_order") {
      const previewResult = await previewCreateWorkOrder({
        parameters: request.parameters as CreateWorkOrderParameters,
        context,
      });

      return {
        ok: true,
        data: {
          intent: actionTypeToIntent(request.actionType),
          answer: "Review this action preview before confirming.",
          bulletHighlights: [],
          sources: [],
          followUpSuggestions: [],
          mode: "LIGHT",
          warnings: [],
          proposedAction: {
            actionType: request.actionType,
            requiresConfirmation: previewResult.requiresConfirmation,
            preview: previewResult.preview,
            executeSpec: previewResult.executeSpec,
          },
        },
      };
    }

    return {
      ok: false,
      error: "This suggestion type doesn’t support action preview yet.",
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("[Cornerstone AI] Failed to build action preview", err);
    return { ok: false, error: err.message || "Failed to generate preview." };
  }
}
