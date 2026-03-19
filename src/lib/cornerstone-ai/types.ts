/**
 * Cornerstone AI v1 types: intent, context, and response shape.
 */

export type AiIntent =
  | "HELP"
  | "OPS_QUERY"
  | "ACTION_ASSIGN_WORK_ORDERS"
  | "ACTION_CREATE_WORK_ORDER"
  | "ACTION_SUMMARIZE_OPERATIONS"
  | "RECORD_SUMMARY"
  | "LIST_SUMMARY"
  | "UNKNOWN";

export type AiActionType = "assign_work_orders" | "create_work_order" | "summarize_operations";

export type AssignWorkOrdersActionPreview = {
  recommendedTechnician: { id: string; label: string };
  workOrders: {
    id: string;
    work_order_number?: string | null;
    title?: string | null;
    due_date?: string | null;
    currentlyAssignedTo?: string | null;
  }[];
};

export type AssignWorkOrdersActionExecuteSpec = {
  technicianId: string;
  workOrderIds: string[];
};

export type CreateWorkOrderActionPreview = {
  companyId: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  category?: string | null;
  assetId?: string | null;
};

export type CreateWorkOrderActionExecuteSpec = {
  companyId: string;
  title: string;
  description?: string | null;
  due_date?: string | null;
  priority?: string | null;
  category?: string | null;
  assetId?: string | null;
};

export type AiProposedAction = {
  actionType: AiActionType;
  requiresConfirmation: boolean;
  preview: AssignWorkOrdersActionPreview | CreateWorkOrderActionPreview;
  executeSpec: AssignWorkOrdersActionExecuteSpec | CreateWorkOrderActionExecuteSpec;
};

export type CornerstoneAiContext = {
  entityType?: "work_order" | "asset" | "property" | "list";
  entityId?: string;
  listFilters?: Record<string, string>;
  route?: string;
  /**
   * Optional UI-provided record payload for summaries.
   * When present, the AI should summarize this record WITHOUT re-fetching from the backend.
   */
  recordSummary?: {
    workOrder?: {
      id: string;
      work_order_number?: string | null;
      title?: string | null;
      status?: string | null;
      priority?: string | null;
      due_date?: string | null;
      location?: string | null;
      assigned_to?: string | null;
      company_name?: string | null;
      description?: string | null;
      notesExcerpt?: string | null;
    };
    asset?: {
      id: string;
      name?: string | null;
      asset_type?: string | null;
      type?: string | null;
      condition?: string | null;
      status?: string | null;
      location?: string | null;
      health_score?: number | null;
      work_order_count?: number;
      pm_due_next?: string | null;
      recentActivity?: string | null;
    };
    listSummary?: {
      total: number;
      byStatus: Record<string, number>;
      byPriority?: Record<string, number>;
    };
  };

  /**
   * Optional runtime context for action planning.
   * Provided by the UI so the AI can propose grounded actions without DB lookups.
   */
  actionContext?: {
    workOrders?: Array<{
      id: string;
      work_order_number?: string | null;
      title?: string | null;
      status?: string | null;
      priority?: string | null;
      due_date?: string | null;
      assigned_technician_id?: string | null;
      assigned_crew_id?: string | null;
      vendor_id?: string | null;
      assigned_to_label?: string | null;
      location?: string | null;
    }>;
    technicians?: Array<{
      id: string;
      label: string;
    }>;
    assets?: Array<{
      id: string;
      name: string;
    }>;
  };
};

export type CornerstoneAiResponse = {
  intent: AiIntent;
  answer: string;
  bulletHighlights: string[];
  sources: { title: string; moduleKey?: string; path?: string }[];
  followUpSuggestions: string[];
  mode: "FULL" | "LIGHT";
  quotaStatus?: { remainingBudgetUsd: number; remainingCredits: number };
  warnings: string[];
  proposedAction?: AiProposedAction;
};
