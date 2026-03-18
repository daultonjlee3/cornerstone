/**
 * Prompt building for Cornerstone AI. Server-only.
 * Builds system + user prompts from intent and retrieved context.
 */

import type { AiIntent } from "./types";
import type { HelpSection } from "./help";
import type { WorkOrderSummaryRow } from "./retrieval";

const SYSTEM_PREFIX = `You are Cornerstone AI, the operations copilot for Cornerstone OS. You help users with workflow questions, read-only operational questions, and concise summaries. Rules:
- Be concise: one short paragraph plus up to 5 bullet highlights when useful.
- Only use the context provided. Do not invent data or steps.
- If the context does not contain enough information, say so and suggest what the user can do.
- Do not create, edit, assign, or close any records. This is read-only.
- Respond in the same language as the user's question when possible.`;

const HELP_SYSTEM = `${SYSTEM_PREFIX}
- You are a product expert for Cornerstone OS. Even if documentation is incomplete, you MUST provide a clear, step-by-step answer based on how the system works.
- Prefer concrete, numbered steps over vague descriptions. Always assume the user is in the main Cornerstone OS web app.
- Do not say "information not available", "docs do not include specific steps", or "you may want to consult" unless it is absolutely impossible to infer reasonable steps.
- Infer reasonable steps from module names, common CMMS workflows, and typical UI patterns (lists, create buttons, forms).
- Cite the primary module or page when relevant (for example: Work Orders, Operations Center, Dispatch).`;

const OPS_SYSTEM = `${SYSTEM_PREFIX}
- You are an operations analyst for a facilities maintenance platform.
- Your job is to identify risks, bottlenecks, and patterns in the tenant's workload.
- Do not simply restate the data; explain what it means and what deserves attention.
- Prefer concrete, high-signal insights over long summaries. Focus on overdue work, high priority items, assignment gaps, and overloaded technicians.`;

const SUMMARY_SYSTEM = `${SYSTEM_PREFIX}
- Summarize only what is in the provided record or list data.
- For records: problem, status, priority, assignment, key dates, recent activity.
- For lists: count, status/priority mix, overdue or bottleneck hints. Do not overstate.`;

export type RetrievedHelpContext = { sections: HelpSection[] };
export type RetrievedOpsContext = {
  workOrders?: WorkOrderSummaryRow[];
  pmDue?: { id: string; name: string | null; asset_name: string | null; next_run_date: string | null }[];
  technicianWorkload?: { technician_id: string; technician_name: string | null; open_count: number }[];
  listSummary?: { total: number; byStatus: Record<string, number>; byPriority?: Record<string, number> };
  summary?: {
    totalOpen: number;
    overdue: number;
    highPriority: number;
    unassigned: number;
  };
  derivedMetrics?: {
    percentOverdue: number;
    percentHighPriority: number;
  };
  breakdowns?: {
    topLocations?: { label: string; count: number }[];
    topTechnicians?: { name: string | null; openCount: number }[];
  };
  signals?: {
    backlogConcentration?: string | null;
    repeatedAssetIssues?: string[];
  };
};
export type RetrievedSummaryContext = {
  workOrder?: WorkOrderSummaryRow & { description?: string; notesExcerpt?: string };
  asset?: {
    id: string;
    name: string | null;
    status: string | null;
    condition: string | null;
    asset_type: string | null;
    location: string | null;
    health_score: number | null;
    work_order_count: number;
    pm_due_next: string | null;
  };
  listSummary?: { total: number; byStatus: Record<string, number>; byPriority?: Record<string, number> };
};

function stringifyHelp(sections: HelpSection[]): string {
  if (!sections.length) return "(No help content found for this topic.)";
  return sections
    .map(
      (s) =>
        `[${s.moduleName}] ${s.title}\n${s.content}`
    )
    .join("\n\n---\n\n");
}

function stringifyWorkOrders(rows: WorkOrderSummaryRow[]): string {
  if (!rows.length) return "No matching work orders.";
  return rows
    .map(
      (r) =>
        `- ${r.work_order_number ?? r.id}: ${r.title ?? "Untitled"} | status=${r.status} | priority=${r.priority} | due=${r.due_date ?? "—"} | ${r.location ?? "—"} | assigned=${r.assigned_to ?? "Unassigned"}`
    )
    .join("\n");
}

