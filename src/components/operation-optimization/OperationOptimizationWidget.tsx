"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { AiActionReviewModal } from "@/src/components/ai-action-review/AiActionReviewModal";
import { useOperationOptimizationProposals } from "./OperationOptimizationProvider";
import type { OptimizationProposal } from "@/src/lib/ops-optimization/types";
import type { OptimizationProposedAction } from "@/src/lib/ops-optimization/types";

function priorityBadgeLabel(priority: OptimizationProposal["priority"]) {
  if (priority === "urgent") return "Urgent";
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

function actionLabel(p: OptimizationProposal) {
  if (!p.proposedAction) return null;
  if (p.proposedAction.actionType === "assign_work_orders") return "Review & apply";
  return "Review & create";
}

export function OperationOptimizationWidget({ maxVisible = 3 }: { maxVisible?: number }) {
  const router = useRouter();
  const { proposals } = useOperationOptimizationProposals();
  const top = useMemo(() => proposals.slice(0, maxVisible), [proposals, maxVisible]);
  const [modalAction, setModalAction] = useState<OptimizationProposedAction | null>(null);

  const handleOpenReview = (p: OptimizationProposal) => {
    if (!p.proposedAction) return;
    setModalAction(p.proposedAction);
  };

  if (!top.length) return null;

  return (
    <section className="space-y-3" data-tour="dashboard:optimization-proposals">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Operations Optimization</h2>
          <p className="text-sm text-[var(--muted)]">Top proposals based on current work, workload, and maintenance signals.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {top.map((p) => (
          <div key={p.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/70 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {priorityBadgeLabel(p.priority)}
              </p>
            </div>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{p.title}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{p.summary}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{p.rationale}</p>

            {p.affectedRecords.length ? (
              <div className="mt-2">
                <p className="text-[11px] font-medium text-[var(--muted)]">Top affected</p>
                <div className="mt-1 space-y-1">
                  {p.affectedRecords.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 text-xs text-[var(--foreground)]">
                      <div className="min-w-0">
                        {r.work_order_number || r.title ? (
                          <>
                            <span className="font-medium">
                              {r.work_order_number ?? "WO"}{r.title ? ` · ${r.title}` : ""}
                            </span>
                            {r.due_date ? <div className="text-[11px] text-[var(--muted)]">Due {r.due_date}</div> : null}
                          </>
                        ) : (
                          <>
                            <span className="font-medium">{r.assetName ?? r.label ?? "Asset"}</span>
                            {r.failureCount != null ? (
                              <div className="text-[11px] text-[var(--muted)]">{r.failureCount} recent failures</div>
                            ) : null}
                          </>
                        )}
                      </div>
                      {r.priority ? (
                        <span className="shrink-0 text-[11px] text-[var(--muted)]">{r.priority}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              {p.proposedAction ? (
                <Button type="button" className="w-full" onClick={() => handleOpenReview(p)} disabled={!p.confirmationRequired}>
                  {actionLabel(p) ?? "Review"}
                </Button>
              ) : p.type === "prioritize" ? (
                <Button type="button" className="w-full" variant="secondary" onClick={() => router.push("/dispatch")}>
                  Open Dispatch
                </Button>
              ) : p.type === "pm_opportunity" || p.type === "asset_risk" ? (
                <Button
                  type="button"
                  className="w-full"
                  variant="secondary"
                  onClick={() => router.push("/assets/intelligence")}
                >
                  Open Asset Intelligence
                </Button>
              ) : (
                <Button type="button" className="w-full" variant="secondary" onClick={() => router.push("/work-orders")}>
                  Open Work Orders
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {modalAction ? (
        <AiActionReviewModal
          proposedAction={modalAction}
          open={!!modalAction}
          onClose={() => setModalAction(null)}
          onExecuted={() => router.refresh()}
        />
      ) : null}
    </section>
  );
}

