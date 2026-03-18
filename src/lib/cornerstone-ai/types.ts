/**
 * Cornerstone AI v1 types: intent, context, and response shape.
 */

export type AiIntent =
  | "HELP"
  | "OPS_QUERY"
  | "RECORD_SUMMARY"
  | "LIST_SUMMARY"
  | "UNKNOWN";

export type CornerstoneAiContext = {
  entityType?: "work_order" | "asset" | "property" | "list";
  entityId?: string;
  listFilters?: Record<string, string>;
  route?: string;
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
};
