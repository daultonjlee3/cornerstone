/**
 * Deterministic fleet copilot answers — no LLM when structured data is sufficient.
 */

import type { FleetBranchPerformanceRow, FleetIntegrationHealthItem } from "@/src/types/fleet";
import type { CornerstoneAiContext, FleetCopilotRecommendationSnapshot } from "../types";
import { searchFleetProductKnowledge, getFleetProductKnowledgeById } from "./product-knowledge";
import type {
  DeterministicFleetAnswer,
  FetchedFleetCopilotContext,
  FleetCopilotIntent,
} from "./types";

function fmtCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function topBranchFromPage(
  context?: CornerstoneAiContext
): { name: string; contribution: number; dateRange?: { from: string; to: string } } | null {
  const rows = context?.fleet?.pageContext?.branchPerformance;
  if (!rows?.length) return null;
  const top = [...rows].sort((a, b) => b.contribution - a.contribution)[0];
  return {
    name: top.branch_name,
    contribution: top.contribution,
    dateRange: context?.fleet?.pageContext?.dateRange,
  };
}

function topBranchFromDb(branches: FleetBranchPerformanceRow[] | null | undefined) {
  if (!branches?.length) return null;
  const top = branches[0];
  return { name: top.branch_name, contribution: top.contribution, rank: top.rank };
}

