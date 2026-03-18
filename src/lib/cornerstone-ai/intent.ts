/**
 * Lightweight deterministic intent classification for Cornerstone AI.
 * Prefer heuristics; no LLM classifier in v1.
 */

import type { AiIntent } from "./types";

const HELP_PATTERNS = [
  /how\s+do\s+i\b/i,
  /how\s+do\s+.+work/i,
  /how\s+to\b/i,
  /what\s+does\s+.+?\s+mean/i,
  /what\s+is\s+this\s+(page|screen|view)/i,
  /why\s+can'?t\s+i\b/i,
  /explain\s+(the\s+)?(workflow|status|pm|dispatch)/i,
  /help\s+with/i,
  /where\s+do\s+i\b/i,
  /guide\s+to/i,
];

const OPS_PATTERNS = [
  /what('s| is)?\s+(overdue|due\s+today)/i,
  /\boverdue\b/i,
  /\bdue\s+today\b/i,
  /what.*overdue|overdue\s+(work|jobs)/i,
  /schedule\s+(today|this\s+week)/i,
  /which\s+(tech|technician)s?\s+(are\s+)?(overloaded|busy)/i,
  /workload\s+(by\s+)?(tech|technician)/i,
  /dispatch\s+bottleneck/i,
  /open\s+(high[- ])?priority/i,
  /pm\s+(due|scheduled)/i,
  /pm.*due|due.*(this\s+)?week/i,
  /summarize\s+(open\s+)?(work|dispatch)/i,
  /properties?\s+with\s+(most\s+)?(issues|open)/i,
  /assets?\s+with\s+(repeated|recurring)\s+failures/i,
  /biggest\s+(maintenance\s+)?issues/i,
];

const RECORD_SUMMARY_PATTERNS = [
  /summarize\s+this\s+(work\s+order|asset|record)/i,
  /summarize\s+(this\s+)?(work\s+order|asset)/i,
  /summary\s+of\s+this\s+(wo|asset)/i,
  /explain\s+this\s+(work\s+order|asset)/i,
  /what('s| is)\s+important\s+(about\s+)?(this\s+)?(wo|asset)/i,
];

const LIST_SUMMARY_PATTERNS = [
  /summarize\s+(the\s+)?(.+?\s+)?(queue|list|view|results)/i,
  /explain\s+(this\s+)?(queue|list|view)/i,
  /top\s+issues\s+(across\s+)?(these\s+)?(records?)?/i,
  /summary\s+of\s+(current\s+)?(open\s+)?(work\s+orders?|queue)/i,
];

export function classifyAiIntent(query: string, context?: { entityType?: string; entityId?: string }): AiIntent {
  const q = query.trim();
  if (!q) return "UNKNOWN";

  if (context?.entityId && context?.entityType) {
    if (RECORD_SUMMARY_PATTERNS.some((p) => p.test(q))) return "RECORD_SUMMARY";
    if (context.entityType === "work_order" || context.entityType === "asset") {
      if (/summar(y|ize)|explain\s+this|important\s+issues/i.test(q)) return "RECORD_SUMMARY";
    }
  }

  if (LIST_SUMMARY_PATTERNS.some((p) => p.test(q))) return "LIST_SUMMARY";
  if (OPS_PATTERNS.some((p) => p.test(q))) return "OPS_QUERY";
  if (HELP_PATTERNS.some((p) => p.test(q))) return "HELP";

  if (context?.entityType === "list" && /summar(y|ize)|explain\s+this\s+view/i.test(q)) return "LIST_SUMMARY";

  return "UNKNOWN";
}