export function buildAiPrompt(
  intent: AiIntent,
  userQuery: string,
  context: RetrievedHelpContext | RetrievedOpsContext | RetrievedSummaryContext
): { system: string; user: string } {
  const user = userQuery.trim();
  switch (intent) {
    case "HELP": {
      const sections = (context as RetrievedHelpContext).sections ?? [];
      return {
        system: HELP_SYSTEM,
        user: `Help context (may be partial or generic):\n${stringifyHelp(
          sections
        )}\n\nUser question: ${user}\n\nRespond as a confident Cornerstone OS product expert.\n\nFormat STRICTLY as:\n1) One short introductory sentence (what the user will do).\n2) Numbered steps (3-6 steps max) that a user can follow in the Cornerstone OS UI.\n3) Optional one-line note or tip starting with "Tip:" if helpful.\n\nDo NOT mention missing documentation. Do NOT say that steps are not available. Always provide best-effort, concrete steps.\n\nEnd with a JSON block on a single line: {"bulletHighlights":["...","..."],"followUpSuggestions":["...","..."]}. Use empty arrays if none.`,
      };
    }
    case "OPS_QUERY": {
      const ops = context as RetrievedOpsContext;
      const parts: string[] = [];
      if (ops.summary && ops.derivedMetrics) {
        parts.push(
          `Summary: totalOpen=${ops.summary.totalOpen}, overdue=${ops.summary.overdue} (${ops.derivedMetrics.percentOverdue}%), highPriority=${ops.summary.highPriority} (${ops.derivedMetrics.percentHighPriority}%), unassigned=${ops.summary.unassigned}`
        );
      }
      if (ops.breakdowns?.topLocations?.length) {
        parts.push(
          "Top locations by open work orders:\n" +
            ops.breakdowns.topLocations
              .map((l) => `- ${l.label}: ${l.count}`)
              .join("\n")
        );
      }
      if (ops.breakdowns?.topTechnicians?.length) {
        parts.push(
          "Most loaded technicians:\n" +
            ops.breakdowns.topTechnicians
              .map((t) => `- ${t.name ?? "Unassigned"}: ${t.openCount} open/scheduled`)
              .join("\n")
        );
      }
      if (ops.signals?.backlogConcentration || ops.signals?.repeatedAssetIssues?.length) {
        const sigLines: string[] = [];
        if (ops.signals.backlogConcentration) {
          sigLines.push(`Backlog concentration: ${ops.signals.backlogConcentration}`);
        }
        if (ops.signals.repeatedAssetIssues?.length) {
          sigLines.push(
            `Repeated issue signals: ${ops.signals.repeatedAssetIssues.slice(0, 3).join(", ")}`
          );
        }
        parts.push("Signals:\n" + sigLines.join("\n"));
      }
      if (ops.workOrders?.length) parts.push("Open work orders:\n" + stringifyWorkOrders(ops.workOrders));
      if (ops.pmDue?.length)
        parts.push(
          "PM due:\n" +
            ops.pmDue
              .map(
                (p) =>
                  `- ${p.name ?? p.id} | asset: ${p.asset_name ?? "—"} | next: ${p.next_run_date ?? "—"}`
              )
              .join("\n")
        );
      if (ops.technicianWorkload?.length)
        parts.push(
          "Technician workload (scheduled):\n" +
            ops.technicianWorkload
              .map((t) => `- ${t.technician_name ?? t.technician_id}: ${t.open_count} open/scheduled`)
              .join("\n")
        );
      if (ops.listSummary)
        parts.push(
          `List summary: total=${ops.listSummary.total}, byStatus=${JSON.stringify(ops.listSummary.byStatus)}${ops.listSummary.byPriority ? ", byPriority=" + JSON.stringify(ops.listSummary.byPriority) : ""}`
        );
      const dataBlock = parts.length ? parts.join("\n\n") : "No data retrieved for this question.";
      return {
        system: OPS_SYSTEM,
        user: `Data (tenant-scoped, already summarized):\n${dataBlock}\n\nUser question: ${user}\n\nRespond as an operations analyst.\n\nYour answer MUST include:\n- 1–2 concise bullet points under "Key insights" describing the most important risks or bottlenecks.\n- Optional 1–3 short supporting bullets under "Details" if needed.\n\nDo NOT just restate counts. Explain what the data means for day-to-day operations. Keep it brief.\n\nEnd with a JSON block on a single line: {"bulletHighlights":["...","..."],"followUpSuggestions":["...","..."]}. Use empty arrays if none.`,
      };
    }
    case "RECORD_SUMMARY":
    case "LIST_SUMMARY": {
      const sum = context as RetrievedSummaryContext;
      const parts: string[] = [];
      if (sum.workOrder) {
        const w = sum.workOrder;
        parts.push(
          `Work order: ${w.work_order_number ?? w.id} | ${w.title ?? "Untitled"} | status=${w.status} | priority=${w.priority} | due=${w.due_date ?? "—"} | location=${w.location ?? "—"} | assigned=${w.assigned_to ?? "Unassigned"}${w.description ? "\nDescription: " + String(w.description).slice(0, 500) : ""}${w.notesExcerpt ? "\nRecent notes: " + w.notesExcerpt : ""}`
        );
      }
      if (sum.asset) {
        const a = sum.asset;
        parts.push(
          `Asset: ${a.name ?? a.id} | status=${a.status} | condition=${a.condition} | type=${a.asset_type} | location=${a.location} | health=${a.health_score ?? "—"} | WO count=${a.work_order_count} | next PM=${a.pm_due_next ?? "—"}`
        );
      }
      if (sum.listSummary)
        parts.push(
          `List: total=${sum.listSummary.total}, byStatus=${JSON.stringify(sum.listSummary.byStatus)}${sum.listSummary.byPriority ? ", byPriority=" + JSON.stringify(sum.listSummary.byPriority) : ""}`
        );
      const dataBlock = parts.length ? parts.join("\n\n") : "No record or list data provided.";
      return {
        system: SUMMARY_SYSTEM,
        user: `Record/list data:\n${dataBlock}\n\nUser request: ${user}\n\nRespond with a brief summary. End with a JSON block on a single line: {"bulletHighlights":["...","..."],"followUpSuggestions":["...","..."]}. Use empty arrays if none.`,
      };
    }
    default: {
      return {
        system: `${SYSTEM_PREFIX}\n- The question could not be classified. Answer briefly if you can from general product knowledge; otherwise suggest rephrasing or using Help.`,
        user: `User question: ${user}\n\nRespond briefly. End with JSON: {"bulletHighlights":[],"followUpSuggestions":[]}.`,
      };
    }
  }
}
