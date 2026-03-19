"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Send, Loader2, AlertCircle, X, Lightbulb } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { submitCornerstoneAiQuery } from "@/app/(authenticated)/ai/actions";
import type { CornerstoneAiContext, CornerstoneAiResponse } from "@/src/lib/cornerstone-ai/types";

const SUGGESTED_PROMPTS = [
  "What work orders are overdue today?",
  "Summarize open work orders",
  "Which technicians are overloaded?",
  "How do I create a work order?",
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

  const handleFollowUpClick = useCallback(
    (s: string) => {
      runQuery(s);
    },
    [runQuery]
  );

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
