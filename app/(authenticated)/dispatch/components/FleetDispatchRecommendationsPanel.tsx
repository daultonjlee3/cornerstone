"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/src/components/ui/button";
import type { FleetRecommendationsResponse } from "@/src/types/fleet";

type FleetDispatchRecommendationsPanelProps = {
  selectedDate: string;
  branchId?: string | null;
  onRecommendationApplied: () => Promise<void>;
};

function formatType(value: string): string {
  return value.replaceAll("_", " ");
}

export function FleetDispatchRecommendationsPanel({
  selectedDate,
  branchId,
  onRecommendationApplied,
}: FleetDispatchRecommendationsPanelProps) {
  const [data, setData] = useState<FleetRecommendationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadRecommendations = useCallback(
    async (refresh = false) => {
      const params = new URLSearchParams();
      params.set("date", selectedDate);
      if (branchId?.trim()) params.set("branch_id", branchId.trim());
      if (refresh) params.set("refresh", "true");
      const res = await fetch(`/api/fleet/recommendations?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Unable to load recommendations.");
        return;
      }
      const payload = (await res.json()) as FleetRecommendationsResponse;
      setData(payload);
      setError(null);
    },
    [branchId, selectedDate]
  );

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  const panelRecommendations = useMemo(
    () => (data?.pending ?? []).slice(0, 4),
    [data?.pending]
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
        await onRecommendationApplied();
        await loadRecommendations(true);
      });
    },
    [loadRecommendations, onRecommendationApplied]
  );

  return (
    <section className="space-y-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)]/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Dispatch recommendations
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 text-[10px]"
          onClick={() => void loadRecommendations(true)}
          disabled={pending}
        >
          Refresh
        </Button>
      </div>

      {error ? <p className="text-xs text-red-700">{error}</p> : null}

      {panelRecommendations.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No pending dispatch recommendations.</p>
      ) : (
        <ul className="space-y-2">
          {panelRecommendations.map((recommendation) => {
            const topCandidate = recommendation.rationale.candidates?.[0];
            return (
              <li
                key={recommendation.id}
                className="rounded border border-[var(--card-border)] bg-[var(--background)]/60 p-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{recommendation.rationale.title}</p>
                  <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    {recommendation.score.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  {formatType(recommendation.recommendation_type)}
                </p>
                {topCandidate ? (
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Recommended truck: {topCandidate.unit_number}
                  </p>
                ) : null}
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] text-[var(--foreground)]">
                  {recommendation.rationale.reasons.slice(0, 2).map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() => onAction(recommendation.id, "accept")}
                    disabled={pending}
                  >
                    Accept
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-[10px]"
                    onClick={() => onAction(recommendation.id, "dismiss")}
                    disabled={pending}
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
