"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import type { CornerstoneAiResponse } from "@/src/lib/cornerstone-ai/types";
import type {
  AssignWorkOrdersActionPreview,
  CreateWorkOrderActionPreview,
} from "@/src/lib/cornerstone-ai/types";
import { previewCornerstoneAiActionRequest, executeCornerstoneAiActionRequest } from "@/app/(authenticated)/ai/actions";
import type { OperationSuggestion } from "@/src/lib/ops-suggestions/types";
import { useOperationSuggestions } from "./OperationSuggestionsProvider";

type SuggestionModalState = {
  loadingPreview: boolean;
  loadingExecute: boolean;
  error: string | null;
  proposedResponse: CornerstoneAiResponse | null;
};

function ProposedActionPreview({
  response,
}: {
  response: CornerstoneAiResponse;
}) {
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
                    <span className="shrink-0 text-[12px] text-[var(--muted)]">
                      {w.due_date ? `Due ${w.due_date}` : ""}
                    </span>
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

export function OperationSuggestionsWidget({
  maxSuggestions = 5,
}: {
  maxSuggestions?: number;
}) {
  const router = useRouter();
  const { suggestions } = useOperationSuggestions();

  const topSuggestions = suggestions.slice(0, maxSuggestions);

  const [modalOpen, setModalOpen] = useState(false);
  const [state, setState] = useState<SuggestionModalState>({
    loadingPreview: false,
    loadingExecute: false,
    error: null,
    proposedResponse: null,
  });

  const handleRunSuggestion = async (s: OperationSuggestion) => {
    setModalOpen(true);
    setState({ loadingPreview: true, loadingExecute: false, error: null, proposedResponse: null });

    try {
      const result = await previewCornerstoneAiActionRequest({
        actionType: s.actionType,
        parameters: s.parameters,
      });
      if (!result.ok) {
        setState({ loadingPreview: false, loadingExecute: false, error: result.error, proposedResponse: null });
        return;
      }

      if (!result.data.proposedAction?.requiresConfirmation) {
        setState({
          loadingPreview: false,
          loadingExecute: false,
          error: null,
          proposedResponse: result.data,
        });
        return;
      }

      setState({
        loadingPreview: false,
        loadingExecute: false,
        error: null,
        proposedResponse: result.data,
      });
    } catch (e) {
      setState({
        loadingPreview: false,
        loadingExecute: false,
        error: "Could not generate action preview. Try again.",
        proposedResponse: null,
      });
    }
  };

  const handleCancel = () => {
    setModalOpen(false);
    setState({ loadingPreview: false, loadingExecute: false, error: null, proposedResponse: null });
  };

  const handleConfirm = async () => {
    if (!state.proposedResponse?.proposedAction?.requiresConfirmation) return;

    setState((prev) => ({ ...prev, loadingExecute: true, error: null }));
    try {
      const proposed = state.proposedResponse.proposedAction;
      const result = await executeCornerstoneAiActionRequest({
        actionType: proposed.actionType,
        executeSpec: proposed.executeSpec,
      });

      if (!result.ok) {
        setState((prev) => ({ ...prev, loadingExecute: false, error: result.error }));
        return;
      }

      // Ensure suggestions/widgets refresh immediately after mutation.
      window.dispatchEvent(new CustomEvent("cornerstone:ops-suggestions-refresh"));
      router.refresh();
      setModalOpen(false);
      setState({ loadingPreview: false, loadingExecute: false, error: null, proposedResponse: null });
    } catch (e) {
      setState((prev) => ({ ...prev, loadingExecute: false, error: "Action failed. Try again." }));
    }
  };

  if (!topSuggestions.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Recommended Actions</h2>
          <p className="text-sm text-[var(--muted)]">Smart suggestions based on current operations.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {topSuggestions.map((s) => (
          <div key={s.id} className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]/70 p-3 shadow-sm">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
              {s.priority === "high" ? "High priority" : s.priority === "medium" ? "Medium priority" : "Low priority"}
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{s.insight}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{s.recommendation}</p>

            <div className="mt-3">
              <Button type="button" className="w-full" onClick={() => void handleRunSuggestion(s)}>
                {s.actionType === "assign_work_orders" ? "Assign now" : "Create PM work order"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px]"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancel();
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-xl">
            {state.loadingPreview ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Generating preview…</p>
                <p className="text-xs text-[var(--muted)]">We’re preparing the exact changes for your confirmation.</p>
              </div>
            ) : state.error ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Something went wrong</p>
                <p className="text-xs text-[var(--muted)]">{state.error}</p>
              </div>
            ) : state.proposedResponse?.proposedAction?.requiresConfirmation ? (
              <>
                <ProposedActionPreview response={state.proposedResponse} />
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    onClick={() => void handleConfirm()}
                    disabled={state.loadingExecute}
                    className="flex-1"
                  >
                    {state.loadingExecute ? "Confirming…" : "Confirm"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                    disabled={state.loadingExecute}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : state.proposedResponse?.proposedAction ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">Action is ready</p>
                <p className="text-xs text-[var(--muted)]">This suggestion doesn’t require a confirmation step.</p>
                <div className="mt-4">
                  <Button type="button" variant="secondary" onClick={handleCancel}>
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium text-[var(--foreground)]">No proposed action.</p>
                <p className="text-xs text-[var(--muted)]">This suggestion doesn’t require confirmation.</p>
                <div className="mt-4">
                  <Button type="button" variant="secondary" onClick={handleCancel}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

