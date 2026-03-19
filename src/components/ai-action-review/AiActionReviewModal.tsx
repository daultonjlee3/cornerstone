"use client";

import { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  executeCornerstoneAiActionRequest,
  previewCornerstoneAiActionRequest,
} from "@/app/(authenticated)/ai/actions";
import type {
  AiActionType,
  CornerstoneAiResponse,
  AssignWorkOrdersActionPreview,
  CreateWorkOrderActionPreview,
} from "@/src/lib/cornerstone-ai/types";
import type { OptimizationProposedAction } from "@/src/lib/ops-optimization/types";

type Props = {
  proposedAction: OptimizationProposedAction;
  open: boolean;
  onClose: () => void;
  onExecuted?: () => void;
};

function ProposedActionPreview({ response }: { response: CornerstoneAiResponse }) {
  const proposed = response.proposedAction;
  if (!proposed?.requiresConfirmation) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[var(--foreground)]">Proposed action</p>
      <p className="text-xs text-[var(--muted)]">
        Review and click Confirm to apply changes. AI won’t modify anything until you confirm.
      </p>

      {proposed.actionType === "assign_work_orders" ? (
        (() => {
          const p = proposed.preview as AssignWorkOrdersActionPreview;
          return (
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-[var(--muted)]">Assign to</span>
                <span className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs">
                  {p.recommendedTechnician.label}
                </span>
              </div>
              <p className="text-xs text-[var(--muted)]">
                Affected work orders:{" "}
                <span className="font-medium text-[var(--foreground)]">{p.workOrders.length}</span>
              </p>
              <div className="max-h-28 overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--background)]/40 p-2">
                {p.workOrders.slice(0, 8).map((w) => (
                  <div key={w.id} className="flex items-start justify-between gap-3 py-0.5">
                    <span className="min-w-0 truncate text-[12px]">
                      {w.work_order_number ?? w.id} {w.title ? `- ${w.title}` : ""}
                      {w.currentlyAssignedTo ? ` (${w.currentlyAssignedTo})` : ""}
                    </span>
                    <span className="shrink-0 text-[12px] text-[var(--muted)]">{w.due_date ? `Due ${w.due_date}` : ""}</span>
                  </div>
                ))}
                {p.workOrders.length > 8 ? <p className="mt-1 text-[11px] text-[var(--muted)]">+ more</p> : null}
              </div>
            </div>
          );
        })()
      ) : null}

      {proposed.actionType === "create_work_order" ? (
        (() => {
          const p = proposed.preview as CreateWorkOrderActionPreview;
          return (
            <div className="mt-2 rounded-md border border-[var(--card-border)] bg-[var(--background)]/40 p-2">
              <p className="text-sm font-medium text-[var(--foreground)]">{p.title}</p>
              {p.description ? (
                <p className="mt-0.5 text-xs text-[var(--muted)] line-clamp-2">{p.description}</p>
              ) : null}
              {p.due_date ? <p className="mt-0.5 text-xs text-[var(--muted)]">Due: {p.due_date}</p> : null}
              {p.priority ? <p className="mt-0.5 text-xs text-[var(--muted)]">Priority: {p.priority}</p> : null}
              {p.category ? <p className="mt-0.5 text-xs text-[var(--muted)]">Category: {p.category}</p> : null}
              {p.assetId ? <p className="mt-0.5 text-xs text-[var(--muted)]">Asset: {p.assetId}</p> : null}
            </div>
          );
        })()
      ) : null}
    </div>
  );
}

export function AiActionReviewModal({ proposedAction, open, onClose, onExecuted }: Props) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExecute, setLoadingExecute] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedResponse, setProposedResponse] = useState<CornerstoneAiResponse | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setError(null);
      setProposedResponse(null);
      setLoadingPreview(true);
      try {
        const result = await previewCornerstoneAiActionRequest({
          actionType: proposedAction.actionType,
          parameters: proposedAction.parameters,
        });
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setProposedResponse(result.data);
      } catch {
        if (cancelled) return;
        setError("Could not generate action preview. Try again.");
      } finally {
        if (cancelled) return;
        setLoadingPreview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, proposedAction]);

  const handleConfirm = async () => {
    if (!proposedResponse?.proposedAction) return;
    setError(null);
    setLoadingExecute(true);
    try {
      const result = await executeCornerstoneAiActionRequest({
        actionType: proposedResponse.proposedAction.actionType as AiActionType,
        executeSpec: proposedResponse.proposedAction.executeSpec,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"));
      onExecuted?.();
      onClose();
      setProposedResponse(null);
    } catch {
      setError("Action failed. Try again.");
    } finally {
      setLoadingExecute(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-xl">
        {loadingPreview ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">Generating preview…</p>
            <p className="text-xs text-[var(--muted)]">We’re preparing the exact changes for your confirmation.</p>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">Something went wrong</p>
            <p className="text-xs text-[var(--muted)]">{error}</p>
          </div>
        ) : proposedResponse?.proposedAction ? (
          <>
            <ProposedActionPreview response={proposedResponse} />
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={loadingExecute}
                className="flex-1"
              >
                {loadingExecute ? "Confirming…" : "Confirm"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={loadingExecute}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">No proposed action</p>
            <p className="text-xs text-[var(--muted)]">This proposal doesn’t require confirmation.</p>
            <div className="mt-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

