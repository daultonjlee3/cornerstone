/**
 * Format LLM output into Cornerstone AI response shape.
 * Parses trailing JSON block for bulletHighlights and followUpSuggestions.
 */

import type { AiIntent } from "./types";
import type { CornerstoneAiResponse } from "./types";
import type { HelpSection } from "./help";

const JSON_BLOCK_RE = /\s*\{[\s\S]*"bulletHighlights"[\s\S]*\}\s*$/;

export function formatAiResponse(
  rawContent: string,
  intent: AiIntent,
  mode: "FULL" | "LIGHT",
  options: {
    sources?: { title: string; moduleKey?: string; path?: string }[];
    quotaStatus?: { remainingBudgetUsd: number; remainingCredits: number };
    warnings?: string[];
  } = {}
): CornerstoneAiResponse {
  let answer = rawContent.trim();
  let bulletHighlights: string[] = [];
  let followUpSuggestions: string[] = [];

  const jsonMatch = answer.match(JSON_BLOCK_RE);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0].trim()) as {
        bulletHighlights?: unknown;
        followUpSuggestions?: unknown;
      };
      answer = answer.slice(0, answer.length - jsonMatch[0].length).trim();
      if (Array.isArray(parsed.bulletHighlights))
        bulletHighlights = parsed.bulletHighlights.filter((x): x is string => typeof x === "string").slice(0, 5);
      if (Array.isArray(parsed.followUpSuggestions))
        followUpSuggestions = parsed.followUpSuggestions.filter((x): x is string => typeof x === "string").slice(0, 5);
    } catch {
      // Keep answer as-is if JSON parse fails
    }
  }

  return {
    intent,
    answer: answer || "I couldn’t generate a response. Try rephrasing or ask for help.",
    bulletHighlights,
    sources: options.sources ?? [],
    followUpSuggestions,
    mode,
    quotaStatus: options.quotaStatus,
    warnings: options.warnings ?? [],
  };
}

export function sourcesFromHelpSections(sections: HelpSection[]): { title: string; moduleKey?: string; path?: string }[] {
  return sections.map((s) => ({
    title: s.title,
    moduleKey: s.moduleKey,
    path: s.path,
  }));
}
