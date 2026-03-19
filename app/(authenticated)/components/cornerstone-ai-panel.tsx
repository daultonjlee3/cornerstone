"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, AlertCircle, X, Lightbulb } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  submitCornerstoneAiQuery,
  executeCornerstoneAiActionRequest,
  previewCornerstoneAiActionRequest,
} from "@/app/(authenticated)/ai/actions";
import type { CornerstoneAiContext, CornerstoneAiResponse } from "@/src/lib/cornerstone-ai/types";
import { useRouter } from "next/navigation";
import type { AssignWorkOrdersActionPreview, CreateWorkOrderActionPreview } from "@/src/lib/cornerstone-ai/types";
import { useOperationOptimizationProposals } from "@/src/components/operation-optimization/OperationOptimizationProvider";

const SUGGESTED_PROMPTS = [
  "What work orders are overdue today?",
  "Summarize open work orders",
  "Which technicians are overloaded?",
  "How do I create a work order?",
  "Assign unassigned work orders",
  "Create a work order for: broken HVAC in Building A",
];

type CornerstoneAiPanelProps = {
  open: boolean;
  onClose: () => void;
  context?: CornerstoneAiContext;
  initialQuery?: string;
};

export function CornerstoneAiPanel({
  open,
  onClose,
  context,
  initialQuery = "",
}: CornerstoneAiPanelProps) {
  const router = useRouter();
  const { proposals: optimizationProposals } = useOperationOptimizationProposals();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [response, setResponse] = useState<CornerstoneAiResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const parseAnswer = (answer: string) => {
    // Strip basic markdown bold markers
    const cleaned = answer.replace(/\*\*(.*?)\*\*/g, "$1").trim();
    const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      return { title: "", steps: [] as string[], tip: "" };
    }
    const title = lines[0];
    const steps: string[] = [];
    let tip = "";
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^tip[:\-]/i.test(line)) {
        tip = line.replace(/^tip[:\-]\s*/i, "");
      } else if (/^\d+[\).\s]/.test(line)) {
        steps.push(line.replace(/^\d+[\).\s]*/, ""));
      } else {
        // Treat as continuation of last step if exists
        if (steps.length) {
          steps[steps.length - 1] = `${steps[steps.length - 1]} ${line}`;
        } else {
          steps.push(line);
        }
      }
    }
    return { title, steps, tip };
  };

  const runQuery = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed || loading) return;
      setError(null);
      setLastQuestion(trimmed);
      setResponse(null);
      setLoading(true);
      try {
        const result = await submitCornerstoneAiQuery(trimmed, context);
        if (result.ok) {
          setResponse(result.data);
          setQuery("");
        } else {
          setError(result.error || "Something went wrong. Try again.");
        }
      } catch (err) {
        console.error("[Cornerstone AI] Client error", err);
        setError("Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading, context]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      runQuery(query);
    },
    [query, runQuery]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      runQuery(suggestion);
    },
    [runQuery]
  );

  const handleOptimizationProposalClick = useCallback(
    async (p: (typeof optimizationProposals)[number]) => {
      if (loading) return;
      if (!p.proposedAction) {
        // Non-mutating recommendation: route user where it matters.
        if (p.type === "prioritize" || p.type === "auto_dispatch" || p.type === "rebalance") {
          router.push("/dispatch");
          return;
        }
        router.push("/assets/intelligence");
        return;
      }

      setError(null);
      setLastQuestion(p.title);
      setResponse(null);
      setLoading(true);

      try {
        const result = await previewCornerstoneAiActionRequest({
          actionType: p.proposedAction.actionType,
          parameters: p.proposedAction.parameters,
        });
        if (!result.ok) {
          setError(result.error);
          setLastQuestion(null);
          return;
        }
        setResponse(result.data);
      } catch {
        setError("Something went wrong. Try again.");
        setLastQuestion(null);
      } finally {
        setLoading(false);
      }
    },
    [loading, optimizationProposals, router]
  );

  const handleFollowUpClick = useCallback(
    (s: string) => {
      runQuery(s);
    },
    [runQuery]
  );

  const handleCancelProposedAction = useCallback(() => {
    setResponse((prev) => (prev ? { ...prev, proposedAction: undefined } : prev));
  }, []);

  const handleConfirmProposedAction = useCallback(async () => {
    if (!response?.proposedAction || loading) return;
    setError(null);
    setLoading(true);
    try {
      const result = await executeCornerstoneAiActionRequest({
        actionType: response.proposedAction.actionType,
        executeSpec: response.proposedAction.executeSpec,
      });

      if (!result.ok) {
        setError(result.error || "Something went wrong. Try again.");
        return;
      }

      setResponse(result.data);
      router.refresh();
      window.dispatchEvent(new CustomEvent("cornerstone:ops-optimization-refresh"));
    } catch (e) {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [response?.proposedAction, loading, router]);

  // Sync initialQuery from parent (e.g. record summary)
  useEffect(() => {
    if (open && initialQuery && !lastQuestion && !response && !loading) {
      setQuery(initialQuery);
    }
  }, [open, initialQuery, lastQuestion, response, loading]);

  // Scroll to bottom when new response arrives
  useEffect(() => {
    if (response && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response]);

  if (!open) return null;

  const hasInteraction = lastQuestion !== null || loading;
  const isEmpty = !hasInteraction && !response && !error;

  return (
    <div className="fixed bottom-20 right-6 z-50 w-full max-w-sm sm:max-w-md">
      <div className="flex h-[520px] max-h-[calc(100vh-6rem)] flex-col rounded-[var(--radius-card)] border border-[var(--card-border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-[var(--card-border)] px-4 py-3">
          <div className="flex min-w-0 items-start gap-2">
            <div className="mt-0.5">
              <Sparkles className="size-5 text-[var(--accent)]" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Ask Cornerstone</h2>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Get insights about your operations and workflows.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto p-4"
          aria-live="polite"
        >
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-3">
              {lastQuestion && (
                <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2">
                  <p className="text-xs font-medium text-[var(--muted)]">You asked</p>
                  <p className="mt-0.5 text-sm text-[var(--foreground)]">{lastQuestion}</p>
                </div>
              )}
              <div className="flex items-center gap-2 py-4 text-sm text-[var(--muted)]">
                <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                <span>Analyzing your operations…</span>
              </div>
            </div>
          )}

          {!loading && lastQuestion && response && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2">
                <p className="text-xs font-medium text-[var(--muted)]">You asked</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">{lastQuestion}</p>
              </div>
              <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-sm">
                {response.proposedAction?.requiresConfirmation ? (
                  <div className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
                    <p className="text-xs font-semibold text-[var(--foreground)]">Proposed action</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Confirm to perform this change. AI won’t modify data until you click Confirm.
                    </p>

                    {response.proposedAction.actionType === "assign_work_orders" ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-[var(--muted)]">Assign to</span>
                          <span className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs">
                            {(response.proposedAction.preview as AssignWorkOrdersActionPreview).recommendedTechnician.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Affected work orders:{" "}
                          <span className="font-medium text-[var(--foreground)]">
                            {(response.proposedAction.preview as AssignWorkOrdersActionPreview).workOrders.length}
                          </span>
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          Will assign them to{" "}
                          <span className="font-medium text-[var(--foreground)]">
                            {(response.proposedAction.preview as AssignWorkOrdersActionPreview).recommendedTechnician.label}
                          </span>
                          .
                        </p>
                        <div className="max-h-28 overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--background)]/40 p-2">
                          {(response.proposedAction.preview as AssignWorkOrdersActionPreview).workOrders.slice(0, 8).map((w) => (
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
                          {(response.proposedAction.preview as AssignWorkOrdersActionPreview).workOrders.length > 8 ? (
                            <p className="mt-1 text-[11px] text-[var(--muted)]">+ more</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    {response.proposedAction.actionType === "create_work_order" ? (
                      <div className="mt-3 space-y-2 text-sm">
                        <p className="text-xs font-medium text-[var(--muted)]">New work order</p>
                        <div className="rounded-md border border-[var(--card-border)] bg-[var(--background)]/40 p-2">
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {(response.proposedAction.preview as CreateWorkOrderActionPreview).title}
                          </p>
                          {(response.proposedAction.preview as CreateWorkOrderActionPreview).description ? (
                            <p className="mt-0.5 text-xs text-[var(--muted)] line-clamp-2">
                              {(response.proposedAction.preview as CreateWorkOrderActionPreview).description}
                            </p>
                          ) : null}
                          {(response.proposedAction.preview as CreateWorkOrderActionPreview).due_date ? (
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              Due: {(response.proposedAction.preview as CreateWorkOrderActionPreview).due_date}
                            </p>
                          ) : null}
                          {(response.proposedAction.preview as CreateWorkOrderActionPreview).priority ? (
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              Priority: {(response.proposedAction.preview as CreateWorkOrderActionPreview).priority}
                            </p>
                          ) : null}
                          {(response.proposedAction.preview as CreateWorkOrderActionPreview).category ? (
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              Category: {(response.proposedAction.preview as CreateWorkOrderActionPreview).category}
                            </p>
                          ) : null}
                          {(response.proposedAction.preview as CreateWorkOrderActionPreview).assetId ? (
                            <p className="mt-0.5 text-xs text-[var(--muted)]">
                              Asset: {(response.proposedAction.preview as CreateWorkOrderActionPreview).assetId}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        onClick={handleConfirmProposedAction}
                        disabled={loading}
                        className="flex-1"
                      >
                        Confirm
                      </Button>
                      <Button
                        type="button"
                        onClick={handleCancelProposedAction}
                        variant="secondary"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
                {(() => {
                  const { title, steps, tip } = parseAnswer(response.answer);
                  return (
                    <div className="space-y-3">
                      {title ? (
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {title}
                        </p>
                      ) : null}
                      {steps.length ? (
                        <ol className="list-decimal space-y-1.5 pl-4 text-sm text-[var(--foreground)]">
                          {steps.map((s, i) => (
                            <li key={i} className="leading-relaxed">
                              {s}
                            </li>
                          ))}
                        </ol>
                      ) : null}
                      {tip ? (
                        <div className="flex items-start gap-2 rounded-md border border-[var(--card-border)] bg-[var(--background)]/80 px-3 py-2 text-xs text-[var(--muted)]">
                          <Lightbulb className="mt-0.5 size-3.5 text-[var(--accent)]" aria-hidden />
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Tip:</span>{" "}
                            <span>{tip}</span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                {response.bulletHighlights?.length ? (
                  <div className="mt-4 border-t border-[var(--card-border)] pt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--muted)]">
                      Key points
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--foreground)]">
                      {response.bulletHighlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {response.sources?.length ? (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                    <p className="text-xs font-medium text-[var(--muted)]">Sources</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--foreground)]">
                      {response.sources.map((s, i) => (
                        <li key={i}>{s.title}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {response.warnings?.length ? (
                  <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50/80 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      {response.warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
                {response.quotaStatus != null && (
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {response.quotaStatus.remainingCredits.toLocaleString()} credits remaining this month
                    {response.mode === "LIGHT" ? " · Light mode" : ""}
                  </p>
                )}
                {response.followUpSuggestions?.length ? (
                  <div className="mt-3 border-t border-[var(--card-border)] pt-3">
                    <p className="text-xs font-medium text-[var(--muted)] mb-1.5">Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {response.followUpSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleFollowUpClick(s)}
                          className="rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-1 text-xs text-[var(--foreground)] hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col gap-4 py-2">
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)]">Ask Cornerstone anything</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Ask questions about your operations or how to use Cornerstone. Answers use your data and help content.
                </p>
              </div>

              {optimizationProposals.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[var(--muted)]">Suggested next actions</p>
                  <ul className="space-y-2">
                    {optimizationProposals.slice(0, 3).map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => void handleOptimizationProposalClick(p)}
                          className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2.5 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background)] hover:border-[var(--accent)]/30"
                        >
                          <div className="font-medium">{p.title}</div>
                          <div className="mt-1 text-xs text-[var(--muted)]">{p.summary}</div>
                          <div className="mt-2">
                            {p.proposedAction ? (
                              <span className="inline-flex items-center rounded-md bg-[var(--accent)]/10 px-2 py-1 text-[11px] font-medium text-[var(--accent)]">
                                Review & apply
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-[var(--background)]/80 px-2 py-1 text-[11px] font-medium text-[var(--muted)]">
                                View details
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-xs font-medium text-[var(--muted)]">Try asking</p>
              <ul className="space-y-2">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(prompt)}
                      className="w-full rounded-lg border border-[var(--card-border)] bg-[var(--background)]/50 px-3 py-2.5 text-left text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--background)] hover:border-[var(--accent)]/30"
                    >
                      {prompt}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Input anchored at bottom */}
        <div className="shrink-0 border-t border-[var(--card-border)] bg-[var(--card)] p-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about work orders, assets, PMs…"
              className="min-w-0 flex-1 rounded-lg border border-[var(--card-border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60"
              disabled={loading}
              aria-label="Ask a question"
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              size="sm"
              className="shrink-0"
              aria-label="Send"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
