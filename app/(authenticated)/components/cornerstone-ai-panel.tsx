"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, AlertCircle, X, Lightbulb, ChevronRight, PanelRightClose } from "lucide-react";
import { AppIcon, IconChip } from "@/src/components/design-system/icons";
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
import { useFleetCopilot } from "@/src/components/fleet-intelligence/FleetCopilotProvider";
import {
  getFleetCopilotPromptCategories,
} from "@/src/lib/cornerstone-ai/copilot-prompts-config";
import "./fleet-intelligence-copilot.css";

const CMMS_SUGGESTED_PROMPTS = [
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
  /** Docked right rail (desktop fleet dispatch) vs floating card */
  variant?: "docked" | "floating";
  productProfile?: import("@/src/types/fleet").ProductProfile;
  /** When true (e.g. TopBar click), expand docked panel if currently collapsed */
  preferExpanded?: boolean;
  /** Reports docked expand/collapse for layout reservation */
  onDockExpandedChange?: (expanded: boolean) => void;
};

export function CornerstoneAiPanel({
  open,
  onClose,
  context: contextProp,
  initialQuery = "",
  variant = "floating",
  productProfile,
  preferExpanded = false,
  onDockExpandedChange,
}: CornerstoneAiPanelProps) {
  const router = useRouter();
  const { proposals: optimizationProposals } = useOperationOptimizationProposals();
  const { fleetMode: fleetModeFromProvider, aiContext: providerContext } = useFleetCopilot();
  const fleetMode =
    fleetModeFromProvider ||
    productProfile === "fleet_intelligence" ||
    contextProp?.productProfile === "fleet_intelligence";

  const mergedContext: CornerstoneAiContext = {
    ...providerContext,
    ...contextProp,
    productProfile: contextProp?.productProfile ?? productProfile ?? providerContext.productProfile,
    fleet: {
      ...providerContext.fleet,
      ...contextProp?.fleet,
    },
  };

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [response, setResponse] = useState<CornerstoneAiResponse | null>(null);
  const [collapsed, setCollapsed] = useState(() => variant === "docked");
  const scrollRef = useRef<HTMLDivElement>(null);

  const layoutVariant = fleetMode && variant === "docked" ? "docked" : "floating";

  const promptCategories = fleetMode
    ? getFleetCopilotPromptCategories(
        mergedContext.fleet?.screen ?? "default",
        Boolean(mergedContext.fleet?.selectedRecommendation?.id)
      )
    : [];

  const parseAnswer = (answer: string) => {
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
        const result = await submitCornerstoneAiQuery(trimmed, mergedContext);
        if (result.ok) {
          setResponse(result.data);
          setQuery("");
        } else {
          setError(result.error || "Something went wrong. Try again.");
        }
      } catch (err) {
        console.error("[Fleet Intelligence Copilot] Client error", err);
        setError("Something went wrong. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [loading, mergedContext]
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
      if (loading || fleetMode) return;
      if (!p.proposedAction) {
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
    [loading, optimizationProposals, router, fleetMode]
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
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }, [response?.proposedAction, loading, router]);

  useEffect(() => {
    if (open && initialQuery && !lastQuestion && !response && !loading) {
      setQuery(initialQuery);
    }
  }, [open, initialQuery, lastQuestion, response, loading]);

  useEffect(() => {
    if (response && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [response]);

  useEffect(() => {
    if (layoutVariant === "docked" && open && preferExpanded) {
      setCollapsed(false);
    }
  }, [layoutVariant, open, preferExpanded]);

  useEffect(() => {
    if (layoutVariant !== "docked" || !open) {
      onDockExpandedChange?.(false);
      return;
    }
    onDockExpandedChange?.(!collapsed);
  }, [layoutVariant, open, collapsed, onDockExpandedChange]);

  if (!open) return null;

  const handleClose = () => {
    if (layoutVariant === "docked") {
      setCollapsed(true);
      onClose();
      return;
    }
    onClose();
  };

  const handleExpandFromRail = () => {
    setCollapsed(false);
  };

  const hasInteraction = lastQuestion !== null || loading;
  const isEmpty = !hasInteraction && !response && !error;

  const title = fleetMode ? "Fleet Intelligence Copilot" : "Ask Cornerstone";
  const subtitle = fleetMode
    ? "Operational intelligence for dispatch, fleet status, and today's plan."
    : "Get insights about your operations and workflows.";
  const emptyHeading = fleetMode
    ? "Ask Fleet Intelligence about today's operation"
    : "Ask Cornerstone anything";
  const emptyBody = fleetMode
    ? "Ask about dispatch decisions, truck availability, revenue risk, deadhead, integrations, or today's plan. Answers use live fleet data, your current screen, and product knowledge."
    : "Ask questions about your operations or how to use Cornerstone. Answers use your data and help content.";
  const placeholder = fleetMode
    ? "Ask about dispatch, truck availability, revenue risk, deadhead, integrations, or today's plan…"
    : "Ask about work orders, assets, PMs…";
  const loadingText = fleetMode ? "Analyzing fleet operations…" : "Analyzing your operations…";

  const rootClass = [
    "fleet-copilot",
    layoutVariant === "docked" ? "fleet-copilot--docked" : "fleet-copilot--floating",
    collapsed && layoutVariant === "docked" ? "fleet-copilot--collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (layoutVariant === "docked" && collapsed) {
    return (
      <div className={rootClass} role="dialog" aria-label={title}>
        <div className="fleet-copilot__collapse-rail" style={{ display: "flex" }}>
          <button
            type="button"
            className="fleet-copilot__collapse-btn"
            onClick={handleExpandFromRail}
            aria-label="Expand Fleet Intelligence Copilot"
          >
            <Sparkles className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={rootClass} role="dialog" aria-label={title}>
      {layoutVariant === "docked" ? (
        <div className="fleet-copilot__collapse-rail">
          <button
            type="button"
            className="fleet-copilot__collapse-btn"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse copilot"
          >
            {collapsed ? (
              <Sparkles className="size-4" aria-hidden />
            ) : (
              <PanelRightClose className="size-4" aria-hidden />
            )}
          </button>
        </div>
      ) : null}

      <div className="fleet-copilot__panel">
        <div className="fleet-copilot__header">
          <div className="fleet-copilot__title-block">
            {fleetMode ? (
              <p className="fleet-copilot__eyebrow">Fleet Intelligence</p>
            ) : (
              <IconChip icon={Sparkles} variant="ai" size="sm" glow label="Cornerstone AI" />
            )}
            <h2 className="fleet-copilot__title">{title}</h2>
            <p className="fleet-copilot__subtitle">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            aria-label={layoutVariant === "docked" ? "Collapse" : "Close"}
          >
            <AppIcon icon={X} size="sm" intent="muted" />
          </button>
        </div>

        <div ref={scrollRef} className="fleet-copilot__body" aria-live="polite">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-800/40 bg-amber-950/30 p-3 text-sm text-amber-200">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-3">
              {lastQuestion && (
                <div className="fleet-copilot__message">
                  <p className="fleet-copilot__message-label">You asked</p>
                  <p className="fleet-copilot__message-text">{lastQuestion}</p>
                </div>
              )}
              <div className="fleet-copilot__loading">
                <Loader2 className="size-5 shrink-0 animate-spin" aria-hidden />
                <span>{loadingText}</span>
              </div>
            </div>
          )}

          {!loading && lastQuestion && response && (
            <div className="space-y-4">
              <div className="fleet-copilot__message">
                <p className="fleet-copilot__message-label">You asked</p>
                <p className="fleet-copilot__message-text">{lastQuestion}</p>
              </div>
              <div className="fleet-copilot__message">
                {!fleetMode && response.proposedAction?.requiresConfirmation ? (
                  <div className="mb-4 rounded-lg border border-[var(--card-border)] bg-[var(--background)]/60 p-3">
                    <p className="text-xs font-semibold text-[var(--foreground)]">Proposed action</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Confirm to perform this change. AI won't modify data until you click Confirm.
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
                        <div className="max-h-28 overflow-y-auto rounded-md border border-[var(--card-border)] bg-[var(--background)]/40 p-2">
                          {(response.proposedAction.preview as AssignWorkOrdersActionPreview).workOrders.slice(0, 8).map((w) => (
                            <div key={w.id} className="flex items-start justify-between gap-3 py-0.5">
                              <span className="min-w-0 truncate text-[12px]">
                                {w.work_order_number ?? w.id} {w.title ? `- ${w.title}` : ""}
                              </span>
                            </div>
                          ))}
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
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4 flex gap-2">
                      <Button type="button" onClick={handleConfirmProposedAction} disabled={loading} className="flex-1">
                        Confirm
                      </Button>
                      <Button type="button" onClick={handleCancelProposedAction} variant="secondary" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
                {(() => {
                  const { title: ansTitle, steps, tip } = parseAnswer(response.answer);
                  return (
                    <div className="space-y-3">
                      {ansTitle ? (
                        <p className="text-sm font-medium text-[var(--foreground)]">{ansTitle}</p>
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
                        <div className="flex items-start gap-2 rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs text-[var(--text-muted)]">
                          <Lightbulb className="mt-0.5 size-3.5 text-[var(--brand-operational)]" aria-hidden />
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Tip:</span> {tip}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
                {response.bulletHighlights?.length ? (
                  <div className="mt-4 border-t border-[var(--surface-border-subtle)] pt-3">
                    <p className="mb-1 text-xs font-medium text-[var(--text-muted)]">Key points</p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-[var(--foreground)]">
                      {response.bulletHighlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {fleetMode &&
                (response.fleetCopilot?.sourcesUsed?.length || response.sources?.length) ? (
                  <div className="mt-3 border-t border-[var(--surface-border-subtle)] pt-3">
                    <p className="text-xs font-medium text-[var(--text-muted)]">Based on</p>
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--foreground)]">
                      {(response.fleetCopilot?.sourcesUsed ?? []).map((s, i) => (
                        <li key={`fc-${i}`}>• {s.title}</li>
                      ))}
                      {!response.fleetCopilot?.sourcesUsed?.length &&
                        response.sources?.map((s, i) => <li key={`s-${i}`}>• {s.title}</li>)}
                    </ul>
                    {response.fleetCopilot?.dataFreshness ? (
                      <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                        Data as of {new Date(response.fleetCopilot.dataFreshness).toLocaleString()}
                      </p>
                    ) : null}
                    {response.fleetCopilot?.missingData?.length ? (
                      <p className="mt-1 text-[10px] text-amber-400/90">
                        Missing: {response.fleetCopilot.missingData.join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {response.followUpSuggestions?.length ? (
                  <div className="mt-3 border-t border-[var(--surface-border-subtle)] pt-3">
                    <p className="mb-1.5 text-xs font-medium text-[var(--text-muted)]">Suggestions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {response.followUpSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleFollowUpClick(s)}
                          className="rounded-md border border-[var(--surface-border-subtle)] bg-[var(--surface-raised)]/60 px-2 py-1 text-xs text-[var(--foreground)] hover:border-[var(--brand-operational)]/35 hover:bg-[var(--brand-operational-subtle)]"
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
            <div className="flex flex-col gap-4 py-1">
              <div>
                <h3 className="text-sm font-medium text-[var(--foreground)]">{emptyHeading}</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{emptyBody}</p>
              </div>

              {fleetMode ? (
                promptCategories.map((cat) => (
                  <div key={cat.id} className="fleet-copilot__category">
                    <p className="fleet-copilot__category-label">{cat.label}</p>
                    {cat.prompts.slice(0, 3).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSuggestionClick(prompt)}
                        className="fleet-copilot__prompt"
                      >
                        <span className="inline-flex items-center gap-2">
                          <ChevronRight className="size-3 shrink-0 text-[var(--brand-operational)]" aria-hidden />
                          {prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                <>
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
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-xs font-medium text-[var(--muted)]">Try asking</p>
                  <ul className="space-y-2">
                    {CMMS_SUGGESTED_PROMPTS.map((prompt, i) => (
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
                </>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="fleet-copilot__input-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="fleet-copilot__input"
            disabled={loading}
            aria-label="Ask a question"
          />
          <Button type="submit" disabled={loading || !query.trim()} size="sm" className="shrink-0" aria-label="Send">
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
