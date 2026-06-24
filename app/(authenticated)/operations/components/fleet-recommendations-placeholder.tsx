"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import type { FleetRecommendationsResponse } from "@/src/types/fleet";

function formatType(value: string): string {
  return value.replaceAll("_", " ");
}

export function FleetRecommendationsPlaceholder() {
  const [data, setData] = useState<FleetRecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadRecommendations = useCallback(async (refresh = false) => {
    const url = refresh
      ? "/api/fleet/recommendations?refresh=true"
      : "/api/fleet/recommendations";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      setError("Unable to load recommendations.");
      return;
    }
    const payload = (await res.json()) as FleetRecommendationsResponse;
    setData(payload);
    setError(null);
  }, []);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const pendingRecommendations = data?.pending ?? [];
  const history = data?.history ?? [];
  const summary = data?.summary;

  const topRecommendations = useMemo(
    () => pendingRecommendations.slice(0, 5),
    [pendingRecommendations]
  );

  const onAction = useCallback(
    (id: string, action: "accept" | "dismiss") => {
      startTransition(async () => {
        const res = await fetch(`/api/fleet/recommendations/${id}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          setError(action === "accept" ? "Unable to accept recommendation." : "Unable to dismiss recommendation.");
          return;
        }
        await loadRecommendations(true);
      });
    },
    [loadRecommendations]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-[var(--muted)]" aria-hidden />
          Fleet Recommendation Inbox
        </CardTitle>
        <CardDescription>
          Deterministic rules-based recommendations with auditable outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Volume</p>
            <p className="text-lg font-semibold">{summary?.volume ?? 0}</p>
          </div>
          <div className="rounded border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Acceptance rate</p>
            <p className="text-lg font-semibold">
              {summary?.acceptanceRate != null ? `${summary.acceptanceRate.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded border border-[var(--card-border)] bg-[var(--background)]/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Dismissal rate</p>
            <p className="text-lg font-semibold">
              {summary?.dismissalRate != null ? `${summary.dismissalRate.toFixed(1)}%` : "—"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Pending recommendations</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void loadRecommendations(true)}
              disabled={pending}
            >
              Refresh
            </Button>
          </div>
          {topRecommendations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No pending recommendations.</p>
          ) : (
            <ul className="space-y-2">
              {topRecommendations.map((recommendation) => (
                <li
                  key={recommendation.id}
                  className="rounded border border-[var(--card-border)] bg-[var(--background)]/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{recommendation.rationale.title}</p>
                    <span className="rounded bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      Score {recommendation.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                    {formatType(recommendation.recommendation_type)}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--foreground)]">
                    {recommendation.rationale.reasons.slice(0, 3).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAction(recommendation.id, "accept")}
                      disabled={pending}
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => onAction(recommendation.id, "dismiss")}
                      disabled={pending}
                    >
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Recommendation history</p>
          {history.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No recommendation history yet.</p>
          ) : (
            <ul className="space-y-1">
              {history.slice(0, 8).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded border border-[var(--card-border)] px-3 py-2 text-xs"
                >
                  <span className="truncate">
                    {entry.rationale.title} · {formatType(entry.status)}
                  </span>
                  <span className="font-semibold">{entry.score.toFixed(1)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
