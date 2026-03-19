"use client";

import { useMemo, useState } from "react";
import type { OptimizationProposal, OptimizationProposedAction } from "@/src/lib/ops-optimization/types";
import { useOperationOptimizationProposals } from "@/src/components/operation-optimization/OperationOptimizationProvider";
import { AiActionReviewModal } from "@/src/components/ai-action-review/AiActionReviewModal";
import { WorkloadPanel } from "./WorkloadPanel";
import { Button } from "@/src/components/ui/button";

function badgeTone(priority: OptimizationProposal["priority"]): string {
  if (priority === "urgent") return "bg-red-500/10 text-red-700 border-red-200";
  if (priority === "high") return "bg-amber-500/10 text-amber-800 border-amber-200";
  if (priority === "medium") return "bg-blue-500/10 text-blue-800 border-blue-200";
  return "bg-[var(--background)] text-[var(--muted)] border-[var(--card-border)]";
}

export function DispatchOptimizationCopilot() {
  const { proposals } = useOperationOptimizationProposals();
  const relevant = useMemo(
    () =>
      proposals
        .filter((p) => ["auto_dispatch", "rebalance"].includes(p.type))
        .filter((p) => !!p.proposedAction)
        .slice(0, 2),
    [proposals]
  );

  const [selected, setSelected] = useState<OptimizationProposedAction | null>(null);

  if (!relevant.length) return null;

  return (
    <>
      <WorkloadPanel title="AI Optimization (review)" description="Proposals that need your approval.">
        <div className="space-y-2">
          {relevant.map((p) => (
            <div key={p.id} className="rounded border border-[var(--card-border)]/60 bg-[var(--background)]/50 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--foreground)] truncate">{p.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">{p.summary}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${badgeTone(p.priority)}`}>
                  {p.priority}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted)] line-clamp-2">{p.rationale}</p>
              <div className="mt-2">
                <Button type="button" size="sm" className="w-full justify-center text-[11px]" onClick={() => setSelected(p.proposedAction!)} variant="secondary">
                  Review & apply
                </Button>
              </div>
            </div>
          ))}
        </div>
      </WorkloadPanel>

      {selected ? (
        <AiActionReviewModal
          proposedAction={selected}
          open={true}
          onClose={() => setSelected(null)}
          onExecuted={() => window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"))}
        />
      ) : null}
    </>
  );
}