export function tryDeterministicFleetAnswer(
  query: string,
  intent: FleetCopilotIntent,
  fetched: FetchedFleetCopilotContext,
  context?: CornerstoneAiContext
): DeterministicFleetAnswer | null {
  const q = query.toLowerCase();

  // Product knowledge — pure definitions
  if (intent === "product_help" || /\bwhat does deadhead mean\b/.test(q)) {
    const topics =
      q.includes("deadhead")
        ? [getFleetProductKnowledgeById("deadhead")].filter(Boolean)
        : searchFleetProductKnowledge(query, 2);
    if (topics.length === 1 && topics[0]) {
      const t = topics[0];
      return {
        answer: `${t.title}: ${t.content}`,
        meta: {
          sourcesUsed: [{ title: "Fleet Intelligence product guide", layer: "product_knowledge" }],
          confidence: "high",
          missingData: [],
          answerMethod: "product_knowledge",
        },
        followUpSuggestions: [
          "Where are we wasting the most deadhead?",
          "What branch has the highest contribution?",
        ],
      };
    }
  }

  // Highest contribution branch
  if (
    intent === "analytics" &&
    /\b(highest|most|top|best)\b/.test(q) &&
    /\b(contribution|profitable|branch)\b/.test(q)
  ) {
    const fromPage = topBranchFromPage(context);
    if (fromPage) {
      const rangeNote = fromPage.dateRange
        ? ` This is based on the Fleet Performance table for ${fromPage.dateRange.from} to ${fromPage.dateRange.to}.`
        : " This is based on the Fleet Performance table currently on screen.";
      return {
        answer: `${fromPage.name} has the highest contribution at ${fmtCurrency(fromPage.contribution)}.${rangeNote}`,
        meta: {
          sourcesUsed: [
            { title: "Fleet Performance table (current screen)", layer: "page" },
            ...(fromPage.dateRange
              ? [{ title: "Current date range filter", layer: "page" as const }]
              : []),
          ],
          confidence: "high",
          dataFreshness: fetched.queries.branch_performance?.meta.retrievedAt,
          missingData: [],
          answerMethod: "deterministic",
        },
        followUpSuggestions: [
          "Which truck is the most profitable?",
          "What is driving deadhead this week?",
        ],
      };
    }

    const branchResult = fetched.queries.branch_performance;
    const top = topBranchFromDb(branchResult?.data as FleetBranchPerformanceRow[] | null);
    if (top) {
      const range = branchResult?.meta.dateRange;
      return {
        answer: `${top.name} has the highest contribution at ${fmtCurrency(top.contribution)}.${range ? ` Based on Fleet Performance data from ${range.from} to ${range.to}.` : ""}`,
        meta: {
          sourcesUsed: [{ title: "Fleet Performance — branch contribution", layer: "database" }],
          confidence: "high",
          dataFreshness: branchResult?.meta.retrievedAt,
          missingData: branchResult?.missingData ?? [],
          answerMethod: "deterministic",
        },
      };
    }

    return {
      answer:
        "I don't have enough data to answer that reliably. Open Fleet Performance or widen the date range — branch contribution requires utilization data for the selected period.",
      meta: {
        sourcesUsed: [],
        confidence: "low",
        missingData: ["branch_performance_mart"],
        answerMethod: "deterministic",
      },
    };
  }

  // Most profitable truck
  if (intent === "analytics" && /\b(most profitable|highest contribution)\b/.test(q) && /\btruck\b/.test(q)) {
    const trucks = fetched.queries.truck_performance?.data as
      | Array<{ unit_number: string; contribution: number }>
      | null;
    if (trucks?.length) {
      const top = trucks[0];
      return {
        answer: `Truck ${top.unit_number} leads contribution at ${fmtCurrency(top.contribution)} for the current performance period.`,
        meta: {
          sourcesUsed: [{ title: "Fleet Performance — truck contribution", layer: "database" }],
          confidence: "high",
          dataFreshness: fetched.queries.truck_performance?.meta.retrievedAt,
          missingData: [],
          answerMethod: "deterministic",
        },
      };
    }
  }

  // Unavailable trucks
  if (/\b(unavailable|offline|out of service)\b/.test(q) && /\btrucks?\b/.test(q)) {
    const data = fetched.queries.unavailable_trucks?.data as
      | Array<{ unit_number: string; reason: string }>
      | null;
    if (data === null) {
      return {
        answer: "I don't have enough data to answer that reliably. Dispatch board data is unavailable.",
        meta: {
          sourcesUsed: [],
          confidence: "low",
          missingData: ["dispatch_board"],
          answerMethod: "deterministic",
        },
      };
    }
    if (data.length === 0) {
      return {
        answer: "All active trucks appear available on today's dispatch board.",
        meta: {
          sourcesUsed: [{ title: "Dispatch board — truck availability", layer: "database" }],
          confidence: "high",
          dataFreshness: fetched.queries.unavailable_trucks?.meta.retrievedAt,
          missingData: [],
          answerMethod: "deterministic",
        },
      };
    }
    const list = data.slice(0, 8).map((t) => `${t.unit_number} (${t.reason})`).join(", ");
    return {
      answer: `${data.length} truck(s) unavailable: ${list}${data.length > 8 ? "…" : ""}.`,
      meta: {
        sourcesUsed: [{ title: "Dispatch board — truck availability", layer: "database" }],
        confidence: "high",
        dataFreshness: fetched.queries.unavailable_trucks?.meta.retrievedAt,
        missingData: [],
        answerMethod: "deterministic",
      },
    };
  }

  // Samsara connected
  if (/\b(samsara)\b/.test(q) && /\b(connected|connect|status)\b/.test(q)) {
    const health = fetched.queries.integration_health?.data as FleetIntegrationHealthItem[] | null;
    const samsara = health?.find((h) => h.provider === "samsara" || h.displayName.toLowerCase().includes("samsara"));
    if (!health) {
      return {
        answer: "I don't have enough data to answer that reliably. Integration connection data is unavailable.",
        meta: {
          sourcesUsed: [],
          confidence: "low",
          missingData: ["integration_connections"],
          answerMethod: "deterministic",
        },
      };
    }
    if (!samsara) {
      return {
        answer:
          "Samsara is not configured for this organization. Add a Samsara connection under Settings → Integrations or Implementation → Connections.",
        meta: {
          sourcesUsed: [{ title: "Integration connections", layer: "database" }],
          confidence: "high",
          missingData: [],
          answerMethod: "deterministic",
        },
        followUpSuggestions: ["How do I connect Samsara?", "What data is missing?"],
      };
    }
    const syncNote = samsara.lastSyncAt
      ? ` Last sync: ${new Date(samsara.lastSyncAt).toLocaleString()}.`
      : " No sync recorded yet.";
    return {
      answer: `Samsara is ${samsara.status === "healthy" ? "connected and healthy" : samsara.status === "error" ? "connected but reporting errors" : "connected with warnings"}.${syncNote}${samsara.message ? ` ${samsara.message}` : ""}`,
      meta: {
        sourcesUsed: [{ title: "Integration health", layer: "database" }],
        confidence: samsara.status === "healthy" ? "high" : "medium",
        dataFreshness: samsara.lastSyncAt ?? undefined,
        missingData: [],
        answerMethod: "deterministic",
      },
    };
  }

  // Low confidence on selected recommendation
  if (
    intent === "recommendation" &&
    /\b(confidence|low)\b/.test(q) &&
    (context?.fleet?.selectedRecommendation || fetched.selectedRecommendation)
  ) {
    const rec: FleetCopilotRecommendationSnapshot =
      context?.fleet?.selectedRecommendation ?? fetched.selectedRecommendation!;
    const reasons = rec.winner_reasons.length
      ? rec.winner_reasons.join(" ")
      : rec.confidence_explanation;
    return {
      answer: `Confidence is ${rec.confidence} for ${rec.recommended_unit_number ?? "the recommended truck"}. ${reasons}${rec.deadhead_miles != null ? ` Estimated deadhead: ${rec.deadhead_miles.toFixed(1)} mi.` : ""}`,
      meta: {
        sourcesUsed: [
          { title: "Selected recommendation (dispatch screen)", layer: "page" },
          { title: "Recommendation engine rationale", layer: "database" },
        ],
        confidence: "high",
        missingData: [],
        answerMethod: "deterministic",
      },
      followUpSuggestions: [
        "What alternatives were considered?",
        "What happens if I reject this recommendation?",
      ],
    };
  }

  // Dispatch readiness
  if (/\b(dispatch ready|ready for dispatch|needs attention before dispatch)\b/.test(q)) {
    const readiness = fetched.queries.dispatch_readiness?.data as
      | { ready: boolean; blockers: string[] }
      | null;
    if (readiness) {
      if (readiness.ready) {
        return {
          answer: "Dispatch appears ready — no critical blockers detected in today's operational snapshot.",
          meta: {
            sourcesUsed: [{ title: "Dispatch readiness check", layer: "database" }],
            confidence: "medium",
            dataFreshness: fetched.queries.dispatch_readiness?.meta.retrievedAt,
            missingData: [],
            answerMethod: "deterministic",
          },
        };
      }
      return {
        answer: `Dispatch is not fully ready. Blockers: ${readiness.blockers.join("; ")}.`,
        meta: {
          sourcesUsed: [{ title: "Dispatch readiness check", layer: "database" }],
          confidence: "high",
          missingData: [],
          answerMethod: "deterministic",
        },
      };
    }
  }

  return null;
}
