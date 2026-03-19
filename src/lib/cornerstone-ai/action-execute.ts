/**
 * Execute Cornerstone AI actions after user confirmation.
 * Server-only. This is where real DB writes happen.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiActionType,
  AssignWorkOrdersActionExecuteSpec,
  CreateWorkOrderActionExecuteSpec,
  CornerstoneAiResponse,
} from "./types";
import { executeAssignWorkOrders, executeCreateWorkOrder } from "./action-registry";

export type ExecuteCornerstoneAiActionParams = {
  supabase: SupabaseClient;
  tenantId: string;
  userId?: string | null;
  companyIds: string[];
  actionType: AiActionType;
  executeSpec: AssignWorkOrdersActionExecuteSpec | CreateWorkOrderActionExecuteSpec;
};

export async function executeCornerstoneAiAction(
  params: ExecuteCornerstoneAiActionParams
): Promise<CornerstoneAiResponse> {
  const { supabase, actionType, executeSpec } = params;

  if (actionType === "assign_work_orders") {
    return executeAssignWorkOrders({
      supabase,
      tenantId: params.tenantId,
      userId: params.userId,
      companyIds: params.companyIds,
      executeSpec: executeSpec as AssignWorkOrdersActionExecuteSpec,
    });
  }

  if (actionType === "create_work_order") {
    return executeCreateWorkOrder({
      supabase,
      tenantId: params.tenantId,
      userId: params.userId,
      companyIds: params.companyIds,
      executeSpec: executeSpec as CreateWorkOrderActionExecuteSpec,
    });
  }

  // summarize_operations is not an execution action.
  return {
    intent: "ACTION_SUMMARIZE_OPERATIONS",
    answer: "Nothing to execute for this action.",
    bulletHighlights: [],
    sources: [],
    followUpSuggestions: [],
    mode: "LIGHT",
    warnings: [],
  };
}

