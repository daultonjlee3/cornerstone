import type { AiActionType } from "@/src/lib/cornerstone-ai/types";

export type OperationSuggestionPriority = "high" | "medium" | "low";

export type OperationSuggestionType =
  | "overdue_work_orders"
  | "unassigned_urgent_work"
  | "technician_overload"
  | "underutilized_technicians"
  | "repeated_asset_failures";

export type OperationSuggestion = {
  id: string;
  type: OperationSuggestionType;
  insight: string;
  recommendation: string;
  actionType: AiActionType;
  parameters: Record<string, unknown>;
  priority: OperationSuggestionPriority;
};

