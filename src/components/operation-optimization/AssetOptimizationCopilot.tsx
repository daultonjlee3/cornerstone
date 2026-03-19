"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { useOperationOptimizationProposals } from "./OperationOptimizationProvider";
import type { OptimizationProposedAction, OptimizationProposal } from "@/src/lib/ops-optimization/types";
import { AiActionReviewModal } from "@/src/components/ai-action-review/AiActionReviewModal";
import { Card } from "@/src/components/ui/card";

function toneFromPriority(priority: OptimizationProposal["priority"]): string {
  if (priority === "urgent") return "border-red-200/80 bg-red-50/30";
  if (priority === "high") return "border-amber-200/80 bg-amber-50/30";
  if (priority === "medium") return "border-blue-200/80 bg-blue-50/30";
  return "border-[var(--card-border)]/80 bg-[var(--background)]/30";
}

export function AssetOptimizationCopilot() {
  const router = useRouter();
  const { proposals } = useOperationOptimizationProposals();
  const relevant = useMemo(
    () =>
      proposals
        .filter((p) => ["pm_opportunity", "asset_risk"].includes(p.type))
        .filter((p) => !!p.proposedAction)
        .slice(0, 2),
    [proposals]
  );

  const [selected, setSelected] = useState<OptimizationProposedAction | null>(null);
  const open = !!selected;

  if (!relevant.length) return null;

  return (
    <>
      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
          Operations Optimization (Assets)
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Proposals that need your approval.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {relevant.map((p) => (
            <Card key={p.id} className={`border ${toneFromPriority(p.priority)} p-3`}>
              <p className="text-xs font-semibold text-[var(--foreground)]">{p.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{p.summary}</p>
              <p className="mt-2 text-xs text-[var(--muted)] line-clamp-3">{p.rationale}</p>
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  className="w-full justify-center text-[11px]"
                  variant="secondary"
                  onClick={() => setSelected(p.proposedAction!)}
                >
                  Review & create PM
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {selected ? (
        <AiActionReviewModal
          proposedAction={selected}
          open={open}
          onClose={() => setSelected(null)}
          onExecuted={() => router.refresh()}
        />
      ) : null}
    </>
  );
}

