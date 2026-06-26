/**
 * Build LLM prompt from fetched fleet copilot context bundle.
 */

import type { FetchedFleetCopilotContext } from "./types";

const FLEET_COPILOT_SYSTEM = `You are Fleet Intelligence Copilot — an operational analyst for industrial fleet dispatch inside Cornerstone.
Rules:
- Answer ONLY from the structured context provided (page data, database queries, product knowledge).
- Never invent truck IDs, dollar amounts, branch names, or recommendation details.
- Do not mention CMMS, work orders, assets, or preventive maintenance.
- Do not expose internal database table names, UUIDs, or SQL to the user.
- If context is insufficient, say exactly what is missing and what the user should check.
- Be concise: one short paragraph plus up to 5 bullet highlights when useful.`;

export function buildFleetCopilotLlmPrompt(
  userQuery: string,
  fetched: FetchedFleetCopilotContext
): { system: string; user: string } {
  const parts: string[] = [];

  if (fetched.pageContext) {
    parts.push(`Page context (current screen):\n${JSON.stringify(fetched.pageContext, null, 2)}`);
  }
  if (fetched.selectedRecommendation) {
    parts.push(
      `Selected recommendation (from screen):\n${JSON.stringify(fetched.selectedRecommendation, null, 2)}`
    );
  }
  if (fetched.productKnowledge.length) {
    parts.push(
      "Product knowledge:\n" +
        fetched.productKnowledge.map((p) => `[${p.title}]\n${p.content}`).join("\n\n")
    );
  }

  for (const [key, result] of Object.entries(fetched.queries)) {
    if (!result) continue;
    parts.push(
      `Query: ${key}\nSource: ${result.meta.source}\nRetrieved: ${result.meta.retrievedAt}\n` +
        (result.meta.dateRange
          ? `Date range: ${result.meta.dateRange.from} to ${result.meta.dateRange.to}\n`
          : "") +
        `Data: ${result.data != null ? JSON.stringify(result.data).slice(0, 12000) : "null"}\n` +
        (result.missingData?.length ? `Missing: ${result.missingData.join(", ")}\n` : "")
    );
  }

  if (fetched.missingData.length) {
    parts.push(`Overall missing data flags: ${fetched.missingData.join(", ")}`);
  }

  const dataBlock = parts.length ? parts.join("\n\n---\n\n") : "No context retrieved.";

  return {
    system: FLEET_COPILOT_SYSTEM,
    user:
      `Structured operational context:\n${dataBlock}\n\n` +
      `User question: ${userQuery.trim()}\n\n` +
      `Respond as an operational analyst. Explain tradeoffs when comparing options.\n` +
      `End with JSON on one line: {"bulletHighlights":["..."],"followUpSuggestions":["..."]}`,
  };
}

export function stringifySourcesForUi(
  labels: FetchedFleetCopilotContext["sourceLabels"],
  pageDateRange?: { from: string; to: string }
): { title: string }[] {
  const out: { title: string }[] = labels.map((l) => ({ title: l.title }));
  if (pageDateRange) {
    out.push({ title: `Date range ${pageDateRange.from} – ${pageDateRange.to}` });
  }
  return out;
}
